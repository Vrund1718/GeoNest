import mongoose, { Document, Schema } from 'mongoose';

export type ComplaintType = 'hygiene' | 'noise' | 'safety' | 'staff' | 'amenity' | 'electrician' | 'plumber' | 'wifi' | 'furniture' | 'water' | 'security' | 'pest_control' | 'food' | 'other';
export type ComplaintStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'reopened' | 'closed';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

export type IntelligenceCategory =
  | 'plumbing'
  | 'electrical'
  | 'wifi'
  | 'cleaning'
  | 'furniture'
  | 'appliances'
  | 'food'
  | 'security'
  | 'other';

export type IntelligencePriority = 'low' | 'medium' | 'high' | 'critical';
export type AnalysisStatus = 'pending' | 'done' | 'failed' | 'skipped';

export interface IComplaintResponse {
  role: 'student' | 'owner' | 'admin';
  message: string;
  createdAt: Date;
}

export interface IComplaintIntelligence {
  category: IntelligenceCategory;
  issueType: string;
  priority: IntelligencePriority;
  confidence: number;
  suggestedAction: string;
  recurringIssue: boolean;
  relatedComplaintIds: mongoose.Types.ObjectId[];
  modelVersion: string;
  reviewedByHuman: boolean;
  analysisStatus: AnalysisStatus;
  asset?: string;
  location?: string;
  requiresHumanReview?: boolean;
  immediateEscalation?: boolean;
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
  estimatedResolutionHours?: number;
  estimatedResolutionDate?: Date;
  ratingDeducted?: boolean;
  ratingDeductionAmount?: number;
  resolvedAt?: Date;
  intelligence?: IComplaintIntelligence;
  assignedTo?: string;
  dueAt?: Date;
  reopenCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintIntelligenceSchema: Schema = new Schema(
  {
    category: {
      type: String,
      enum: ['plumbing', 'electrical', 'wifi', 'cleaning', 'furniture', 'appliances', 'food', 'security', 'other'],
      default: 'other',
    },
    issueType: { type: String, default: 'general_maintenance' },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    confidence: { type: Number, default: 0.5, min: 0, max: 1 },
    suggestedAction: { type: String, default: '' },
    recurringIssue: { type: Boolean, default: false, index: true },
    relatedComplaintIds: [{ type: Schema.Types.ObjectId, ref: 'Complaint' }],
    modelVersion: { type: String, default: 'gemini-rule-hybrid-v1' },
    reviewedByHuman: { type: Boolean, default: false },
    analysisStatus: {
      type: String,
      enum: ['pending', 'done', 'failed', 'skipped'],
      default: 'pending',
    },
    asset: { type: String },
    location: { type: String },
    requiresHumanReview: { type: Boolean, default: false },
    immediateEscalation: { type: Boolean, default: false },
  },
  { _id: false }
);

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
      enum: ['low', 'medium', 'high', 'urgent', 'critical'],
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
      enum: ['open', 'assigned', 'in_progress', 'resolved', 'reopened', 'closed'],
      required: true,
      default: 'open',
      index: true,
    },
    estimatedResolutionHours: { type: Number },
    estimatedResolutionDate: { type: Date },
    ratingDeducted: { type: Boolean, default: false },
    ratingDeductionAmount: { type: Number, default: 0 },
    resolvedAt: { type: Date },
    intelligence: { type: ComplaintIntelligenceSchema, required: false },
    assignedTo: { type: String, trim: true },
    dueAt: { type: Date, index: true },
    reopenCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound indexes for recurrence aggregation, status filtering, and SLA monitoring
ComplaintSchema.index({ pgId: 1, 'intelligence.category': 1, createdAt: -1, status: 1 });
ComplaintSchema.index({ pgId: 1, status: 1, dueAt: 1 });
ComplaintSchema.index({ 'intelligence.recurringIssue': 1, pgId: 1 });

export default mongoose.model<IComplaint>('Complaint', ComplaintSchema);
