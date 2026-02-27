import { Request, Response } from 'express';
import { mongoDatabase, mysqlDatabase, redisDatabase } from '../database';
import { ResponseBuilder } from '../utils/response';
import { env } from '../config/env';
import logger from './../utils/logger';

export class HealthController {
  check(_req: Request, res: Response): void {
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
      version: process.env['npm_package_version'] ?? '1.0.0',
      uptime: `${Math.floor(process.uptime())}s`,
      databases: {
        mongodb: mongoDatabase.getStatus() ? 'connected' : 'disconnected',
        mysql: mysqlDatabase.getStatus() ? 'connected' : 'disconnected',
        redis: redisDatabase.getStatus() ? 'connected' : 'disconnected',
      },
      memory: {
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
    };

    const isHealthy = Object.values(status.databases).every((s) => s === 'connected');

    logger.info('[Health Check] Status Completed');

    ResponseBuilder.success(res, status, isHealthy ? 'Service healthy' : 'Service degraded',
      isHealthy ? 200 : 503);
  }

  ping(_req: Request, res: Response): void {
    res.status(200).json({ pong: true, timestamp: Date.now() });
  }
}

export const healthController = new HealthController();
