import { Schema, model } from 'mongoose';
import { BaseDocument, BaseRepository, baseSchemaFields, baseSchemaOptions } from './base.model';

// ─────────────────────────────────────────────
//  INTERFACE
// ─────────────────────────────────────────────
export interface IUser extends BaseDocument {
    keycloakId: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    lastLoginAt?: Date;
}

// ─────────────────────────────────────────────
//  SCHEMA
//
//  baseSchemaFields adds: is_active, created_by,
//  created_at, modified_by, modified_at to every doc.
//
//  No index() calls here — all indexes are created
//  directly in MongoDB (Atlas UI / mongosh / migration).
// ─────────────────────────────────────────────
const userSchema = new Schema<IUser>(
    {
        ...baseSchemaFields,
        keycloakId: {
            type: String,
            required: true,
            unique: true,
            immutable: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        lastLoginAt: {
            type: Date,
        },
    },
    baseSchemaOptions,
);

// ─────────────────────────────────────────────
//  MODEL + REPOSITORY
// ─────────────────────────────────────────────

export const UserModel = model<IUser>('User', userSchema);

export class UserRepository extends BaseRepository<IUser> {
    constructor() {
        super(UserModel);
    }

    async findByEmail(email: string): Promise<IUser | null> {
        return UserModel
            .findOne({ email: email.toLowerCase(), is_active: true })
            .lean<IUser>()
            .exec();
    }

    async findByKeycloakId(keycloakId: string): Promise<IUser | null> {
        return UserModel
            .findOne({ keycloakId, is_active: true })
            .lean<IUser>()
            .exec();
    }

    async touchLastLogin(id: string): Promise<void> {
        await UserModel
            .updateOne(
                { _id: id },
                { $set: { lastLoginAt: new Date(), modified_at: new Date() } },
            )
            .exec();
    }
}

export const userRepository = new UserRepository();