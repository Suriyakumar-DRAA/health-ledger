import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ApiResponse, PaginatedResult, ValidationError } from '@customTypes/index';

// ─────────────────────────────────────────────
//  RESPONSE BUILDER
// ─────────────────────────────────────────────

export class ResponseBuilder {
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = StatusCodes.OK,
  ): Response {
    const body: ApiResponse<T> = {
      success:   true,
      message,
      data,
      timestamp: new Date().toISOString(),
      requestId: (res.req as { requestId?: string }).requestId,
    };
    return res.status(statusCode).json(body);
  }

  static created<T>(res: Response, data: T, message = 'Resource created'): Response {
    return ResponseBuilder.success(res, data, message, StatusCodes.CREATED);
  }

  static noContent(res: Response): Response {
    return res.status(StatusCodes.NO_CONTENT).send();
  }

  static paginated<T>(
    res: Response,
    result: PaginatedResult<T>,
    message = 'Success',
  ): Response {
    const body: ApiResponse<T[]> = {
      success:   true,
      message,
      data:      result.data,
      meta:      result.meta,
      timestamp: new Date().toISOString(),
      requestId: (res.req as { requestId?: string }).requestId,
    };
    return res.status(StatusCodes.OK).json(body);
  }

  static error(
    res: Response,
    message: string,
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
    errors?: ValidationError[],
  ): Response {
    const body: ApiResponse = {
      success:   false,
      message,
      errors,
      timestamp: new Date().toISOString(),
      requestId: (res.req as { requestId?: string }).requestId,
    };
    return res.status(statusCode).json(body);
  }

  static validationError(res: Response, errors: ValidationError[]): Response {
    return ResponseBuilder.error(
      res,
      'Validation failed',
      StatusCodes.UNPROCESSABLE_ENTITY,
      errors,
    );
  }

  static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return ResponseBuilder.error(res, message, StatusCodes.UNAUTHORIZED);
  }

  static forbidden(res: Response, message = 'Forbidden'): Response {
    return ResponseBuilder.error(res, message, StatusCodes.FORBIDDEN);
  }

  static notFound(res: Response, message = 'Resource not found'): Response {
    return ResponseBuilder.error(res, message, StatusCodes.NOT_FOUND);
  }
}