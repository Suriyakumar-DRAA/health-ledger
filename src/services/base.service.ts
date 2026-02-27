import { StatusCodes } from 'http-status-codes';
import { AppError } from '@middleware/error.middleware';
import { logger } from '@utils/logger';
import { PaginatedResult, PaginationOptions } from '@customTypes/index';

// ─────────────────────────────────────────────
//  BASE SERVICE
// ─────────────────────────────────────────────

export abstract class BaseService {
    protected readonly context: string;

    constructor(context: string) {
        this.context = context;
    }

    // ─────────────────────────────────────────────
    //  GUARDS
    // ─────────────────────────────────────────────

    protected assertFound<T>(entity: T | null, name = 'Resource'): asserts entity is T {
        if (!entity) throw new AppError(`${name} not found`, StatusCodes.NOT_FOUND);
    }

    protected assertUnique(exists: boolean, field: string): void {
        if (exists) throw new AppError(`${field} already exists`, StatusCodes.CONFLICT);
    }

    // ─────────────────────────────────────────────
    //  PAGINATION BUILDER
    // ─────────────────────────────────────────────

    protected buildPaginatedResult<T>(
        data: T[],
        total: number,
        options: PaginationOptions,
    ): PaginatedResult<T> {
        const { page, limit } = options;
        const totalPages = Math.ceil(total / limit);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }

    // ─────────────────────────────────────────────
    //  LOGGING
    // ─────────────────────────────────────────────

    protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: object): void {
        logger[level](`[${this.context}] ${message}`, meta);
    }
}