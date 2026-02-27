import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError';
import { ResponseBuilder } from '../utils/response';
import logger from '../utils/logger';

// Catch-all 404 handler (must be after all routes)
export function notFoundHandler(req: Request, res: Response): void {
  ResponseBuilder.error(
    res,
    `Route ${req.method} ${req.originalUrl} not found`,
    StatusCodes.NOT_FOUND,
    'ROUTE_NOT_FOUND',
  );
}

// Central error handler (must have 4 params for Express to treat as error handler)
export function globalErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError && err.isOperational) {
    // Known, operational error — safe to expose to client
    logger.warn('[Error] Operational error', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
    });

    ResponseBuilder.error(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  // Unknown / programming error — do not leak internals
  logger.error('[Error] Unexpected error', {
    message: err.message,
    stack: err.stack,
  });

  ResponseBuilder.error(
    res,
    'An unexpected error occurred. Please try again later.',
    StatusCodes.INTERNAL_SERVER_ERROR,
    'INTERNAL_SERVER_ERROR',
  );
}
