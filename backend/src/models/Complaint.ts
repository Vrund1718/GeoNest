import mongoose, { Document, Schema } from 'mongoose';

export type ComplaintType = 'hygiene' | 'noise' | 'safety' | 'staff' | 'amenity' | 'other';
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved';

export interface IComplaint extends Document {
  userId: mongoose.Types.ObjectId;
  pgId: mongoose.Types.ObjectId;
  type: ComplaintType;
  description: string;
  status: ComplaintStatus;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'PGListing', required: true, index: true },
    type: {
      type: String,
      enum: ['hygiene', 'noise', 'safety', 'staff', 'amenity', 'other'],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved'],
      required: true,
      default: 'open',
      index: true,
    },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IComplaint>('Complaint', ComplaintSchema);
