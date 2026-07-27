import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType = 'PG_VERIFIED' | 'PG_REJECTED' | 'BOOKING_REQUEST' | 'BOOKING_CONFIRMED' | 'NEW_REVIEW' | 'COMPLAINT_RESOLVED' | 'SYSTEM';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['PG_VERIFIED', 'PG_REJECTED', 'BOOKING_REQUEST', 'BOOKING_CONFIRMED', 'NEW_REVIEW', 'COMPLAINT_RESOLVED', 'SYSTEM'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedId: { type: Schema.Types.ObjectId },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
