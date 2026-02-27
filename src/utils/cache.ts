import { redisClient } from '@config/redis';
import { config } from '@config/index';
import { logger } from '@utils/logger';

export class CacheService {
    private readonly ttl: number;

    constructor(ttl = config.redis.defaultTtl) {
        this.ttl = ttl;
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const data = await redisClient.get(key);
            return data ? (JSON.parse(data) as T) : null;
        } catch (error) {
            logger.error('Cache GET error', { key, error });
            return null;
        }
    }

    async set<T>(key: string, value: T, ttl = this.ttl): Promise<void> {
        try {
            await redisClient.setex(key, ttl, JSON.stringify(value));
        } catch (error) {
            logger.error('Cache SET error', { key, error });
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await redisClient.del(key);
        } catch (error) {
            logger.error('Cache DELETE error', { key, error });
        }
    }

    async deletePattern(pattern: string): Promise<void> {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(...keys);
            }
        } catch (error) {
            logger.error('Cache DELETE PATTERN error', { pattern, error });
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            return (await redisClient.exists(key)) === 1;
        } catch (error) {
            logger.error('Cache EXISTS error', { key, error });
            return false;
        }
    }

    /**
     * Get-or-set pattern: fetch from cache or populate from callback
     */
    async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) return cached;

        const fresh = await callback();
        await this.set(key, fresh, ttl);
        return fresh;
    }
}

export const cacheService = new CacheService();