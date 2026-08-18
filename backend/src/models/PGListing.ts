import mongoose, { Document, Schema } from 'mongoose';

export type GenderPreference = 'male' | 'female' | 'unisex';
export type PGStatus = 'active' | 'inactive' | 'deleted';

export interface IPGListing extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  address: string;
  city: string;
  collegeName?: string;
  location: { type: 'Point'; coordinates: [number, number] };
  totalRooms: number;
  availableRooms: number;
  genderPreference: GenderPreference;
  pricePerMonth: number;
  securityDeposit: number;
  isVerified: boolean;
  status: PGStatus;
  amenities: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const PGListingSchema: Schema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'Owner', required: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, index: true, trim: true },
    collegeName: { type: String, index: true, trim: true },
    location: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true },
    },
    totalRooms: { type: Number, required: true, min: 1 },
    availableRooms: { type: Number, required: true, min: 0 },
    genderPreference: { type: String, enum: ['male', 'female', 'unisex'], required: true },
    pricePerMonth: { type: Number, required: true, min: 0 },
    securityDeposit: { type: Number, required: true, min: 0, default: 0 },
    isVerified: { type: Boolean, required: true, default: false, index: true },
    status: { type: String, enum: ['active', 'inactive', 'deleted'], required: true, default: 'active', index: true },
    amenities: [{ type: Schema.Types.ObjectId, ref: 'Amenity' }],
  },
  { timestamps: true }
);

PGListingSchema.index({ location: '2dsphere' });
PGListingSchema.index({ ownerId: 1, status: 1 });

export default mongoose.model<IPGListing>('PGListing', PGListingSchema);
