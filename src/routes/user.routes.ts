import { Router } from 'express';
import { userController } from '@controllers/user.controller';
import {
    requirePermissions,
    requireAnyPermission,
    requireOwnerOrPermission,
} from '@middleware/authorization.middleware';
import { authenticate } from '@middleware/authentication.middleware';

// ─────────────────────────────────────────────
//  PERMISSION CONSTANTS
//  Centralise permission strings — avoids magic strings in routes.
// ─────────────────────────────────────────────

const P = {
    USERS_READ: 'users:read',
    USERS_WRITE: 'users:write',
    USERS_DELETE: 'users:delete',
} as const;

// ─────────────────────────────────────────────
//  USER ROUTER
//
//  Middleware chain per route (left → right):
//    authenticate → [authorization guard] → [validate] → controller
//
//  authenticate runs once at the router level.
//  Authorization guards are applied individually per route
//  so that different endpoints can demand different permissions.
// ─────────────────────────────────────────────

const router = Router();

// All routes below this line require a valid Keycloak token
// AND resolved permissions from the external AuthZ API.
router.use(authenticate);

// ── GET /users — requires users:read ──
router.get(
    '/',
    requirePermissions(P.USERS_READ),
    userController.getAll,
);

export default router;