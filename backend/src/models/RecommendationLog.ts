import mongoose, { Document, Schema } from 'mongoose';

export interface IRecommendationLog extends Document {
  userId: mongoose.Types.ObjectId;
  pgId: mongoose.Types.ObjectId;
  score: number;
  algorithmVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecommendationLogSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'PGListing', required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 1 },
    algorithmVersion: { type: String, required: true, default: 'v1-rule-based' },
  },
  { timestamps: true }
);

RecommendationLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IRecommendationLog>('RecommendationLog', RecommendationLogSchema);
