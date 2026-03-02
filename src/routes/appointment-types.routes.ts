import { Router } from 'express';
import { appointmentTypesController } from '@controllers/appointment-types.controller';
import { authMiddleware } from '@middleware/authentication.middleware';
import { authorize } from '@middleware/authorize.middleware';

const router = Router();

// GET /appointment-types  — Requires authentication + admin role
router.get('/', authMiddleware, authorize('admin', 'receptionist', 'counsellor'), appointmentTypesController.getAll.bind(appointmentTypesController));

// GET /appointment-types/:id  — Requires authentication + admin or manager role
router.get('/:id', authMiddleware, appointmentTypesController.getById.bind(appointmentTypesController));

// POST /appointment-types  — Requires authentication + admin role
router.post('/', authMiddleware, authorize('admin'), appointmentTypesController.create.bind(appointmentTypesController));

// PATCH /appointment-types/:id  — Requires authentication + admin role
router.patch('/:id', authMiddleware, authorize('admin'), appointmentTypesController.update.bind(appointmentTypesController));

export default router;
