import { Router } from 'express';
import healthRoutes from '@routes/health.routes';
import userRoutes from '@routes/user.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/users', userRoutes);

export default router;
