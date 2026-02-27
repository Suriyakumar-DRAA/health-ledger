import { Response } from 'express';
import { BaseController } from './base.controller';
import { userService } from '@services/user.service';
import { ResponseBuilder } from '@utils/response';
import { AuthenticatedRequest } from '@customTypes/index';

// ─────────────────────────────────────────────
//  USER CONTROLLER
//  Thin layer — delegates all logic to service
// ─────────────────────────────────────────────

class UserController extends BaseController {
  // GET /users
  getAll = this.handle(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { page = 1, limit = 20, sortBy, sortOrder } = req.query as {
      page?:      number;
      limit?:     number;
      sortBy?:    string;
      sortOrder?: 'asc' | 'desc';
    };

    const result = await userService.getAll({ page: +page, limit: +limit, sortBy, sortOrder });
    ResponseBuilder.paginated(res, result, 'Users retrieved successfully');
  });

  // GET /users/:id
  getById = this.handle(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = await userService.getById(req.params.id);
    ResponseBuilder.success(res, user, 'User retrieved successfully');
  });
}

export const userController = new UserController();