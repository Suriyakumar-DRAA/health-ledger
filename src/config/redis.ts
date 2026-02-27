import Redis from 'ioredis';
import { config } from '@config/index';
import { logger } from '@utils/logger';

// ─────────────────────────────────────────────
//  REDIS CLIENT
// ─────────────────────────────────────────────

const createRedisClient = (): Redis => {
  const client = new Redis({
    host:              config.redis.host,
    port:              config.redis.port,
    password:          config.redis.password || undefined,
    db:                config.redis.db,
    keyPrefix:         config.redis.keyPrefix,
    retryStrategy:     (times) => Math.min(times * 100, 3000),
    enableReadyCheck:  true,
    maxRetriesPerRequest: 3,
    lazyConnect:       false,
  });

  client.on('connect',       () => logger.info('Redis connecting...'));
  client.on('ready',         () => logger.info('Redis ready', { host: config.redis.host, port: config.redis.port }));
  client.on('error',  (err) => logger.error('Redis error', { error: err.message }));
  client.on('close',         () => logger.warn('Redis connection closed'));
  client.on('reconnecting',  () => logger.info('Redis reconnecting...'));

  return client;
};

export const redisClient = createRedisClient();

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.ping();
    logger.info('Redis connection verified');
  } catch (error) {
    logger.error('Failed to connect to Redis', { error });
    process.exit(1);
  }
};

export const disconnectRedis = async (): Promise<void> => {
  await redisClient.quit();
  logger.info('Redis disconnected cleanly');
};