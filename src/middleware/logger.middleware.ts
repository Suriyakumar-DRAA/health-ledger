import morgan, { StreamOptions } from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '@utils/logger';
import { config } from '@config/index';
import { AuthenticatedRequest } from '@customTypes/index';

// ─────────────────────────────────────────────
//  REQUEST ID MIDDLEWARE
//  Attaches a unique ID to every incoming request
// ─────────────────────────────────────────────

export const requestId: RequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const id = (req.headers['x-request-id'] as string) ?? uuidv4();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
};

// ─────────────────────────────────────────────
//  HTTP REQUEST LOGGER
// ─────────────────────────────────────────────

const stream: StreamOptions = {
  write: (message) => logger.http(message.trim()),
};

const skip = (): boolean => config.app.isProd;

export const httpLogger = morgan(
  config.app.isDev ? 'dev' : 'combined',
  { stream, skip },
);