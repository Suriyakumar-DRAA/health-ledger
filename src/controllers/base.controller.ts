import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@customTypes/index';

// ─────────────────────────────────────────────
//  BASE CONTROLLER
//  Wraps async handlers and delegates to service
// ─────────────────────────────────────────────

export abstract class BaseController {
  /**
   * Wraps async route handlers — eliminates try/catch boilerplate.
   * Errors bubble to the global error handler automatically.
   */
  protected handle(
    fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>,
  ) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      fn(req, res, next).catch(next);
    };
  }
}