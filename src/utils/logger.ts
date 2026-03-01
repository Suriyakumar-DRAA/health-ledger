import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from '@config/env';
import * as rTracer from 'cls-rtracer';

// Custom log format with request-id injection
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const requestId = rTracer.id();
    const requestIdStr = requestId ? ` [${String(requestId)}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${String(stack)}` : '';
    return `${String(timestamp)} [${level.toUpperCase()}]${requestIdStr} ${String(message)}${metaStr}${stackStr}`;
  }),
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    const requestId = rTracer.id();
    if (requestId) info['requestId'] = requestId;
    return info;
  })(),
  winston.format.json(),
);

// Transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: env.isProduction ? jsonFormat : winston.format.combine(
      logFormat,
      winston.format.colorize({ level: true, colors: { error: 'red', warn: 'yellow', info: 'green', debug: 'blue' } }),
    ),
  }),
];

if (env.isProduction) {
  transports.push(
    new DailyRotateFile({
      dirname: env.logging.dir,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: jsonFormat,
    }),
    new DailyRotateFile({
      dirname: env.logging.dir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: jsonFormat,
    }),
  );
}

export const logger = winston.createLogger({
  level: env.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
});

export default logger;
