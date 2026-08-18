import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  pgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number;
  text: string;
  sentimentScore: number | null;
  isFlaggedFake: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema(
  {
    pgId: { type: Schema.Types.ObjectId, ref: 'PGListing', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, required: true, trim: true },
    sentimentScore: { type: Number, default: null },
    isFlaggedFake: { type: Boolean, default: null },
  },
  { timestamps: true }
);

ReviewSchema.index({ pgId: 1, createdAt: -1 });
ReviewSchema.index({ pgId: 1, userId: 1 }, { unique: true });

export default mongoose.model<IReview>('Review', ReviewSchema);
