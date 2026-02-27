import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Error as MongooseError } from 'mongoose';
import { ResponseBuilder } from '@utils/response';
import { logger } from '@utils/logger';
import { AuthenticatedRequest } from '@customTypes/index';
import { config } from '@config/index';

// ─────────────────────────────────────────────
//  APPLICATION ERROR CLASS
// ─────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    public isOperational: boolean = true,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────
//  404 HANDLER
// ─────────────────────────────────────────────

export const notFoundHandler = (
  req: AuthenticatedRequest,
  res: Response,
): void => {
  ResponseBuilder.notFound(res, `Route ${req.method} ${req.path} not found`);
};

// ─────────────────────────────────────────────
//  GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const globalErrorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const { requestId } = req as AuthenticatedRequest;

  // ── Mongoose Validation Error ──
  if (error instanceof MongooseError.ValidationError) {
    const errors = Object.values(error.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    ResponseBuilder.validationError(res, errors);
    return;
  }

  // ── Mongoose Duplicate Key Error ──
  if ((error as { code?: number }).code === 11000) {
    const field = Object.keys((error as { keyValue?: Record<string, unknown> }).keyValue ?? {})[0];
    ResponseBuilder.error(res, `Duplicate value for field: ${field}`, StatusCodes.CONFLICT);
    return;
  }

  // ── Operational App Error ──
  if (error instanceof AppError && error.isOperational) {
    logger.warn('Operational error', { requestId, error: error.message, statusCode: error.statusCode });
    ResponseBuilder.error(res, error.message, error.statusCode);
    return;
  }

  // ── Unknown / Programmer Error ──
  logger.error('Unhandled error', {
    requestId,
    error: (error as Error).message,
    stack: config.app.isDev ? (error as Error).stack : undefined,
  });

  ResponseBuilder.error(
    res,
    config.app.isDev ? (error as Error).message : 'Internal server error',
    StatusCodes.INTERNAL_SERVER_ERROR,
  );
};