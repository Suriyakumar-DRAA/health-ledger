import { Schema, model, Types } from 'mongoose';
import { BaseDocument, baseSchemaFields, baseSchemaOptions } from './base.model';

// ──────────────────────────────────────────
// Interface
// ──────────────────────────────────────────
export interface IUser extends BaseDocument {
  _id: Types.ObjectId;
  keycloakId: string;
  email: string;
  name: string;
  roles: string[];
  lastLoginAt?: Date;
}

// ──────────────────────────────────────────
// Schema
// ──────────────────────────────────────────
const userSchema = new Schema<IUser>(
  {
    ...baseSchemaFields,
    keycloakId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    roles: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  baseSchemaOptions
);

export const UserModel = model<IUser>('User', userSchema);
