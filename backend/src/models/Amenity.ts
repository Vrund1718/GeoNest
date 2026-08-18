import mongoose, { Document, Schema } from 'mongoose';

export type AmenityCategory = 'room' | 'kitchen' | 'washroom' | 'common' | 'security' | 'other';

export interface IAmenity extends Document {
  name: string;
  category: AmenityCategory;
  createdAt: Date;
  updatedAt: Date;
}

const AmenitySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    category: {
      type: String,
      enum: ['room', 'kitchen', 'washroom', 'common', 'security', 'other'],
      required: true,
      default: 'other',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAmenity>('Amenity', AmenitySchema);
