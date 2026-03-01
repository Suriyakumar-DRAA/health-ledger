import { AppError } from '@utils/AppError';
import { PaginationQuery } from 'src/types';
import {
  userRepository,
  CreateUserDto,
  UpdateUserDto,
} from '@repositories/user.repository';
import { IUser } from '@models/user.model';
import logger from '@utils/logger';

interface PaginatedUsers {
  data: IUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class UserService {
  async getAllUsers(query: PaginationQuery): Promise<PaginatedUsers> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const { data, total } = await userRepository.findAll({}, skip, limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string): Promise<IUser> {
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound('User');
    return user;
  }

  async createUser(dto: CreateUserDto): Promise<IUser> {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw AppError.conflict(`User with email ${dto.email} already exists`);

    const user = await userRepository.create(dto);
    logger.info('[UserService] User created', { userId: user._id.toString() });
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<IUser> {
    const user = await userRepository.update(id, dto);
    if (!user) throw AppError.notFound('User');
    logger.info('[UserService] User updated', { userId: id });
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const deleted = await userRepository.delete(id);
    if (!deleted) throw AppError.notFound('User');
    logger.info('[UserService] User deleted', { userId: id });
  }
}

export const userService = new UserService();
