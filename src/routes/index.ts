import { Router, Request, Response } from 'express';
import userRoutes from './user.routes';
import { config } from '@config/index';

// ─────────────────────────────────────────────
//  ROUTE INDEX
// ─────────────────────────────────────────────

const router = Router();

// ── Health check (no auth required) ──
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status:    'ok',
    app:       config.app.name,
    env:       config.app.env,
    timestamp: new Date().toISOString(),
  });
});

// ── Feature routers ──
router.use('/users', userRoutes);

export default router;