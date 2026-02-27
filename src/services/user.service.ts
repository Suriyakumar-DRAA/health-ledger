import { StatusCodes } from 'http-status-codes';
import { BaseService } from './base.service';
import { userRepository, IUser } from '@models/user.model';
import { cacheService } from '@utils/cache';
import { permissionsClient } from '@config/permission';
import { PaginatedResult, PaginationOptions, KeycloakTokenPayload } from '@customTypes/index';

// ─────────────────────────────────────────────
//  DTOs
// ─────────────────────────────────────────────
export interface CreateUserDto {
  email:      string;
  username:   string;
  firstName:  string;
  lastName:   string;
  keycloakId: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?:  string;
}

// ─────────────────────────────────────────────
//  CACHE KEY FACTORY
// ─────────────────────────────────────────────

const CK = {
  byId:   (id: string)    => `user:id:${id}`,
  byKcId: (id: string)    => `user:kc:${id}`,
  list:   (p: number, l: number, s: string, o: string) => `users:list:${p}:${l}:${s}:${o}`,
} as const;

// ─────────────────────────────────────────────
//  USER SERVICE
// ─────────────────────────────────────────────

class UserService extends BaseService {
  constructor() {
    super('UserService');
  }

  async getAll(options: PaginationOptions): Promise<PaginatedResult<Partial<IUser>>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const cacheKey = CK.list(page, limit, sortBy, sortOrder);

    return cacheService.remember(cacheKey, 60, async () => {
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 } as Record<string, 1 | -1>;
      // Projection: exclude internal fields from the API response
      const projection: Record<string, 0 | 1> = { keycloakId: 0 };

      const { data, total } = await userRepository.findAll({}, { page, limit, sort, projection });
      return this.buildPaginatedResult(data, total, options);
    });
  }

  async getById(id: string): Promise<Partial<IUser>> {
    const user = await cacheService.remember(
      CK.byId(id),
      300,
      () => userRepository.findById(id),
    );
    this.assertFound(user, 'User');
    return user;
  }
}

export const userService = new UserService();