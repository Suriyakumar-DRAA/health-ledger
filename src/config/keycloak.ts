import jwt from 'jsonwebtoken';
import { config } from '@config/index';
import { logger } from '@utils/logger';
import { KeycloakTokenPayload } from '@customTypes/index';

// ─────────────────────────────────────────────
//  KEYCLOAK TOKEN SERVICE
// ─────────────────────────────────────────────

class KeycloakService {
  private readonly wellKnownUrl: string;
  private publicKey: string | null = null;

  constructor() {
    this.wellKnownUrl = [
      config.keycloak.authServerUrl,
      'realms',
      config.keycloak.realm,
      '.well-known/openid-configuration',
    ].join('/');
  }

  // ─────────────────────────────────────────────
  //  FETCH PUBLIC KEY FROM KEYCLOAK
  // ─────────────────────────────────────────────

  async fetchPublicKey(): Promise<string> {
    if (this.publicKey) return this.publicKey;

    try {
      const realmUrl = `${config.keycloak.authServerUrl}/realms/${config.keycloak.realm}`;
      const response = await fetch(realmUrl);

      if (!response.ok) throw new Error(`Keycloak realm fetch failed: ${response.status}`);

      const realmInfo = await response.json() as { public_key: string };
      this.publicKey = `-----BEGIN PUBLIC KEY-----\n${realmInfo.public_key}\n-----END PUBLIC KEY-----`;

      logger.info('Keycloak public key fetched successfully');
      return this.publicKey;
    } catch (error) {
      logger.error('Failed to fetch Keycloak public key', { error });
      throw error;
    }
  }

  // ─────────────────────────────────────────────
  //  VALIDATE TOKEN
  // ─────────────────────────────────────────────

  async verifyToken(token: string): Promise<KeycloakTokenPayload> {
    const publicKey = await this.fetchPublicKey();

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        publicKey,
        { algorithms: ['RS256'], issuer: `${config.keycloak.authServerUrl}/realms/${config.keycloak.realm}` },
        (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded as KeycloakTokenPayload);
        },
      );
    });
  }

  // ─────────────────────────────────────────────
  //  ROLE CHECKS
  // ─────────────────────────────────────────────

  hasRealmRole(user: KeycloakTokenPayload, role: string): boolean {
    return user.realm_access?.roles?.includes(role) ?? false;
  }

  hasClientRole(user: KeycloakTokenPayload, role: string): boolean {
    const clientRoles = user.resource_access?.[config.keycloak.clientId]?.roles ?? [];
    return clientRoles.includes(role);
  }

  hasAnyRole(user: KeycloakTokenPayload, roles: string[]): boolean {
    return roles.some(
      (role) => this.hasRealmRole(user, role) || this.hasClientRole(user, role),
    );
  }

  hasAllRoles(user: KeycloakTokenPayload, roles: string[]): boolean {
    return roles.every(
      (role) => this.hasRealmRole(user, role) || this.hasClientRole(user, role),
    );
  }
}

export const keycloakService = new KeycloakService();