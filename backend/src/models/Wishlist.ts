import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWishlist extends Document {
  userId: Types.ObjectId;
  pgListingId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WishlistSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pgListingId: { type: Schema.Types.ObjectId, ref: 'PGListing', required: true },
  },
  { timestamps: true }
);

WishlistSchema.index({ userId: 1, pgListingId: 1 }, { unique: true });

export default mongoose.model<IWishlist>('Wishlist', WishlistSchema);
