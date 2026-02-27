import dotenv from 'dotenv';

// Loads .env from the project root — no arguments needed.
// dotenv.config() always reads .env in the current working directory by default.
dotenv.config();

// ─────────────────────────────────────────────
//  HELPER
// ─────────────────────────────────────────────

const required = (key: string): string => {
    const value = process.env[key];
    if (!value) throw new Error(`Missing required environment variable: ${key}`);
    return value;
};

const optional = (key: string, defaultValue: string): string =>
    process.env[key] ?? defaultValue;

const optionalNumber = (key: string, defaultValue: number): number => {
    const value = process.env[key];
    return value ? parseInt(value, 10) : defaultValue;
};

// ─────────────────────────────────────────────
//  CONFIGURATION OBJECT
// ─────────────────────────────────────────────

export const config = {
    app: {
        name: optional('APP_NAME', 'EnterpriseApp'),
        env: optional('NODE_ENV', 'development'),
        port: optionalNumber('APP_PORT', 3000),
        host: optional('APP_HOST', '0.0.0.0'),
        apiPrefix: optional('API_PREFIX', '/api/v1'),
        allowedOrigins: optional('ALLOWED_ORIGINS', 'http://localhost:3000').split(','),
        isDev: optional('NODE_ENV', 'development') === 'development',
        isProd: optional('NODE_ENV', 'development') === 'production',
    },

    mongo: {
        uri: required('MONGO_URI'),
        poolMin: optionalNumber('MONGO_POOL_MIN', 5),
        poolMax: optionalNumber('MONGO_POOL_MAX', 20),
        connectTimeoutMs: optionalNumber('MONGO_CONNECT_TIMEOUT_MS', 10000),
        socketTimeoutMs: optionalNumber('MONGO_SOCKET_TIMEOUT_MS', 45000),
        serverSelectionTimeoutMs: optionalNumber('MONGO_SERVER_SELECTION_TIMEOUT_MS', 5000),
    },

    redis: {
        host: optional('REDIS_HOST', 'localhost'),
        port: optionalNumber('REDIS_PORT', 6379),
        password: optional('REDIS_PASSWORD', ''),
        db: optionalNumber('REDIS_DB', 0),
        keyPrefix: optional('REDIS_KEY_PREFIX', 'enterprise:'),
        defaultTtl: optionalNumber('REDIS_DEFAULT_TTL', 3600),
    },

    rabbitmq: {
        uri: required('RABBITMQ_URI'),
        exchange: optional('RABBITMQ_EXCHANGE', 'enterprise.exchange'),
        exchangeType: optional('RABBITMQ_EXCHANGE_TYPE', 'topic'),
        prefetch: optionalNumber('RABBITMQ_PREFETCH', 10),
    },

    keycloak: {
        authServerUrl: required('KEYCLOAK_AUTH_SERVER_URL'),
        realm: required('KEYCLOAK_REALM'),
        clientId: required('KEYCLOAK_CLIENT_ID'),
        clientSecret: required('KEYCLOAK_CLIENT_SECRET'),
    },

    /**
     * External Authorisation API
     * Completely separate from Keycloak.
     * Called once per user session; result is cached in Redis.
     */
    authorizationApi: {
        baseUrl: required('AUTHZ_API_BASE_URL'),
        apiKey: required('AUTHZ_API_KEY'),
        timeoutMs: optionalNumber('AUTHZ_API_TIMEOUT_MS', 3000),
        /** How long to keep the resolved permissions in Redis (seconds) */
        permissionsTtl: optionalNumber('AUTHZ_PERMISSIONS_TTL_SEC', 300),
    },

    rateLimit: {
        windowMs: optionalNumber('RATE_LIMIT_WINDOW_MS', 900000),
        maxRequests: optionalNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    },

    logging: {
        level: optional('LOG_LEVEL', 'info'),
        dir: optional('LOG_DIR', 'logs'),
    },
} as const;

export type Config = typeof config;