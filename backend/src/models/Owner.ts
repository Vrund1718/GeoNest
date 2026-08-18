import mongoose, { Document, Schema } from 'mongoose';

export type OwnerVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface IOwner extends Document {
  userId: mongoose.Types.ObjectId;
  verificationStatus: OwnerVerificationStatus;
  govIdUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OwnerSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected'],
      required: true,
      default: 'unverified',
    },
    govIdUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IOwner>('Owner', OwnerSchema);
