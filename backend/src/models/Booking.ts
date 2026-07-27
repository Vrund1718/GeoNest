import mongoose, { Schema, Document, Types } from 'mongoose';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface IBooking extends Document {
  pgListingId: Types.ObjectId;
  userId: Types.ObjectId;
  ownerId: Types.ObjectId;
  moveInDate: Date;
  moveOutDate?: Date;
  sharingType?: number;
  amount: number;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema: Schema = new Schema(
  {
    pgListingId: { type: Schema.Types.ObjectId, ref: 'PGListing', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'Owner', required: true },
    moveInDate: { type: Date, required: true },
    moveOutDate: { type: Date },
    sharingType: { type: Number },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
      required: true,
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

BookingSchema.index({ pgListingId: 1, status: 1 });
BookingSchema.index({ userId: 1, status: 1 });

export default mongoose.model<IBooking>('Booking', BookingSchema);
