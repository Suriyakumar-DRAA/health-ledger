import { Response, NextFunction } from 'express';
import { userService } from '@services/user.service';
import { ResponseBuilder } from '@utils/response';
import { AuthenticatedRequest } from 'src/types';

export class UserController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.query as { page?: string; limit?: string };
      const result = await userService.getAllUsers({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      ResponseBuilder.paginated(res, result.data, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let id = req.params ? req.params['id'] : '';
      if (Array.isArray(id)) {
        id = id[0] ?? '';
      }
      const user = await userService.getUserById(id);
      ResponseBuilder.success(res, user);
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.createUser(req.body as {
        keycloakId: string;
        email: string;
        name: string;
        roles?: string[];
      });
      ResponseBuilder.created(res, user, 'User created successfully');
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let id = req.params ? req.params['id'] : '';
      if (Array.isArray(id)) {
        id = id[0] ?? '';
      }
      const user = await userService.updateUser(id, req.body as {
        name?: string;
        roles?: string[];
        isActive?: boolean;
      });
      ResponseBuilder.success(res, user, 'User updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let id = req.params ? req.params['id'] : '';
      if (Array.isArray(id)) {
        id = id[0] ?? '';
      }
      await userService.deleteUser(id);
      ResponseBuilder.noContent(res);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      ResponseBuilder.success(res, {
        sub: req.user?.sub,
        email: req.user?.email,
        name: req.user?.name,
        roles: req.user?.realm_access?.roles ?? [],
      });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
