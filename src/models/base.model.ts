import { Document, Model } from 'mongoose';

export interface BaseDocument extends Document {
    isActive: boolean;
    createdBy: string;
    modifiedBy: string;
}

export const baseSchemaFields = {
    isActive: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: String,
        default: 'system',
    },
    modifiedBy: {
        type: String,
        default: 'system',
    }
};

export const baseSchemaOptions = {
    strict: true,
    timestamps: true, // auto-manage createdAt and updatedAt (in camelCase)
    versionKey: false,
    autoIndex: false,   // indexes managed in DB, not in code
} as const;


export class BaseRepository<T extends BaseDocument> {
    constructor(protected readonly model: Model<T>) { }

    async findById(id: string): Promise<T | null> {
        return this.model
            .findOne({ _id: id, isActive: true })
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
        const { page = 1, limit = 20, sort = { createdAt: -1 }, projection } = options;
        const query = { ...filter, isActive: true };
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
                { _id: id, isActive: true },
                {
                    $set: {
                        ...payload,
                        modifiedBy: modifiedBy,
                        modifiedAt: new Date(),
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
                { _id: id, isActive: true },
                {
                    $set: {
                        isActive: false,
                        modifiedBy: deletedBy,
                        modifiedAt: new Date(),
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