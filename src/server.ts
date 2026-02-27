import http from 'http';
import { createApp } from './app';
import { config } from '@config/index';
import { connectDatabase } from '@config/database';
import { connectRedis } from '@config/redis';
import { rabbitMQ } from '@config/rabbitmq';
import { keycloakService } from '@config/keycloak';
// import { initializeSocketServer } from '@socket/index';
// import { registerUserConsumers } from '@queues/consumers/user.consumer';
import { logger } from '@utils/logger';

// ─────────────────────────────────────────────
//  BOOTSTRAP
// ─────────────────────────────────────────────

const bootstrap = async (): Promise<void> => {
    logger.info(`Starting ${config.app.name} in [${config.app.env}] mode`);

    // ── Infrastructure connections ──
    await connectDatabase();
    await connectRedis();
    await rabbitMQ.connect();

    // Pre-fetch Keycloak public key to warm up JWT verification
    await keycloakService.fetchPublicKey();

    // ── Register message consumers ──
    //   await registerUserConsumers();

    // ── HTTP + Socket.io server ──
    const app = createApp();
    const httpServer = http.createServer(app);

    //   initializeSocketServer(httpServer);

    httpServer.listen(config.app.port, config.app.host, () => {
        logger.info(`Server listening`, {
            host: config.app.host,
            port: config.app.port,
            prefix: config.app.apiPrefix,
            env: config.app.env,
        });
    });

    // ── Graceful shutdown ──
    registerShutdownHandlers(httpServer);
};

// ─────────────────────────────────────────────
//  GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────

const registerShutdownHandlers = (server: http.Server): void => {
    const shutdown = async (signal: string): Promise<void> => {
        logger.info(`${signal} received — shutting down gracefully`);

        server.close(async () => {
            try {
                const { disconnectDatabase } = await import('@config/database');
                const { disconnectRedis } = await import('@config/redis');

                await Promise.all([disconnectDatabase(), disconnectRedis(), rabbitMQ.disconnect()]);
                logger.info('All connections closed — process exiting');
                process.exit(0);
            } catch (err) {
                logger.error('Error during shutdown', { error: err });
                process.exit(1);
            }
        });

        // Force exit if graceful shutdown takes too long
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error: Error) => {
        logger.error('Uncaught exception', { error: error.message, stack: error.stack });
        process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
        logger.error('Unhandled rejection', { reason });
        process.exit(1);
    });
};

// ─────────────────────────────────────────────
//  ENTRYPOINT
// ─────────────────────────────────────────────

bootstrap().catch((error: Error) => {
    logger.error('Fatal bootstrap error', { error: error.message, stack: error.stack });
    process.exit(1);
});