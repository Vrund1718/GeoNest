import { Router } from 'express';
import Booking from '../models/Booking';
import Wishlist from '../models/Wishlist';
import Complaint from '../models/Complaint';
import Notification from '../models/Notification';
import PGListing from '../models/PGListing';
import User from '../models/User';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { sendNotification } from '../utils/notifications';

const router = Router();

router.use(requireAuth);

router.get('/bookings/me', async (req: AuthRequest, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user!._id })
      .populate<{ pgId: any }>('pgId')
      .sort({ createdAt: -1 });
    return res.json({ bookings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.put('/bookings/:id/status', async (req: AuthRequest, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate<{ pgId: any }>('pgId');
    if (!booking) return res.status(404).json({ error: 'Not found' });
    const { status } = req.body;
    const valid = ['requested', 'confirmed', 'cancelled', 'completed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const prev = booking.status;
    booking.status = status;
    await booking.save();

    if (prev !== status) {
      const title =
        status === 'confirmed' ? 'Booking Confirmed!' :
        status === 'cancelled' ? 'Booking Cancelled' :
        status === 'completed' ? 'Booking Completed' : 'Booking Updated';
      const msg =
        status === 'confirmed'
          ? `Your booking for "${(booking.pgId as any)?.name || 'your PG'}" is confirmed!`
          : status === 'cancelled'
          ? `Your booking for "${(booking.pgId as any)?.name || 'your PG'}" has been cancelled.`
          : `Your booking status has been updated to ${status}.`;
      const notifType = status === 'confirmed' ? 'booking_confirm' : status === 'cancelled' ? 'booking_cancel' : 'general';
      await sendNotification(booking.userId, notifType as any, title, msg);
    }
    return res.json({ booking });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.get('/wishlist/me', async (req: AuthRequest, res) => {
  try {
    const entries = await Wishlist.find({ userId: req.user!._id })
      .populate('pgId')
      .sort({ createdAt: -1 });
    return res.json({ wishlist: entries });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.get('/complaints/me', async (req: AuthRequest, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.user!._id })
      .populate('pgId', 'name city')
      .sort({ createdAt: -1 });
    return res.json({ complaints });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.get('/notifications', async (req: AuthRequest, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user!._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.user!._id, isRead: false });
    return res.json({ notifications, unreadCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.put('/notifications/:id/read', async (req: AuthRequest, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Not found' });
    return res.json({ notification });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.put('/profile', async (req: AuthRequest, res) => {
  try {
    const { name, phone } = req.body;
    const u = await User.findById(req.user!._id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    if (name != null && String(name).trim().length >= 2) u.name = String(name).trim();
    if (phone != null && String(phone).trim().length >= 10) u.phone = String(phone).trim();
    await u.save();
    const safe: any = u.toObject(); delete safe.hashedPassword;
    return res.json({ user: safe });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

export default router;
