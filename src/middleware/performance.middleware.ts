import { RequestHandler, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@customTypes/index';
import { logger } from '@utils/logger';

// ─────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────

/** Requests slower than this threshold are logged as warnings */
const SLOW_REQUEST_THRESHOLD_MS = 100;

// ─────────────────────────────────────────────
//  PERFORMANCE MIDDLEWARE
//
//  Goals:
//    ① Measure wall-clock latency using process.hrtime (nanosecond precision)
//    ② Attach X-Response-Time header so clients / load balancers can observe it
//    ③ Log slow requests (> 100 ms) with enough context to diagnose them
// ─────────────────────────────────────────────

export const performanceMiddleware: RequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  // Capture start time before any async work
  req.startAt = process.hrtime();

  res.on('finish', () => {
    if (!req.startAt) return;

    const [sec, ns] = process.hrtime(req.startAt);
    const ms        = (sec * 1_000 + ns / 1_000_000).toFixed(2);

    // Expose latency to the client and any upstream proxies
    res.setHeader('X-Response-Time', `${ms}ms`);

    const latencyMs = parseFloat(ms);
    const meta = {
      requestId:  req.requestId,
      method:     req.method,
      path:       req.path,
      statusCode: res.statusCode,
      latencyMs,
    };

    if (latencyMs > SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn(`Slow request detected [${ms}ms]`, meta);
    } else {
      logger.debug(`Request completed [${ms}ms]`, meta);
    }
  });

  next();
};