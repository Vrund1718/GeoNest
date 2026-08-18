import mongoose, { Document, Schema } from 'mongoose';

export type NearbyPlaceType =
  | 'hospital'
  | 'atm'
  | 'gym'
  | 'restaurant'
  | 'medical_store'
  | 'bus_stop'
  | 'metro_station'
  | 'police';

export interface INearbyPlace extends Document {
  pgId: mongoose.Types.ObjectId;
  placeType: NearbyPlaceType;
  name: string;
  location: { type: 'Point'; coordinates: [number, number] };
  distanceMeters: number;
  createdAt: Date;
  updatedAt: Date;
}

const NearbyPlaceSchema: Schema = new Schema(
  {
    pgId: { type: Schema.Types.ObjectId, ref: 'PGListing', required: true, index: true },
    placeType: {
      type: String,
      enum: ['hospital', 'atm', 'gym', 'restaurant', 'medical_store', 'bus_stop', 'metro_station', 'police'],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true },
    },
    distanceMeters: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

NearbyPlaceSchema.index({ pgId: 1, placeType: 1, distanceMeters: 1 });

export default mongoose.model<INearbyPlace>('NearbyPlace', NearbyPlaceSchema);
