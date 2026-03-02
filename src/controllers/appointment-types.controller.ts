import { Response, NextFunction } from 'express';
import { appointmentTypeService } from '@services/appointment-types.service';
import { ResponseBuilder } from '@utils/response';
import { AuthenticatedRequest } from 'src/types';

export class AppointmentTypesController {
  async getAll(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await appointmentTypeService.getAllAppointmentTypes();
      ResponseBuilder.success(res, result);
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
      const appointmentType = await appointmentTypeService.getAppointmentTypeById(id);
      ResponseBuilder.success(res, appointmentType);
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new Error('Authenticated user information is missing');
      }
      const appointmentType = await appointmentTypeService.createAppointmentType(req.body);
      ResponseBuilder.created(res, appointmentType, 'Appointment Type created successfully');
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
      const appointmentType = await appointmentTypeService.updateAppointmentType(id, req.body as {
        label?: string;
      });
      ResponseBuilder.success(res, appointmentType, 'Appointment Type updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const appointmentTypesController = new AppointmentTypesController();
