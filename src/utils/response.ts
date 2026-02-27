import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as rTracer from 'cls-rtracer';
import { ApiResponse, PaginationMeta } from '../types';

export class ResponseBuilder {
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = StatusCodes.OK,
  ): Response {
    const body: ApiResponse<T> = {
      success: true,
      data,
      message,
      requestId: String(rTracer.id() ?? ''),
    };
    return res.status(statusCode).json(body);
  }

  static created<T>(res: Response, data: T, message = 'Resource created'): Response {
    return ResponseBuilder.success(res, data, message, StatusCodes.CREATED);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    meta: PaginationMeta,
    message = 'Success',
  ): Response {
    const body: ApiResponse<T[]> = {
      success: true,
      data,
      message,
      meta,
      requestId: String(rTracer.id() ?? ''),
    };
    return res.status(StatusCodes.OK).json(body);
  }

  static noContent(res: Response): Response {
    return res.status(StatusCodes.NO_CONTENT).send();
  }

  static error(
    res: Response,
    message: string,
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
    code = 'INTERNAL_ERROR',
    details?: unknown,
  ): Response {
    const body: ApiResponse = {
      success: false,
      error: { code, message, details },
      requestId: String(rTracer.id() ?? ''),
    };
    return res.status(statusCode).json(body);
  }
}
