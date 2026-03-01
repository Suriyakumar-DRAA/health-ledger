# Enterprise Node.js TypeScript API

A production-ready, enterprise-grade REST API built with **Node.js 22**, **TypeScript 5**, **Express 5**, and a **Clean Architecture** pattern.

---

## 🏗️ Architecture

```
src/
├── config/              # Environment config (validated, typed)
├── controllers/         # HTTP layer — handles req/res only
├── services/            # Business logic layer
├── repositories/        # Data access layer (DB queries)
├── models/
│   ├── mongo/           # Mongoose schemas & models
│   └── mysql/           # MySQL query models
├── middleware/          # auth, error, rate-limit, tracing
├── routes/              # Express route definitions
├── database/            # DB connection managers (Mongo, MySQL, Redis)
├── utils/               # Logger, AppError, ResponseBuilder
├── types/               # Shared TypeScript interfaces & types
├── app.ts               # Express app factory
└── server.ts            # Bootstrap & graceful shutdown
```

### Clean Architecture Flow

```
HTTP Request
    ↓
Middleware (auth, rateLimit, tracer, helmet, cors)
    ↓
Route
    ↓
Controller  (parse req, call service, send response)
    ↓
Service     (business logic, validation, orchestration)
    ↓
Repository  (data access — Mongoose / MySQL queries)
    ↓
Database    (MongoDB / MySQL / Redis)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js >= 22** ([download](https://nodejs.org))
- **npm >= 10**
- Running instances of **MongoDB**, **MySQL**, and **Redis**

### Install

```bash
npm install
```

### Configure Environment

```bash
# For development
cp .env.example .env.development
# Edit .env.development with your values

# For production
cp .env.example .env.production
# Edit .env.production with your values
```

---

## 🛠️ Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with **nodemon** hot-reload |
| `npm run build` | Compile TypeScript → `dist/` (production) |
| `npm start` | Run compiled production build |
| `npm run start:prod` | Build + run in one command |
| `npm run type-check` | TypeScript type check (no emit) |
| `npm run lint` | ESLint with auto-fix |
| `npm run lint:check` | ESLint check only |
| `npm run clean` | Remove `dist/` |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Jest in watch mode |

---

## 🔥 Development Mode (Hot Reload)

```bash
npm run dev
```

`nodemon` watches all `src/**/*.ts` files and restarts the server automatically on every save via `ts-node`. No manual restart needed.

---

## 📦 Production Build

```bash
npm run build   # compiles to dist/
npm start       # runs dist/server.js
```

Or in a single command:

```bash
npm run start:prod
```

The production build:
- Strips source maps
- Removes comments
- Enables JSON structured logging
- Logs rotate daily with 30-day retention

---

## 🔒 Authentication

All protected routes require a **Keycloak-issued JWT** in the `Authorization` header:

```
Authorization: Bearer <your_jwt>
```

The middleware:
1. Extracts the `kid` from the JWT header
2. Fetches the matching public key from Keycloak JWKS endpoint (cached)
3. Verifies the signature, issuer, and expiry
4. Attaches the decoded `user` payload to `req.user`

### Role-Based Access Control (RBAC)

```typescript
import { requireRoles } from './middleware/authentication.middleware';

router.delete('/:id', authMiddleware, requireRoles('admin'), controller.remove);
```

---

## 🌐 API Endpoints

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/health` | No | Full health check with DB status |
| `GET` | `/api/v1/health/ping` | No | Simple ping |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/users` | ✅ | List all users (paginated) |
| `GET` | `/api/v1/users/me` | ✅ | Current authenticated user |
| `GET` | `/api/v1/users/:id` | ✅ | Get user by ID |
| `POST` | `/api/v1/users` | ✅ | Create user |
| `PATCH` | `/api/v1/users/:id` | ✅ | Update user |
| `DELETE` | `/api/v1/users/:id` | ✅ | Delete user |

#### Pagination

```
GET /api/v1/users?page=1&limit=20
```

#### Standard Response Envelope

```json
{
  "success": true,
  "data": { ... },
  "message": "Success",
  "requestId": "uuid-v4",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 📁 Adding a New Resource

Follow this pattern to add any new resource (e.g., `Patient`):

```
1. src/models/mongo/patient.model.ts     ← Mongoose schema
2. src/repositories/patient.repository.ts ← DB queries
3. src/services/patient.service.ts       ← Business logic
4. src/controllers/patient.controller.ts ← HTTP handlers
5. src/routes/patient.routes.ts          ← Route definitions
6. src/routes/index.ts                   ← Register route
```

---

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | HTTP server port |
| `MONGO_URI` | **Yes** | — | MongoDB connection URI |
| `MYSQL_HOST` | **Yes** | — | MySQL host |
| `MYSQL_USER` | **Yes** | — | MySQL username |
| `MYSQL_DATABASE` | **Yes** | — | MySQL database name |
| `REDIS_URL` | **Yes** | — | Redis connection URL |
| `KEYCLOAK_JWKS_URI` | **Yes** | — | Keycloak JWKS endpoint |
| `KEYCLOAK_ISSUER` | **Yes** | — | Keycloak issuer URL |
| `LOG_LEVEL` | No | `info` | Winston log level |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Requests per window |
| `CACHE_ROLES_TTL_SECONDS` | No | `86400` | User roles cache TTL (1 day) |

---

## 📊 Logging

- **Development**: Colored, human-readable console output
- **Production**: Structured JSON logs + rotating daily log files in `logs/`
  - `logs/app-YYYY-MM-DD.log` — all logs
  - `logs/error-YYYY-MM-DD.log` — error logs only
  - Zipped archives, 30-day retention

Every log line includes the `X-Request-Id` for end-to-end traceability.

---

## 🧪 Testing

```bash
npm test              # run all tests
npm run test:watch    # watch mode
```

Tests live next to source files: `src/services/user.service.test.ts`

---

## 🐳 Docker (Recommended for Production)

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

---

## 📐 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Language | TypeScript 5 (strict) |
| Framework | Express 5 |
| Primary DB | MongoDB (Mongoose 9) |
| SQL DB | MySQL (mysql2) |
| Cache | Redis 5 |
| Auth | Keycloak (JWKS / JWT) |
| Logging | Winston + Daily Rotate |
| Security | Helmet, CORS, Rate Limit |
| Dev Reload | Nodemon + ts-node |
| Testing | Jest + ts-jest |
| Linting | ESLint + TypeScript ESLint |
