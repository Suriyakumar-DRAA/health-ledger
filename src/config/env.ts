import path from 'path';
import dotenv from 'dotenv';
import { Environment } from 'src/types';

// Load the correct .env file based on NODE_ENV
const envFile = '.env';
const NODE_ENV = (process.env['NODE_ENV'] ?? 'development') as Environment;

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Fallback to plain .env if environment-specific file not found
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Required env var guard
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[Config] Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

// Validated & Typed Config Object
export const env = {
  nodeEnv: NODE_ENV,
  isDevelopment: NODE_ENV === 'development',
  isProduction: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',

  server: {
    port: getEnvNumber('PORT', 3000),
    apiPrefix: getEnv('API_PREFIX', '/api/v1'),
  },

  mongo: {
    uri: requireEnv('MONGO_URI'),
    maxPoolSize: getEnvNumber('MONGO_MAX_POOL_SIZE', 10),
    serverSelectionTimeoutMS: getEnvNumber('MONGO_SERVER_SELECTION_TIMEOUT', 5000),
  },

  mysql: {
    host: requireEnv('MYSQL_HOST'),
    port: getEnvNumber('MYSQL_PORT', 3306),
    user: requireEnv('MYSQL_USER'),
    password: getEnv('MYSQL_PASSWORD', ''),
    database: requireEnv('MYSQL_DATABASE'),
    connectionLimit: getEnvNumber('MYSQL_CONNECTION_LIMIT', 10),
    acquireTimeout: getEnvNumber('MYSQL_ACQUIRE_TIMEOUT', 60000),
  },

  redis: {
    url: requireEnv('REDIS_URL'),
    maxRetries: getEnvNumber('REDIS_MAX_RETRIES', 3),
    connectTimeout: getEnvNumber('REDIS_CONNECT_TIMEOUT', 5000),
  },

  auth: {
    jwksUri: requireEnv('KEYCLOAK_JWKS_URI'),
    issuer: requireEnv('KEYCLOAK_ISSUER'),
    algorithms: getEnv('JWT_ALGORITHMS', 'RS256').split(','),
  },

  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60_000),
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },

  cache: {
    rolesTtlSeconds: getEnvNumber('CACHE_ROLES_TTL_SECONDS', 86_400), // 1 day default
  },

  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
    dir: getEnv('LOG_DIR', 'logs'),
  },
} as const;

export type AppConfig = typeof env;
