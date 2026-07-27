import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INearbyPlace extends Document {
  pgListingId: Types.ObjectId;
  name: string;
  type: string;
  distanceKm: number;
  createdAt: Date;
  updatedAt: Date;
}

const NearbyPlaceSchema: Schema = new Schema(
  {
    pgListingId: { type: Schema.Types.ObjectId, ref: 'PGListing', required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    distanceKm: { type: Number, required: true },
  },
  { timestamps: true }
);

NearbyPlaceSchema.index({ pgListingId: 1 });

export default mongoose.model<INearbyPlace>('NearbyPlace', NearbyPlaceSchema);
