import { Request } from 'express';
import { Socket } from 'socket.io';

// ─────────────────────────────────────────────
//  KEYCLOAK — AUTHENTICATION ONLY
//  Keycloak is responsible for identity (who you are).
//  Permissions (what you can do) come from the external
//  authorisation API — see UserPermissions below.
// ─────────────────────────────────────────────

export interface KeycloakTokenPayload {
  /** Subject — the stable user identifier passed to the auth API */
  sub:                string;
  email:              string;
  name:               string;
  preferred_username: string;
  /** Raw Keycloak realm roles — NOT used for authorisation decisions */
  realm_access: {
    roles: string[];
  };
  resource_access: Record<string, { roles: string[] }>;
  exp: number;
  iat: number;
}

// ─────────────────────────────────────────────
//  EXTERNAL AUTHORISATION API
//  Granular permissions resolved after authentication

// ─────────────────────────────────────────────
/**
 * Permission string format: "<resource>:<action>"
 * Examples: "users:read", "users:write", "reports:delete", "admin:*"
 */
export type Permission = string;

export interface UserPermissions {
  userId:      string;
  roles:       string[];          // high-level roles for display/logging
  permissions: Permission[];      // fine-grained action permissions
  fetchedAt:   number;            // unix ms — used to detect stale cache
}

// ─────────────────────────────────────────────
//  ENRICHED REQUEST
// ─────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  /** Identity from Keycloak JWT */
  user?: KeycloakTokenPayload;
  /** Permissions from the external authorisation API (cached in Redis) */
  permissions?: UserPermissions;
  /** UUID attached to every inbound request for tracing */
  requestId?: string;
  /** High-resolution start time for latency measurement */
  startAt?: [number, number];
}

export interface AuthenticatedSocket extends Socket {
  user?: KeycloakTokenPayload;
  permissions?: UserPermissions;
}

// ─────────────────────────────────────────────
//  PAGINATION
// ─────────────────────────────────────────────

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ─────────────────────────────────────────────
//  API RESPONSE
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ValidationError[];
  meta?: Record<string, unknown>;
  requestId?: string;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ─────────────────────────────────────────────
//  QUEUE MESSAGES
// ─────────────────────────────────────────────

export interface QueueMessage<T = unknown> {
  id: string;
  event: string;
  payload: T;
  timestamp: string;
  retryCount?: number;
}

// ─────────────────────────────────────────────
//  SOCKET EVENTS
// ─────────────────────────────────────────────

export enum SocketEvent {
  JOIN_ROOM   = 'join:room',
  LEAVE_ROOM  = 'leave:room',
  NOTIFICATION = 'notification',
  ERROR       = 'error',
}

// ─────────────────────────────────────────────
//  SERVICE LAYER
// ─────────────────────────────────────────────

export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
}