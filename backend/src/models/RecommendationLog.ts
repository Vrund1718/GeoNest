import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRecommendationLog extends Document {
  userId: Types.ObjectId;
  recommendedPgIds: Types.ObjectId[];
  algorithm: string;
  parameters?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const RecommendationLogSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recommendedPgIds: [{ type: Schema.Types.ObjectId, ref: 'PGListing' }],
    algorithm: { type: String, required: true },
    parameters: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

RecommendationLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IRecommendationLog>('RecommendationLog', RecommendationLogSchema);
