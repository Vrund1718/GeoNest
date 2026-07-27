import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReview extends Document {
  pgListingId: Types.ObjectId;
  userId: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema(
  {
    pgListingId: { type: Schema.Types.ObjectId, ref: 'PGListing', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true }
);

ReviewSchema.index({ pgListingId: 1, rating: 1 });
ReviewSchema.index({ pgListingId: 1, userId: 1 }, { unique: true });

export default mongoose.model<IReview>('Review', ReviewSchema);
