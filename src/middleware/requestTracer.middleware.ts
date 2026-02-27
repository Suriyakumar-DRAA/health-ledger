import * as rTracer from 'cls-rtracer';
import { RequestHandler } from 'express';

/**
 * Attaches a unique request ID to every incoming request.
 * The ID propagates through all async contexts (via CLS).
 * It is also attached to the response header X-Request-Id.
 */
export const requestTracerMiddleware: RequestHandler = rTracer.expressMiddleware({
  useHeader: true,
  headerName: 'X-Request-Id',
  echoHeader: true
});
