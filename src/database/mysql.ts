import mysql from 'mysql2/promise';
import { env } from '../config/env';
import logger from '../utils/logger';
import { ExecuteValues } from 'mysql2/typings/mysql/lib/protocol/sequences/Query';

class MySQLDatabase {
  private static instance: MySQLDatabase;
  private pool: mysql.Pool | null = null;

  private constructor() {}

  static getInstance(): MySQLDatabase {
    if (!MySQLDatabase.instance) {
      MySQLDatabase.instance = new MySQLDatabase();
    }
    return MySQLDatabase.instance;
  }

  async connect(): Promise<void> {
    if (this.pool) {
      logger.warn('[MySQL] Pool already initialized');
      return;
    }

    this.pool = mysql.createPool({
      host: env.mysql.host,
      port: env.mysql.port,
      user: env.mysql.user,
      password: env.mysql.password,
      database: env.mysql.database,
      connectionLimit: env.mysql.connectionLimit,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    // Verify connection
    const conn = await this.pool.getConnection();
    await conn.ping();
    conn.release();

    logger.info('[MySQL] Connection pool established', {
      host: env.mysql.host,
      database: env.mysql.database,
      connectionLimit: env.mysql.connectionLimit,
    });
  }

  getPool(): mysql.Pool {
    if (!this.pool) {
      throw new Error('[MySQL] Pool not initialized. Call connect() first.');
    }
    return this.pool;
  }

  async query<T>(sql: string, params?: ExecuteValues): Promise<T> {
    const [rows] = await this.getPool().execute(sql, params);
    return rows as T;
  }

  async disconnect(): Promise<void> {
    if (!this.pool) return;
    await this.pool.end();
    this.pool = null;
    logger.info('[MySQL] Pool closed');
  }

  getStatus(): boolean {
    return this.pool !== null;
  }
}

export const mysqlDatabase = MySQLDatabase.getInstance();
