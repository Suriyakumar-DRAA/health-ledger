import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

router.get('/', healthController.check.bind(healthController));
router.get('/ping', healthController.ping.bind(healthController));

export default router;
