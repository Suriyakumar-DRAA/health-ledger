import { RequestHandler, NextFunction, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { keycloakService } from '@config/keycloak';
import { permissionsClient } from '@config/permission';
import { ResponseBuilder } from '@utils/response';
import { logger } from '@utils/logger';
import { AuthenticatedRequest } from '@customTypes/index';

// ─────────────────────────────────────────────
//  AUTHENTICATION MIDDLEWARE
//
//  Responsibility split:
//    ① Keycloak  →  Verify JWT identity (who you are)
//    ② AuthZ API →  Resolve permissions  (what you can do)
//
//  Both steps are required before any protected route runs.
//  Permissions are fetched ONCE and cached in Redis for
//  `AUTHZ_PERMISSIONS_TTL_SEC` seconds, keeping latency low.
// ─────────────────────────────────────────────

export const authenticate: RequestHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // ── Step 1: Extract Bearer token ──
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    ResponseBuilder.unauthorized(res, 'Authorization header missing or malformed');
    return;
  }

  const token = authHeader.substring(7);

  try {
    // ── Step 2: Verify JWT with Keycloak (identity) ──
    const user = await keycloakService.verifyToken(token);
    req.user   = user;

    // ── Step 3: Resolve permissions from external AuthZ API ──
    //    Cache-first: Redis hit ≈ <5ms, API call ≈ <50ms
    const permissions  = await permissionsClient.resolve(user.sub);
    req.permissions    = permissions;

    next();
  } catch (error: unknown) {
    const err = error as Error;

    logger.warn('Authentication failed', {
      requestId: req.requestId,
      error:     err.message,
    });

    if (err.name === 'TokenExpiredError') {
      ResponseBuilder.unauthorized(res, 'Token has expired');
      return;
    }

    if (err.name === 'JsonWebTokenError') {
      ResponseBuilder.unauthorized(res, 'Invalid token');
      return;
    }

    if (err.message.includes('Authorization service')) {
      // AuthZ API is down — fail closed (deny by default)
      ResponseBuilder.error(
        res,
        'Authorization service is temporarily unavailable',
        StatusCodes.SERVICE_UNAVAILABLE,
      );
      return;
    }

    ResponseBuilder.error(res, 'Authentication failed', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};