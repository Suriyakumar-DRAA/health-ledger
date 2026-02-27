import { createClient, RedisClientType } from 'redis';
import { env } from '../config/env';
import logger from '../utils/logger';

class RedisDatabase {
  private static instance: RedisDatabase;
  private client: RedisClientType | null = null;
  private isConnected = false;

  private constructor() {}

  static getInstance(): RedisDatabase {
    if (!RedisDatabase.instance) {
      RedisDatabase.instance = new RedisDatabase();
    }
    return RedisDatabase.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.warn('[Redis] Already connected');
      return;
    }

    this.client = createClient({
      url: env.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries >= env.redis.maxRetries) {
            logger.error('[Redis] Max reconnect attempts reached');
            return new Error('Redis max reconnect attempts reached');
          }
          const delay = Math.min(retries * 1000, 5000);
          logger.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${retries})`);
          return delay;
        },
        connectTimeout: env.redis.connectTimeout,
      },
    }) as RedisClientType;

    this.client.on('connect', () => logger.info('[Redis] Connecting...'));
    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info('[Redis] Connection ready');
    });
    this.client.on('error', (err: Error) => logger.error('[Redis] Error', { error: err.message }));
    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('[Redis] Connection closed');
    });

    await this.client.connect();
  }

  getClient(): RedisClientType {
    if (!this.client || !this.isConnected) {
      throw new Error('[Redis] Client not connected. Call connect() first.');
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.getClient().get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const options = ttlSeconds ? { EX: ttlSeconds } : undefined;
    await this.getClient().set(key, value, options);
  }

  async del(key: string): Promise<void> {
    await this.getClient().del(key);
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    await this.client.quit();
    this.client = null;
    this.isConnected = false;
    logger.info('[Redis] Disconnected');
  }

  getStatus(): boolean {
    return this.isConnected;
  }
}

export const redisDatabase = RedisDatabase.getInstance();
