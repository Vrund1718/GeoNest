import mongoose, { Document, Schema } from 'mongoose';

export type BookingStatus = 'requested' | 'confirmed' | 'cancelled' | 'completed';

export interface IBooking extends Document {
  pgId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: BookingStatus;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema: Schema = new Schema(
  {
    pgId: { type: Schema.Types.ObjectId, ref: 'PGListing', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['requested', 'confirmed', 'cancelled', 'completed'],
      required: true,
      default: 'requested',
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IBooking>('Booking', BookingSchema);
