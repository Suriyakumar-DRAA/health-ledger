import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/authentication.middleware';
import { authorize } from '@middleware/authorize.middleware';

const router = Router();

// GET /users/me  — Requires authentication only (any authenticated user can access)
router.get('/me', authMiddleware, authorize('admin'), userController.getMe.bind(userController));

// GET /users  — Requires authentication + admin role
router.get('/', authMiddleware, userController.getAll.bind(userController));

// GET /users/:id  — Requires authentication + admin or manager role
router.get('/:id', authMiddleware, userController.getById.bind(userController));

// POST /users  — Requires authentication + admin role
router.post('/', authMiddleware, userController.create.bind(userController));

// PATCH /users/:id  — Requires authentication + admin role
router.patch('/:id', authMiddleware, userController.update.bind(userController));

// DELETE /users/:id  — Requires authentication + admin role
router.delete('/:id', authMiddleware, userController.remove.bind(userController));

export default router;
