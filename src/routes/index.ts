import { Router } from 'express';
import healthRoutes from '@routes/health.routes';
import userRoutes from '@routes/user.routes';
import appointmentTypesRoutes from '@routes/appointment-types.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/users', userRoutes);
router.use('/appointment-types', appointmentTypesRoutes);

export default router;
