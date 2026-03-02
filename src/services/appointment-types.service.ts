
import { AppError } from '@utils/AppError';
import {
  appointmentTypeRepository,
  CreateAppointmentTypeDto,
  UpdateAppointmentTypeDto
} from '@repositories/appointment-types.respository';
import logger from '@utils/logger';
import { IAppointmentType } from 'src/models/appointment-type.model';

export class AppointmentTypeService {
  async getAllAppointmentTypes(): Promise<Array<IAppointmentType>> {
    const appointmentTypes = await appointmentTypeRepository.findAllItems();
    return appointmentTypes;
  }

  async getAppointmentTypeById(id: string): Promise<IAppointmentType> {
    const appointmentType = await appointmentTypeRepository.findById(id);
    if (!appointmentType) throw AppError.notFound('Appointment Type');
    return appointmentType;
  }

  async createAppointmentType(dto: CreateAppointmentTypeDto): Promise<IAppointmentType> {
    const existing = await appointmentTypeRepository.findOne({ label: dto.label });
    if (existing) throw AppError.conflict(`Appointment Type with label ${dto.label} already exists`);

    const appointmentType = await appointmentTypeRepository.createAppointmentType(dto);
    logger.info('[AppointmentTypeService] Appointment Type created', { appointmentTypeId: appointmentType._id.toString() });
    return appointmentType;
  }

  async updateAppointmentType(id: string, dto: UpdateAppointmentTypeDto): Promise<IAppointmentType> {
    const appointmentType = await appointmentTypeRepository.updateAppointmentType(id, dto);
    if (!appointmentType) throw AppError.notFound('Appointment Type');
    logger.info('[AppointmentTypeService] Appointment Type updated', { appointmentTypeId: id });
    return appointmentType;
  }
}

export const appointmentTypeService = new AppointmentTypeService();
