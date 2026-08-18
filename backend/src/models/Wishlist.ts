import mongoose, { Document, Schema } from 'mongoose';

export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId;
  pgId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WishlistSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'PGListing', required: true, index: true },
  },
  { timestamps: true }
);

WishlistSchema.index({ userId: 1, pgId: 1 }, { unique: true });

export default mongoose.model<IWishlist>('Wishlist', WishlistSchema);
