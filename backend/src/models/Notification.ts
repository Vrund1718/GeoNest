import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'booking_request'
  | 'booking_confirm'
  | 'booking_cancel'
  | 'pg_verified'
  | 'pg_rejected'
  | 'complaint_status'
  | 'new_review'
  | 'new_message'
  | 'payment_received'
  | 'general';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  referenceType?: 'pg' | 'booking' | 'review' | 'message' | 'complaint';
  referenceId?: mongoose.Types.ObjectId;
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'booking_request',
        'booking_confirm',
        'booking_cancel',
        'pg_verified',
        'pg_rejected',
        'complaint_status',
        'new_review',
        'new_message',
        'payment_received',
        'general',
      ],
      required: true,
      default: 'general',
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    isRead: { type: Boolean, required: true, default: false, index: true },
    referenceType: {
      type: String,
      enum: ['pg', 'booking', 'review', 'message', 'complaint'],
      required: false,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    actionUrl: {
      type: String,
      required: false,
      trim: true,
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
