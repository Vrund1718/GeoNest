import mongoose, { Schema, Document } from 'mongoose';

export type AmenityCategory = 'SAFETY' | 'CONNECTIVITY' | 'FOOD' | 'LIFESTYLE' | 'LAUNDRY' | 'OTHER';

export interface IAmenity extends Document {
  name: string;
  category: AmenityCategory;
  iconKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AmenitySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    category: {
      type: String,
      enum: ['SAFETY', 'CONNECTIVITY', 'FOOD', 'LIFESTYLE', 'LAUNDRY', 'OTHER'],
      required: true,
    },
    iconKey: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AmenitySchema.index({ name: 1 }, { unique: true });

export default mongoose.model<IAmenity>('Amenity', AmenitySchema);
