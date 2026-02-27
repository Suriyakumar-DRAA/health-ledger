import { RequestHandler, NextFunction, Response } from 'express';
import { permissionsClient } from '@config/permission';
import { ResponseBuilder } from '@utils/response';
import { logger } from '@utils/logger';
import { AuthenticatedRequest, Permission } from '@customTypes/index';

// ─────────────────────────────────────────────
//  AUTHORIZATION MIDDLEWARE
//
//  All checks operate against `req.permissions` which was
//  resolved from the external AuthZ API during `authenticate`.
//
//  Available guards:
//    requirePermissions(...perms)  — user must have ALL of them
//    requireAnyPermission(...perms)— user must have at least one
//    requireRoles(...roles)        — role-level check (coarse)
//    requireOwnerOrPermission(...) — own resource OR explicit perm
// ─────────────────────────────────────────────

const denyAccess = (
  res: Response,
  req: AuthenticatedRequest,
  required: string[],
  reason: string,
): void => {
  logger.warn('Authorization denied', {
    requestId: req.requestId,
    userId: req.user?.sub,
    required,
    userPerms: req.permissions?.permissions,
    userRoles: req.permissions?.roles,
    reason,
  });
  ResponseBuilder.forbidden(res, `Access denied. ${reason}`);
};

// ─────────────────────────────────────────────
//  GUARD: ALL permissions required (AND)
// ─────────────────────────────────────────────

export const requirePermissions = (...perms: Permission[]): RequestHandler =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.permissions) {
      ResponseBuilder.unauthorized(res, 'Permissions not resolved — authenticate first');
      return;
    }

    if (!permissionsClient.canAll(req.permissions, perms)) {
      denyAccess(res, req, perms, `Required permissions: ${perms.join(', ')}`);
      return;
    }

    next();
  };

// ─────────────────────────────────────────────
//  GUARD: ANY permission sufficient (OR)
// ─────────────────────────────────────────────

export const requireAnyPermission = (...perms: Permission[]): RequestHandler =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.permissions) {
      ResponseBuilder.unauthorized(res, 'Permissions not resolved — authenticate first');
      return;
    }

    if (!permissionsClient.canAny(req.permissions, perms)) {
      denyAccess(res, req, perms, `Requires one of: ${perms.join(', ')}`);
      return;
    }

    next();
  };

// ─────────────────────────────────────────────
//  GUARD: Role-level (coarse grained)
// ─────────────────────────────────────────────

export const requireRoles = (...roles: string[]): RequestHandler =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.permissions) {
      ResponseBuilder.unauthorized(res, 'Permissions not resolved — authenticate first');
      return;
    }

    const hasRole = roles.every((r) => permissionsClient.hasRole(req.permissions!, r));

    if (!hasRole) {
      denyAccess(res, req, roles, `Required roles: ${roles.join(', ')}`);
      return;
    }

    next();
  };

// ─────────────────────────────────────────────
//  GUARD: Owner of the resource OR explicit permission
// ─────────────────────────────────────────────

export const requireOwnerOrPermission = (
  /** Extract the resource owner's userId from the request */
  getOwnerId: (req: AuthenticatedRequest) => string,
  /** Permission that overrides the ownership check (e.g. "users:write") */
  overridePermission: Permission,
): RequestHandler =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.permissions) {
      ResponseBuilder.unauthorized(res, 'Not authenticated');
      return;
    }

    const isOwner = getOwnerId(req) === req.user.sub;
    const hasOverride = permissionsClient.can(req.permissions, overridePermission);

    if (!isOwner && !hasOverride) {
      denyAccess(
        res, req,
        [overridePermission],
        'You do not own this resource and lack the override permission',
      );
      return;
    }

    next();
  };