import { Response, NextFunction, RequestHandler } from 'express';
import { RowDataPacket } from 'mysql2';
import { mysqlDatabase } from '@config/mysql';
import { redisDatabase } from '@config/redis';
import { env } from '@config/env';
import { AppError } from '@utils/AppError';
import logger from '@utils/logger';
import { AuthenticatedRequest } from 'src/types';


interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  username: string;
  /** Stored as a JSON string: '["admin","editor"]'  OR  a native JSON column */
  roles: string | string[];
  is_active: number; // MySQL TINYINT → 0 | 1
}

/**
 * Result shape after parsing a UserRow out of the DB.
 */
interface DbUser {
  id: number;
  email: string;
  username: string;
  roles: string[];
  isActive: boolean;
}

// Constants
const CACHE_KEY_PREFIX = 'user_roles:' as const;

// Helpers
/**
 * Parse the `roles` column which may arrive as a JSON string or a native array.
 * Always returns a clean `string[]` — never throws.
 */
function parseRoles(raw: string | string[]): string[] {
  if (Array.isArray(raw)) return raw;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((r) => typeof r === 'string')) {
      return parsed as string[];
    }
    logger.warn('[Authorize] Unexpected roles format after JSON.parse', { raw });
    return [];
  } catch {
    // Comma-separated fallback: "admin,editor"
    return raw
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
  }
}

/**
 * Map a raw MySQL `UserRow` to the clean `DbUser` shape.
 */
function mapRowToDbUser(row: UserRow): DbUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    roles: parseRoles(row.roles),
    isActive: row.is_active === 1,
  };
}

// Cache helpers
/**
 * Attempt to read cached roles from Redis.
 * Returns `null` on any cache miss or Redis error — never throws.
 */
async function getCachedRoles(cacheKey: string): Promise<string[] | null> {
  try {
    const cached = await redisDatabase.get(cacheKey);
    if (!cached) return null;

    const parsed: unknown = JSON.parse(cached);
    if (Array.isArray(parsed) && parsed.every((r) => typeof r === 'string')) {
      logger.debug('[Authorize] Cache hit', { cacheKey });
      return parsed as string[];
    }

    logger.warn('[Authorize] Cached roles have unexpected shape — evicting', { cacheKey });
    await redisDatabase.del(cacheKey);
    return null;
  } catch (err) {
    // Redis errors are non-fatal: log and continue with DB fallback
    logger.error('[Authorize] Redis GET error — falling back to DB', {
      cacheKey,
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Persist roles to Redis. Non-fatal — errors are only logged.
 */
async function setCachedRoles(cacheKey: string, roles: string[]): Promise<void> {
  try {
    await redisDatabase.set(cacheKey, JSON.stringify(roles), env.cache.rolesTtlSeconds);
    logger.debug('[Authorize] Roles cached', { cacheKey, ttl: env.cache.rolesTtlSeconds });
  } catch (err) {
    logger.error('[Authorize] Redis SET error — roles NOT cached', {
      cacheKey,
      error: (err as Error).message,
    });
  }
}

// DB lookup
/**
 * Fetch the user from MySQL by their preferred_username / email.
 * Throws `AppError.forbidden` when the user record does not exist.
 * Throws `AppError` (500) when the query itself fails.
 */
async function fetchUserFromDb(email: string): Promise<DbUser> {
  const sql = `
    SELECT id, email, roles, is_active
    FROM users
    WHERE email = ?
    LIMIT 1
  `;

  let rows: UserRow[];

  try {
    rows = await mysqlDatabase.query<UserRow[]>(sql, [email]);
  } catch (err) {
    logger.error('[Authorize] MySQL query failed', {
      email,
      error: (err as Error).message,
    });
    throw new AppError(
      'Authorization check failed due to a database error',
      503,
      'DB_UNAVAILABLE',
    );
  }

  if (!rows.length) {
    logger.warn('[Authorize] User not found in MySQL', { email });
    throw AppError.forbidden('Access denied: user profile not found');
  }

  const dbUser = mapRowToDbUser(rows[0] as UserRow);

  if (!dbUser.isActive) {
    logger.warn('[Authorize] Inactive user attempted access', { email });
    throw AppError.forbidden('Access denied: account is inactive');
  }

  return dbUser;
}

export interface AuthorizedRequest extends AuthenticatedRequest {
  /** Populated by `authorize` middleware after a successful role check. */
  dbUser?: DbUser;
}

export function authorize(...requiredRoles: [string, ...string[]]): RequestHandler {
  if (requiredRoles.length === 0) {
    throw new TypeError('[Authorize] authorize() requires at least one role argument');
  }

  return async (
    req: AuthorizedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // ── 1. Guard: JWT must have been verified upstream ──────────────────────
      if (!req.user) {
        throw AppError.unauthorized('No authenticated user on request');
      }

      const email = req.user.preferred_username ?? req.user.email;

      if (!email) {
        throw AppError.unauthorized(
          'Token is missing both preferred_username and email claims',
        );
      }

      // ── 2. Attempt cache ────────────────────────────────────────────────────
      const cacheKey = `${CACHE_KEY_PREFIX}${email}`;
      let userRoles = await getCachedRoles(cacheKey);
      let dbUser: DbUser | undefined;

      // ── 3. Cache miss → fetch from MySQL ────────────────────────────────────
      if (userRoles === null) {
        logger.debug('User not found in cache', { email });
        dbUser = await fetchUserFromDb(email); // throws AppError on failure
        userRoles = dbUser.roles;
        await setCachedRoles(cacheKey, userRoles);
      }

      // ── 4. Role check ───────────────────────────────────────────────────────
      const missingRoles = requiredRoles.filter((role) => !userRoles!.includes(role));

      if (missingRoles.length > 0) {
        logger.warn('[Authorize] Access denied — insufficient access', {
          email,
          required: requiredRoles,
          missing: missingRoles,
          actual: userRoles,
        });

        throw AppError.forbidden(
          `Access denied: requires role${missingRoles.length > 1 ? 's' : ''} [${missingRoles.join(', ')}]`,
        );
      }

      // ── 5. Attach dbUser if we fetched it (cache hit = dbUser is undefined) ─
      if (dbUser !== undefined) {
        req.dbUser = dbUser;
      }

      logger.debug('[Authorize] Access granted', {
        email,
        requiredRoles,
        userRoles,
      });

      next();
    } catch (err) {
      // Forward AppErrors (operational) and unexpected errors to globalErrorHandler
      if (err instanceof AppError) {
        next(err);
        return;
      }

      logger.error('[Authorize] Unexpected error in authorization middleware', {
        error: (err as Error).message,
        stack: (err as Error).stack,
      });

      next(
        new AppError(
          'An unexpected error occurred during authorization',
          500,
          'AUTHORIZATION_ERROR',
          undefined,
          false, // not operational → will log full stack in globalErrorHandler
        ),
      );
    }
  };
}