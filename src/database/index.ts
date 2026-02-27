import { mongoDatabase } from './mongo';
import { mysqlDatabase } from './mysql';
import { redisDatabase } from './redis';
import logger from '../utils/logger';

export async function initializeDatabases(): Promise<void> {
  logger.info('[Database] Initializing all database connections...');

  const results = await Promise.allSettled([
    mongoDatabase.connect(),
    mysqlDatabase.connect(),
    redisDatabase.connect(),
  ]);

  const labels = ['MongoDB', 'MySQL', 'Redis'];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.error(`[Database] Failed to connect to ${labels[index]}`, {
        error: (result.reason as Error).message,
      });
    }
  });

  // Hard fail if MongoDB is down (primary DB)
  if (results[0]?.status === 'rejected') {
    throw new Error('[Database] Critical: MongoDB connection failed. Aborting startup.');
  }

  logger.info('[Database] All database connections initialized');
}

export async function closeDatabases(): Promise<void> {
  logger.info('[Database] Closing all database connections...');
  await Promise.allSettled([
    mongoDatabase.disconnect(),
    mysqlDatabase.disconnect(),
    redisDatabase.disconnect(),
  ]);
  logger.info('[Database] All connections closed');
}

export { mongoDatabase, mysqlDatabase, redisDatabase };
