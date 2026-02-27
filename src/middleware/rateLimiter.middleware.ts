import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { ResponseBuilder } from '../utils/response';

export const rateLimiterMiddleware = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    ResponseBuilder.error(
      res,
      'Too many requests. Please slow down.',
      429,
      'RATE_LIMIT_EXCEEDED',
    );
  },
});
