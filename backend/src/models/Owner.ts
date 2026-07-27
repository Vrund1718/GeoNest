import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOwner extends Document {
  userId: Types.ObjectId;
  businessName?: string;
  idProofUrl?: string;
  isPhoneVerified: boolean;
  companyName?: string;
  licenseNumber?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OwnerSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String },
    idProofUrl: { type: String },
    isPhoneVerified: { type: Boolean, default: false },
    companyName: { type: String },
    licenseNumber: { type: String },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OwnerSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model<IOwner>('Owner', OwnerSchema);
