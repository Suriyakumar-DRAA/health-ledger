import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from '@config/index';

// ─────────────────────────────────────────────
//  FORMAT
// ─────────────────────────────────────────────

const prettyFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${stack ?? message}${metaStr}`;
  }),
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// ─────────────────────────────────────────────
//  TRANSPORTS
// ─────────────────────────────────────────────

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: config.app.isDev ? prettyFormat : jsonFormat,
  }),
];

if (config.app.isProd) {
  transports.push(
    new DailyRotateFile({
      filename:     path.join(config.logging.dir, 'error-%DATE%.log'),
      datePattern:  'YYYY-MM-DD',
      level:        'error',
      maxSize:      '20m',
      maxFiles:     '30d',
      format:       jsonFormat,
    }),
    new DailyRotateFile({
      filename:    path.join(config.logging.dir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize:     '20m',
      maxFiles:    '14d',
      format:      jsonFormat,
    }),
  );
}

// ─────────────────────────────────────────────
//  LOGGER INSTANCE
// ─────────────────────────────────────────────

export const logger = winston.createLogger({
  level:       config.logging.level,
  transports,
  exitOnError: false,
});