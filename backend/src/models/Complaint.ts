import mongoose, { Schema, Document, Types } from 'mongoose';

export type ComplaintStatus = 'REQUESTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type ComplaintType = 'MAINTENANCE' | 'CLEANLINESS' | 'SAFETY' | 'BILLING' | 'OTHER';

export interface IComplaint extends Document {
  userId: Types.ObjectId;
  pgId?: Types.ObjectId;
  type: ComplaintType;
  description: string;
  status: ComplaintStatus;
  adminNote?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'PGListing', index: true },
    type: {
      type: String,
      enum: ['MAINTENANCE', 'CLEANLINESS', 'SAFETY', 'BILLING', 'OTHER'],
      required: true,
    },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['REQUESTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
      required: true,
      default: 'REQUESTED',
      index: true,
    },
    adminNote: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

ComplaintSchema.index({ status: 1 });
ComplaintSchema.index({ pgId: 1 });

export default mongoose.model<IComplaint>('Complaint', ComplaintSchema);
