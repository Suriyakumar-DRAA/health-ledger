import { createApp } from './app';
import { env } from './config/env';
import { mongoDatabase, mysqlDatabase, redisDatabase } from './database';
import logger from './utils/logger';

async function bootstrap(): Promise<void> {
  try {
    logger.info(`[Server] Starting in ${env.nodeEnv} mode...`);

    // MongoDB 
    try {
      await mongoDatabase.connect();
      logger.info('[Server] ✅ MongoDB connected successfully');
    } catch (error) {
      logger.error('[Server] ❌ MongoDB connection failed', { error: (error as Error).message });
      throw error;
    }

    // MySQL
    try {
      await mysqlDatabase.connect();
      logger.info('[Server] ✅ MySQL connected successfully');
    } catch (error) {
      logger.error('[Server] ❌ MySQL connection failed', { error: (error as Error).message });
      throw error;
    }

    // Redis
    try {
      await redisDatabase.connect();
      logger.info('[Server] ✅ Redis connected successfully');
    } catch (error) {
      logger.error('[Server] ❌ Redis connection failed', { error: (error as Error).message });
      throw error;
    }

    // ──────────────────────────────────────────
    // Create Express app
    // ──────────────────────────────────────────
    const app = createApp();

    // ──────────────────────────────────────────
    // Start HTTP server
    // ──────────────────────────────────────────
    app.listen(env.server.port, () => {
      logger.info(`[Server] ✅ Listening on port ${env.server.port}`);
      logger.info(`[Server] API base: ${env.server.apiPrefix}`);
      logger.info(`[Server] Health: http://localhost:${env.server.port}${env.server.apiPrefix}/health`);
    });
  } catch (error) {
    logger.error('[Server] ❌ Failed to start server', { error: (error as Error).message, stack: (error as Error).stack });
    process.exit(1);
  }
}

bootstrap();
