import { Schema, model, InferSchemaType, Types } from 'mongoose';

const mstAppointmentTypeSchema = new Schema(
    {
        label: { type: String, required: true, trim: true },
        is_active: { type: Boolean, default: true, index: true },
        created_by: { type: String, trim: true },
        updated_by: { type: String, trim: true },
    },
    {
        // Use created_at / updated_at to match your existing data (not createdAt/updatedAt)
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        versionKey: false,
        strict: true,
        collection: 'mst_appointment_types',  // matches your exact collection name
        autoIndex: false,                 // controlled by migration script
    },
);

export type IAppointmentType = InferSchemaType<typeof mstAppointmentTypeSchema>
    & { _id: Types.ObjectId };

export const AppointmentTypeModel = model('AppointmentType', mstAppointmentTypeSchema);