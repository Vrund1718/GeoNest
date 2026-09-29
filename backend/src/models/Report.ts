import mongoose, { Document, Schema } from 'mongoose';

export type ReportReason = 'fake_listing' | 'wrong_pricing' | 'safety_issue' | 'spam' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'action_taken' | 'dismissed';

export interface IReport extends Document {
  userId: mongoose.Types.ObjectId;
  pgId: mongoose.Types.ObjectId;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'PGListing', required: true, index: true },
    reason: {
      type: String,
      enum: ['fake_listing', 'wrong_pricing', 'safety_issue', 'spam', 'other'],
      required: true,
    },
    details: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'action_taken', 'dismissed'],
      default: 'pending',
      index: true,
    },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IReport>('Report', ReportSchema);
