import mongoose, { Document, Schema } from 'mongoose';

export type ComplaintType = 'hygiene' | 'noise' | 'safety' | 'staff' | 'amenity' | 'electrician' | 'plumber' | 'wifi' | 'furniture' | 'water' | 'security' | 'pest_control' | 'food' | 'other';
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IComplaintResponse {
  role: 'student' | 'owner' | 'admin';
  message: string;
  createdAt: Date;
}

export interface IComplaint extends Document {
  userId: mongoose.Types.ObjectId;
  pgId: mongoose.Types.ObjectId;
  type: ComplaintType;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  photoUrls: string[];
  responses: IComplaintResponse[];
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
      enum: ['hygiene', 'noise', 'safety', 'staff', 'amenity', 'electrician', 'plumber', 'wifi', 'furniture', 'water', 'security', 'pest_control', 'food', 'other'],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      required: true,
      default: 'medium',
    },
    photoUrls: [{ type: String }],
    responses: [
      {
        role: { type: String, enum: ['student', 'owner', 'admin'] },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      required: true,
      default: 'open',
      index: true,
    },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IComplaint>('Complaint', ComplaintSchema);
