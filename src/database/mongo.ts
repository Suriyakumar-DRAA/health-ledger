import mongoose from 'mongoose';
import { env } from '../config/env';
import logger from '../utils/logger';

class MongoDatabase {
  private static instance: MongoDatabase;
  private isConnected = false;

  private constructor() {}

  static getInstance(): MongoDatabase {
    if (!MongoDatabase.instance) {
      MongoDatabase.instance = new MongoDatabase();
    }
    return MongoDatabase.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.warn('[MongoDB] Already connected');
      return;
    }

    mongoose.set('strictQuery', true);

    mongoose.connection.on('connected', () => {
      this.isConnected = true;
      logger.info('[MongoDB] Connection established');
    });

    mongoose.connection.on('disconnected', () => {
      this.isConnected = false;
      logger.warn('[MongoDB] Connection lost');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('[MongoDB] Connection error', { error: err.message });
    });

    await mongoose.connect(env.mongo.uri, {
      maxPoolSize: env.mongo.maxPoolSize,
      serverSelectionTimeoutMS: env.mongo.serverSelectionTimeoutMS,
    });
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    await mongoose.disconnect();
    this.isConnected = false;
    logger.info('[MongoDB] Disconnected');
  }

  getStatus(): boolean {
    return this.isConnected;
  }
}

export const mongoDatabase = MongoDatabase.getInstance();
