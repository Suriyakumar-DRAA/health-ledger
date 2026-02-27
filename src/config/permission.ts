import { redisClient } from '@config/redis';
import { config } from '@config/index';
import { logger } from '@utils/logger';
import { UserPermissions, Permission } from '@customTypes/index';

// ─────────────────────────────────────────────
//  CACHE KEY FACTORY
// ─────────────────────────────────────────────

const PERMISSIONS_KEY = (userId: string): string => `authz:permissions:${userId}`;

// ─────────────────────────────────────────────
//  EXTERNAL AUTHORISATION API RESPONSE SHAPE
//  Adjust the interface to match your auth API contract.
// ─────────────────────────────────────────────

interface AuthzApiResponse {
  userId:      string;
  roles:       string[];
  permissions: string[];
}

// ─────────────────────────────────────────────
//  PERMISSIONS CLIENT
// ─────────────────────────────────────────────

class PermissionsClient {
  private readonly baseUrl:   string;
  private readonly apiKey:    string;
  private readonly timeoutMs: number;
  private readonly cacheTtl:  number;

  constructor() {
    this.baseUrl   = config.authorizationApi.baseUrl;
    this.apiKey    = config.authorizationApi.apiKey;
    this.timeoutMs = config.authorizationApi.timeoutMs;
    this.cacheTtl  = config.authorizationApi.permissionsTtl;
  }

  // ─────────────────────────────────────────────
  //  RESOLVE — cache-first, then external API
  //  Target: <5ms on cache hit, <50ms on miss
  // ─────────────────────────────────────────────

  async resolve(userId: string): Promise<UserPermissions> {
    // ① Try Redis first — the hot path
    const cached = await this.getFromCache(userId);
    if (cached) return cached;

    // ② Cache miss — fetch from external auth API
    const fresh = await this.fetchFromApi(userId);

    // ③ Persist to Redis asynchronously (don't block response)
    this.setInCache(userId, fresh).catch((err) =>
      logger.error('Failed to cache permissions', { userId, err }),
    );

    return fresh;
  }

  // ─────────────────────────────────────────────
  //  CACHE OPS
  // ─────────────────────────────────────────────

  private async getFromCache(userId: string): Promise<UserPermissions | null> {
    try {
      const raw = await redisClient.get(PERMISSIONS_KEY(userId));
      if (!raw) return null;

      const parsed = JSON.parse(raw) as UserPermissions;
      logger.debug('Permissions cache HIT', { userId });
      return parsed;
    } catch {
      // Treat cache failure as a miss — never block the request
      logger.warn('Permissions cache read failed, falling back to API', { userId });
      return null;
    }
  }

  private async setInCache(userId: string, permissions: UserPermissions): Promise<void> {
    await redisClient.setex(
      PERMISSIONS_KEY(userId),
      this.cacheTtl,
      JSON.stringify(permissions),
    );
    logger.debug('Permissions cached', { userId, ttl: this.cacheTtl });
  }

  // ─────────────────────────────────────────────
  //  EXTERNAL API FETCH
  // ─────────────────────────────────────────────

  private async fetchFromApi(userId: string): Promise<UserPermissions> {
    const url = `${this.baseUrl}/users/${encodeURIComponent(userId)}/permissions`;

    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method:  'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key':    this.apiKey,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AuthZ API responded with status ${response.status}`);
      }

      const body = await response.json() as AuthzApiResponse;

      logger.debug('Permissions fetched from AuthZ API', {
        userId,
        roles:       body.roles,
        permissions: body.permissions.length,
      });

      return {
        userId,
        roles:       body.roles       ?? [],
        permissions: body.permissions ?? [],
        fetchedAt:   Date.now(),
      };
    } catch (error: unknown) {
      const err = error as Error;

      if (err.name === 'AbortError') {
        logger.error('AuthZ API request timed out', { userId, timeoutMs: this.timeoutMs });
        throw new Error('Authorization service timed out');
      }

      logger.error('AuthZ API request failed', { userId, error: err.message });
      throw new Error('Authorization service unavailable');
    } finally {
      clearTimeout(timer);
    }
  }

  // ─────────────────────────────────────────────
  //  PERMISSION CHECK HELPERS
  // ─────────────────────────────────────────────

  /**
   * Check an exact permission or a wildcard.
   * "admin:*" grants every action under "admin:".
   */
  can(userPerms: UserPermissions, permission: Permission): boolean {
    const [resource, action] = permission.split(':');

    return userPerms.permissions.some((p) => {
      if (p === permission)         return true;      // exact match
      if (p === `${resource}:*`)    return true;      // resource wildcard
      if (p === '*')                return true;      // super-admin wildcard
      return false;
    });
  }

  canAll(userPerms: UserPermissions, permissions: Permission[]): boolean {
    return permissions.every((p) => this.can(userPerms, p));
  }

  canAny(userPerms: UserPermissions, permissions: Permission[]): boolean {
    return permissions.some((p) => this.can(userPerms, p));
  }

  hasRole(userPerms: UserPermissions, role: string): boolean {
    return userPerms.roles.includes(role);
  }

  // ─────────────────────────────────────────────
  //  CACHE INVALIDATION
  //  Call this after the external API updates a user's permissions.
  // ─────────────────────────────────────────────

  async invalidate(userId: string): Promise<void> {
    await redisClient.del(PERMISSIONS_KEY(userId));
    logger.info('Permissions cache invalidated', { userId });
  }
}

export const permissionsClient = new PermissionsClient();