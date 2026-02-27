import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from '@config/index';
import { requestId, httpLogger } from '@middleware/logger.middleware';
import { performanceMiddleware } from '@middleware/performance.middleware';
import { globalErrorHandler, notFoundHandler } from '@middleware/error.middleware';
import router from '@routes/index';

// ─────────────────────────────────────────────
//  APP FACTORY
//
//  Middleware order is deliberate:
//    ① Security headers — first, before any logic
//    ② CORS — before body parsing so pre-flight OPTIONS is answered fast
//    ③ Performance timer — attached immediately after security so it
//       captures the full request lifecycle including body parsing
//    ④ Request ID — needed by every subsequent middleware for tracing
//    ⑤ Compression — before body parse so response can be compressed
//    ⑥ Body parsing — only after security & tracing are in place
//    ⑦ HTTP logger — after body parse so Content-Length is accurate
//    ⑧ Rate limiter — after parsing, before routes
//    ⑨ Routes
//    ⑩ 404 + global error handler — always last
// ─────────────────────────────────────────────

export const createApp = (): Application => {
    const app = express();

    // ① Security headers (helmet)
    app.use(
        helmet({
            contentSecurityPolicy: config.app.isProd,    // off in dev for ease
            crossOriginEmbedderPolicy: false,
        }),
    );

    // ② CORS — answers OPTIONS pre-flight before any other work
    app.use(
        cors({
            origin: config.app.allowedOrigins,
            credentials: true,
            methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
            exposedHeaders: ['X-Request-ID', 'X-Response-Time'],
            maxAge: 86400,     // cache pre-flight for 24 h
        }),
    );

    // ③ High-resolution performance timer
    app.use(performanceMiddleware);

    // ④ Unique request ID for distributed tracing
    app.use(requestId);

    // ⑤ Response compression
    app.use(
        compression({
            level: 6,
            threshold: 1024,    // only compress responses > 1 KB
        }),
    );

    // ⑥ Body parsing with size guards
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // ⑦ HTTP request logger
    app.use(httpLogger);

    // ⑧ Rate limiting — applied after parsing so we have req.ip
    app.use(
        rateLimit({
            windowMs: config.rateLimit.windowMs,
            max: config.rateLimit.maxRequests,
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: (req) => req.ip ?? 'unknown',
            message: { success: false, message: 'Too many requests — try again later.' },
        }),
    );

    // Trust X-Forwarded-For in production (behind nginx / ALB)
    if (config.app.isProd) {
        app.set('trust proxy', 1);
    }

    // ⑨ API routes
    app.use(config.app.apiPrefix, router);

    // ⑩ Fallbacks — always last
    app.use(notFoundHandler);
    app.use(globalErrorHandler);

    return app;
};