import { Model, Document, FilterQuery, UpdateQuery, ProjectionType } from 'mongoose';
import logger from '@utils/logger';
import { AppError } from '@utils/AppError';

/**
 * CONTRACT: Every repository MUST implement this interface.
 * This is the only way developers are allowed to touch MongoDB.
 * Direct Model.find() calls outside a repository = ESLint error.
 */
export interface IBaseRepository<TDoc, TCreate, TUpdate> {
  findById(id: string, projection?: ProjectionType<TDoc>): Promise<TDoc | null>;

  findOne(
    filter: FilterQuery<TDoc>,
    projection?: ProjectionType<TDoc>,
  ): Promise<TDoc | null>;

  findAll(options: QueryOptions<TDoc>): Promise<Array<TDoc>>;

  findAllWithPagination(options: QueryOptions<TDoc>): Promise<PaginatedResult<TDoc>>;

  create(dto: TCreate, actorUsername: string): Promise<TDoc>;

  updateById(id: string, dto: TUpdate, actorUsername: string): Promise<TDoc | null>;

  deleteById(id: string): Promise<boolean>;

  exists(filter: FilterQuery<TDoc>): Promise<boolean>;

  count(filter?: FilterQuery<TDoc>): Promise<number>;
}

// Shared query / result shapes
export interface QueryOptions<TDoc> {
  filter?: FilterQuery<TDoc>;
  projection?: ProjectionType<TDoc>;   // ← ALWAYS pass this. Fetch only what you need.
  sort?: Record<string, 1 | -1>;
  page?: number;
  limit?: number;
  lean?: boolean;                       // default true → plain JS objects, 40% faster
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  executionTimeMs?: number;             // measured per query for observability
}

// ─────────────────────────────────────────────────────────────────────────────
// TCreate and TUpdate default to `never`.
//
// What this means in practice:
//
//   Read-only repo    → BaseRepository<IDoc>
//   Create-only repo  → BaseRepository<IDoc, CreateDto>
//   Full CRUD repo    → BaseRepository<IDoc, CreateDto, UpdateDto>
//
// When TCreate = never:
//   calling create(dto: never) → TypeScript compile error — you literally cannot
//   pass a value of type `never`. The method exists but is unreachable.
//   No runtime guard needed — the type system blocks it.
// ─────────────────────────────────────────────────────────────────────────────

export abstract class BaseRepository<
  TDoc extends Document,
  TCreate extends object = never,
  TUpdate extends object = never,
> implements IBaseRepository<TDoc, TCreate, TUpdate> {
  protected readonly SLOW_QUERY_THRESHOLD_MS = 80;
  protected readonly DEFAULT_LIMIT = 20;
  protected readonly MAX_LIMIT = 200;

  constructor(
    protected readonly model: Model<TDoc>,
    protected readonly collectionName: string,
  ) { }

  // ── READ — always available regardless of TCreate / TUpdate ───────────────

  async findById(id: string, projection?: ProjectionType<TDoc>): Promise<TDoc | null> {
    return this.timed('findById', () =>
      this.model.findById(id, projection).lean<TDoc>().exec(),
    );
  }

  async findOne(filter: FilterQuery<TDoc>, projection?: ProjectionType<TDoc>): Promise<TDoc | null> {
    return this.timed('findOne', () =>
      this.model.findOne(filter, projection).lean<TDoc>().exec(),
    );
  }

  async findAll(options: QueryOptions<TDoc>): Promise<Array<TDoc>> {
    return this.timed('findAll', () =>
      this.model.find(options.filter ?? {}, options.projection)
        .sort(options.sort ?? { _id: -1 })
        .limit(options.limit ?? this.DEFAULT_LIMIT)
        .lean<TDoc[]>().exec(),
    );
  }

  async findAllWithPagination(options: QueryOptions<TDoc>): Promise<PaginatedResult<TDoc>> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(this.MAX_LIMIT, Math.max(1, options.limit ?? this.DEFAULT_LIMIT));
    const skip = (page - 1) * limit;
    const filter = options.filter ?? {};

    if (!options.projection) {
      logger.warn(`[${this.collectionName}] findAllWithPagination called WITHOUT projection`, { filter });
    }

    const start = Date.now();
    const [data, total] = await Promise.all([
      this.model
        .find(filter, options.projection)
        .sort(options.sort ?? { _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean<TDoc[]>()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    const ms = Date.now() - start;
    this.logQueryTime('findAllWithPagination', ms, { filter, skip, limit });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit), executionTimeMs: ms };
  }

  async exists(filter: FilterQuery<TDoc>): Promise<boolean> {
    return this.timed('exists', async () => {
      const count = await this.model.countDocuments(filter).limit(1).exec();
      return count > 0;
    });
  }

  async count(filter: FilterQuery<TDoc> = {}): Promise<number> {
    return this.timed('count', () => this.model.countDocuments(filter).exec());
  }

  // ── WRITE — only usable when TCreate / TUpdate are provided ───────────────

  async create(dto: TCreate, actorUsername: string): Promise<TDoc> {
    return this.timed('create', async () => {
      const doc = new this.model({ ...dto, created_by: actorUsername, updated_by: actorUsername });
      return doc.save() as unknown as TDoc;
    });
  }

  async updateById(id: string, dto: TUpdate, actorUsername: string): Promise<TDoc | null> {
    const update: UpdateQuery<TDoc> = { $set: { ...dto, updated_by: actorUsername } };
    return this.timed('updateById', () =>
      this.model
        .findByIdAndUpdate(id, update, { new: true, runValidators: true })
        .lean<TDoc>()
        .exec(),
    );
  }

  async softDelete(id: string, actorUsername: string): Promise<boolean> {
    return this.timed('softDelete', async () => {
      const result = await this.model
        .findByIdAndUpdate(id, { $set: { is_active: false, updated_by: actorUsername } }, { new: true })
        .exec();
      return result !== null;
    });
  }

  async deleteById(_id: string): Promise<boolean> {
    throw new AppError(
      `[${this.collectionName}] Hard delete not permitted. Use softDelete().`,
      405, 'METHOD_NOT_ALLOWED',
    );
  }

  async bulkInsert(docs: TCreate[], actorUsername: string): Promise<TDoc[]> {
    return this.timed('bulkInsert', async () => {
      const enriched = docs.map((d) => ({ ...d, created_by: actorUsername, updated_by: actorUsername }));
      const result = await this.model.insertMany(enriched as object[], { ordered: false });
      return result as unknown as TDoc[];
    });
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  protected async timed<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.logQueryTime(operation, Date.now() - start);
      return result;
    } catch (err) {
      logger.error(`[${this.collectionName}] ${operation} failed`, {
        error: (err as Error).message,
        ms: Date.now() - start,
      });
      throw new AppError(
        `Database operation failed: ${operation}`,
        503, 'DB_OPERATION_FAILED',
        { collection: this.collectionName, operation },
      );
    }
  }

  private logQueryTime(operation: string, ms: number, meta?: Record<string, unknown>): void {
    if (ms > this.SLOW_QUERY_THRESHOLD_MS) {
      logger.warn(`[${this.collectionName}] SLOW QUERY: ${operation} took ${ms}ms`, meta);
    } else {
      logger.debug(`[${this.collectionName}] ${operation} → ${ms}ms`);
    }
  }
}