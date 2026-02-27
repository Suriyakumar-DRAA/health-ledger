import { Schema, Document, Model } from 'mongoose';

// ─────────────────────────────────────────────
//  BASE DOCUMENT
//  These 5 fields exist on every collection.
//  created_at / modified_at are managed manually
//  (not via Mongoose timestamps) so the field
//  names stay in snake_case matching the DB.
// ─────────────────────────────────────────────

export interface BaseDocument extends Document {
    is_active: boolean;
    created_by: string;
    created_at: Date;
    modified_by: string;
    modified_at: Date;
}

// ─────────────────────────────────────────────
//  BASE SCHEMA FIELDS
//  Spread these into every child schema.
// ─────────────────────────────────────────────

export const baseSchemaFields = {
    is_active: {
        type: Boolean,
        default: true,
    },
    created_by: {
        type: String,
        default: 'system',
    },
    created_at: {
        type: Date,
        default: () => new Date(),
    },
    modified_by: {
        type: String,
        default: 'system',
    },
    modified_at: {
        type: Date,
        default: () => new Date(),
    },
};

// ─────────────────────────────────────────────
//  BASE SCHEMA OPTIONS
//  Kept minimal — only what directly helps speed.
//
//  strict:      true  → unknown fields stripped on write (security + correctness)
//  versionKey:  false → removes __v field from every document
//  timestamps:  false → we manage created_at / modified_at ourselves
//
//  No toJSON transforms, no virtuals config, no autoIndex.
//  autoIndex: false means Mongoose will NOT call ensureIndex()
//  on startup — indexes are created directly in MongoDB.
// ─────────────────────────────────────────────

export const baseSchemaOptions = {
    strict: true,
    versionKey: false,
    timestamps: false,
    autoIndex: false,   // indexes managed in DB, not in code
} as const;

// ─────────────────────────────────────────────
//  BASE REPOSITORY
//
//  .lean() on every read — returns plain JS objects,
//  not full Mongoose Documents. Skips hydration,
//  getters, setters, virtuals. ~3× faster for reads.
//
//  Promise.all on list queries — data fetch and count
//  run in parallel, cutting round-trip time in half.
//
//  $set on all updates — prevents full document
//  replacement; only the supplied fields are written.
// ─────────────────────────────────────────────

export class BaseRepository<T extends BaseDocument> {
    constructor(protected readonly model: Model<T>) { }

    // ── READ ──────────────────────────────────────

    async findById(id: string): Promise<T | null> {
        return this.model
            .findOne({ _id: id, is_active: true })
            .lean<T>()
            .exec();
    }

    async findAll(
        filter: Record<string, unknown> = {},
        options: {
            page?: number;
            limit?: number;
            sort?: Record<string, 1 | -1>;
            projection?: Record<string, 0 | 1>;
        } = {},
    ): Promise<{ data: T[]; total: number }> {
        const { page = 1, limit = 20, sort = { created_at: -1 }, projection } = options;
        const query = { ...filter, is_active: true };
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.model
                .find(query, projection ?? {})
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean<T[]>()
                .exec(),
            this.model.countDocuments(query).exec(),
        ]);

        return { data, total };
    }

    // ── WRITE ─────────────────────────────────────

    async create(payload: Partial<T>): Promise<T> {
        const now = new Date();
        return this.model.create({
            ...payload,
            created_at: now,
            modified_at: now,
        });
    }

    async updateById(
        id: string,
        payload: Partial<T>,
        modifiedBy: string = 'system',
    ): Promise<T | null> {
        return this.model
            .findOneAndUpdate(
                { _id: id, is_active: true },
                {
                    $set: {
                        ...payload,
                        modified_by: modifiedBy,
                        modified_at: new Date(),
                    },
                },
                { new: true, runValidators: true },
            )
            .lean<T>()
            .exec();
    }

    async softDelete(id: string, deletedBy: string = 'system'): Promise<T | null> {
        return this.model
            .findOneAndUpdate(
                { _id: id, is_active: true },
                {
                    $set: {
                        is_active: false,
                        modified_by: deletedBy,
                        modified_at: new Date(),
                    },
                },
                { new: true },
            )
            .lean<T>()
            .exec();
    }

    async exists(filter: Record<string, unknown>): Promise<boolean> {
        return (await this.model.exists(filter)) !== null;
    }
}