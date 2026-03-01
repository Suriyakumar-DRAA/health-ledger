import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { env } from '@config/env';
import { AppError } from '@utils/AppError';
import { AuthenticatedRequest, JwtPayload } from 'src/types';
import logger from '@utils/logger';

const client = jwksClient({
  jwksUri: env.auth.jwksUri,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 10 * 60 * 1000, // 10 minutes
  rateLimit: true,
});

async function getSigningKey(kid: string): Promise<string> {
  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      throw AppError.unauthorized('Missing Authorization header');
    }

    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.unauthorized('Authorization header is not valid');
    }

    const token = authHeader.slice(7);

    // Decode header to get kid without verification (needed to fetch signing key)
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || typeof decoded === 'string') {
      throw AppError.unauthorized('Invalid token format');
    }

    const kid = decoded.header.kid;
    if (!kid) {
      throw AppError.unauthorized('Token missing key ID (kid)');
    }

    const signingKey = await getSigningKey(kid);

    const payload = jwt.verify(token, signingKey, {
      algorithms: env.auth.algorithms as jwt.Algorithm[],
      issuer: env.auth.issuer,
    }) as JwtPayload;

    req.user = payload;

    logger.info('[Auth] User authenticated successfully');
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized('Token has expired'));
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('[Auth] JWT verification failed', { error: (error as Error).message });
      next(AppError.unauthorized('Token verification failed'));
      return;
    }

    next(error);
  }
}

// Role-based access control guard factory
export function requireRoles(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const userRoles = req.user?.realm_access?.roles ?? [];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      next(AppError.forbidden(`Access requires one of: ${roles.join(', ')}`));
      return;
    }

    next();
  };
}
