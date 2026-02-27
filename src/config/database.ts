import mongoose from 'mongoose';
import { config } from '@config/index';
import { logger } from '@utils/logger';

// ─────────────────────────────────────────────
//  CONNECTION OPTIONS
// ─────────────────────────────────────────────

const connectionOptions: mongoose.ConnectOptions = {
  minPoolSize:                  config.mongo.poolMin,
  maxPoolSize:                  config.mongo.poolMax,
  connectTimeoutMS:             config.mongo.connectTimeoutMs,
  socketTimeoutMS:              config.mongo.socketTimeoutMs,
  serverSelectionTimeoutMS:     config.mongo.serverSelectionTimeoutMs,
  heartbeatFrequencyMS:         10000,
  retryWrites:                  true,
  retryReads:                   true,
};

// ─────────────────────────────────────────────
//  EVENT LISTENERS
// ─────────────────────────────────────────────

const attachEventListeners = (): void => {
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected', {
      host:     mongoose.connection.host,
      port:     mongoose.connection.port,
      database: mongoose.connection.name,
      poolMin:  config.mongo.poolMin,
      poolMax:  config.mongo.poolMax,
    });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected — attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully');
  });

  mongoose.connection.on('error', (error: Error) => {
    logger.error('MongoDB connection error', { error: error.message });
  });

  // Log slow queries in development
  if (config.app.isDev) {
    mongoose.set('debug', (collection: string, method: string, query: unknown) => {
      logger.debug(`MongoDB query`, { collection, method, query });
    });
  }
};

// ─────────────────────────────────────────────
//  CONNECT
// ─────────────────────────────────────────────

export const connectDatabase = async (): Promise<void> => {
  attachEventListeners();

  try {
    await mongoose.connect(config.mongo.uri, connectionOptions);
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected cleanly');
};