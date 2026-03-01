import { Document } from 'mongoose';
import { BaseRepository } from '@repositories/base.repository';
import { AppointmentTypeModel, IAppointmentType } from 'src/models/appointment-type.model';

// DTOs — only the fields a caller is allowed to pass
export interface CreateAppointmentTypeDto {
    label: string;
}

export interface UpdateAppointmentTypeDto {
    label?: string;
}

// Projections — one constant per use case, never fetch more than needed
export const APPT_TYPE_LIST_PROJECTION = {
    label: 1, created_by: 1, updated_by: 1,
    created_at: 1, updated_at: 1,
} as const;

type AppointmentTypeDoc = IAppointmentType & Document;

// Repository
export class AppointmentTypeRepository extends BaseRepository<
    AppointmentTypeDoc,
    CreateAppointmentTypeDto,
    UpdateAppointmentTypeDto
> {
    constructor() {
        super(AppointmentTypeModel as never, 'AppointmentType');
    }

    // ── Find appointment type by ID ──────────────────────────────────────────────
    async findById(
        id: string,
        projection = APPT_TYPE_LIST_PROJECTION,
    ): Promise<AppointmentTypeDoc | null> {
        return await this.findOne({ _id: id }, projection);
    }

    // ── Find all appointment types ────────────────────────────────────────────────
    async findAllItems(): Promise<AppointmentTypeDoc[]> {
        const result = await this.findAll(
            {
                filter: { is_active: true },
                projection: APPT_TYPE_LIST_PROJECTION,
                sort: { label: 1 },
            }
        );
        return result;
    }

    // ── Create a new appointment type ───────────────────────────────────────────────
    async createAppointmentType(
        data: CreateAppointmentTypeDto
    ): Promise<AppointmentTypeDoc> {
        const appointmentType = await this.create(data, '');
        return appointmentType;
    }
}

export const appointmentTypeRepository = new AppointmentTypeRepository();