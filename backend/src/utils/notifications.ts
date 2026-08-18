import mongoose from 'mongoose';
import Notification, { NotificationType, INotification } from '../models/Notification';

export const sendNotification = async (
  userId: string | mongoose.Types.ObjectId,
  type: NotificationType,
  title: string,
  body: string
): Promise<INotification | null> => {
  try {
    const notif = await Notification.create({
      userId,
      type,
      title,
      body,
      isRead: false,
    });
    return notif;
  } catch (err) {
    console.error('Notification create failed:', err);
    return null;
  }
};
