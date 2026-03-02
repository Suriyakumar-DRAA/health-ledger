import { Router } from 'express';
import healthRoutes from '@routes/health.routes';
import appointmentTypesRoutes from '@routes/appointment-types.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/appointment-types', appointmentTypesRoutes);

export default router;
