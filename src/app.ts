import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { env } from '@config/env';
import { requestTracerMiddleware } from '@middleware/requestTracer.middleware';
import { rateLimiterMiddleware } from '@middleware/rateLimiter.middleware';
import { globalErrorHandler, notFoundHandler } from '@middleware/error.middleware';
import logger from '@utils/logger';
import router from '@routes/index';

export function createApp(): Application {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: env.isProduction ? process.env['ALLOWED_ORIGINS']?.split(',') : '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      credentials: true,
    }),
  );

  // Request tracing (attach X-Request-Id)
  app.use(requestTracerMiddleware);
  
  // Compression
  app.use(compression());

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // HTTP request logging (Morgan → Winston)
  app.use(
    morgan(env.isProduction ? 'combined' : 'dev', {
      stream: {
        write: (message: string) => logger.http(message.trim()),
      },
      skip: (_req, res) => env.isProduction && res.statusCode < 400,
    }),
  );

  // Rate limiting
  app.use(rateLimiterMiddleware);
  
  // Routes
  app.use(env.server.apiPrefix, router);
  
  // Error handling (must be last)
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
