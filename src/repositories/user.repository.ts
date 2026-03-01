import { FilterQuery, UpdateQuery } from 'mongoose';
import { IUser, UserModel } from '@models/user.model';
import logger from '@utils/logger';

export interface CreateUserDto {
  keycloakId: string;
  email: string;
  name: string;
  roles?: string[];
}

export interface UpdateUserDto {
  name?: string;
  roles?: string[];
  isActive?: boolean;
  lastLoginAt?: Date;
}

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id).exec();
  }

  async findByKeycloakId(keycloakId: string): Promise<IUser | null> {
    return UserModel.findOne({ keycloakId }).exec();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findAll(filter: FilterQuery<IUser> = {}, skip = 0, limit = 20): Promise<{
    data: IUser[];
    total: number;
  }> {
    const [data, total] = await Promise.all([
      UserModel.find(filter).skip(skip).limit(limit).exec(),
      UserModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  async create(dto: CreateUserDto): Promise<IUser> {
    const user = new UserModel(dto);
    return user.save();
  }

  async update(id: string, dto: UpdateUserDto): Promise<IUser | null> {
    const update: UpdateQuery<IUser> = { $set: dto };
    return UserModel.findByIdAndUpdate(id, update, { new: true, runValidators: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async upsertByKeycloakId(keycloakId: string, dto: CreateUserDto): Promise<IUser> {
    const user = await UserModel.findOneAndUpdate(
      { keycloakId },
      { $set: dto },
      { upsert: true, new: true, runValidators: true },
    ).exec();

    if (!user) throw new Error('Failed to upsert user');

    logger.debug('[UserRepository] Upserted user', { keycloakId });
    return user;
  }
}

export const userRepository = new UserRepository();
