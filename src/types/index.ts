import { Request } from 'express';

// ──────────────────────────────────────────
// API Response Envelope
// ──────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  meta?: PaginationMeta;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ──────────────────────────────────────────
// Authenticated Request
// ──────────────────────────────────────────
export interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
  iat: number;
  exp: number;
  iss: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  requestId?: string;
}

// ──────────────────────────────────────────
// Database
// ──────────────────────────────────────────
export interface DatabaseConfig {
  mongo: {
    uri: string;
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
  };
  mysql: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    connectionLimit: number;
    acquireTimeout: number;
  };
  redis: {
    url: string;
    maxRetries: number;
    connectTimeout: number;
  };
}

// ──────────────────────────────────────────
// Environment
// ──────────────────────────────────────────
export type Environment = 'development' | 'production' | 'test';
