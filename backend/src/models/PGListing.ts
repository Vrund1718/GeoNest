import mongoose, { Schema, Document, Types } from 'mongoose';

export type PGStatus = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';
export type GenderPreference = 'MALE' | 'FEMALE' | 'CO_ED';

export interface IPLocation {
  type: 'Point';
  coordinates: [number, number];
}

export interface IPGListing extends Document {
  ownerId: Types.ObjectId;
  name: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  location: IPLocation;
  collegeName?: string;
  totalRooms: number;
  availableRooms: number;
  genderPreference: GenderPreference;
  pricePerMonth: number;
  securityDeposit?: number;
  foodIncluded: boolean;
  amenities: Types.ObjectId[];
  status: PGStatus;
  isVerified: boolean;
  verifiedByAdminId?: Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PGListingSchema: Schema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'Owner', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    address: { type: String, required: true },
    city: { type: String, required: true, index: true },
    state: { type: String },
    pincode: { type: String },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    collegeName: { type: String, index: true },
    totalRooms: { type: Number, required: true, default: 1 },
    availableRooms: { type: Number, required: true, default: 1 },
    genderPreference: {
      type: String,
      enum: ['MALE', 'FEMALE', 'CO_ED'],
      required: true,
      default: 'CO_ED',
    },
    pricePerMonth: { type: Number, required: true },
    securityDeposit: { type: Number },
    foodIncluded: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED'],
      required: true,
      default: 'DRAFT',
      index: true,
    },
    isVerified: { type: Boolean, default: false },
    rejectionReason: { type: String },
    verifiedByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    amenities: [{ type: Schema.Types.ObjectId, ref: 'Amenity', index: true }],
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

PGListingSchema.index({ location: '2dsphere' });
PGListingSchema.index({ city: 1, collegeName: 1 });
PGListingSchema.index({ ownerId: 1, status: 1 });

PGListingSchema.pre<IPGListing>('save', function (next) {
  if (this.isModified('latitude') || this.isModified('longitude')) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude],
    };
  }
  next();
});

export default mongoose.model<IPGListing>('PGListing', PGListingSchema);
