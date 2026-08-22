import { Router } from 'express';
import Booking from '../models/Booking';
import Wishlist from '../models/Wishlist';
import Complaint from '../models/Complaint';
import Notification from '../models/Notification';
import PGListing from '../models/PGListing';
import User from '../models/User';
import Payment from '../models/Payment';
import { AuthRequest, requireAuth } from '../middleware/auth';
import { sendNotification } from '../utils/notifications';

const router = Router();

router.use(requireAuth);

router.get('/my-pg', async (req: AuthRequest, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user!._id, status: { $in: ['confirmed', 'completed'] } })
      .populate({
        path: 'pgId',
        populate: { path: 'ownerId', populate: { path: 'userId', select: 'name email phone' } }
      })
      .sort({ createdAt: -1 });
    
    // Also fetch payments for these bookings
    const bookingIds = bookings.map(b => b._id);
    const payments = await Payment.find({ bookingId: { $in: bookingIds } }).sort({ createdAt: -1 });

    return res.json({ bookings, payments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.post('/bookings/:id/renew', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user!._id });
    
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'confirmed') return res.status(400).json({ error: 'Can only renew confirmed bookings' });

    // Check for pending renewal
    const pending = booking.renewalHistory.find(r => r.status === 'pending');
    if (pending) return res.status(400).json({ error: 'A renewal request is already pending' });

    booking.renewalHistory.push({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'pending',
      createdAt: new Date()
    });

    await booking.save();

    // Notify owner
    const pg = await PGListing.findById(booking.pgId).populate<{ ownerId: any }>('ownerId');
    const ownerUserId = pg?.ownerId?.userId;
    if (ownerUserId) {
      await sendNotification(
        ownerUserId,
        'general',
        'Renewal Request',
        `${req.user!.name} has requested a stay extension for "${pg!.name}".`,
        { type: 'booking', id: booking._id },
        `/owner/bookings#${booking._id}`
      );
    }

    return res.json({ booking });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.post('/bookings/:id/pay', async (req: AuthRequest, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user!._id });
    
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Mock payment processing
    const payment = await Payment.create({
      bookingId: booking._id,
      userId: req.user!._id,
      amount,
      status: 'success',
      paymentMethod,
      transactionId: 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      receiptUrl: 'https://example.com/receipt.pdf'
    });

    // Notify student + owner
    await sendNotification(
      req.user!._id,
      'payment_received',
      'Payment Successful',
      `Your payment of ₹${amount} was successful.`,
      { type: 'booking', id: booking._id },
      `/student/my-pg`
    );

    const pg = await PGListing.findById(booking.pgId).populate<{ ownerId: any }>('ownerId');
    const ownerUserId = pg?.ownerId?.userId;
    if (ownerUserId) {
      await sendNotification(
        ownerUserId,
        'payment_received',
        'Payment Received',
        `Received ₹${amount} from ${req.user!.name} for "${pg!.name}".`,
        { type: 'booking', id: booking._id },
        `/owner/bookings#${booking._id}`
      );
    }

    return res.status(201).json({ payment });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

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
      await sendNotification(
        booking.userId,
        notifType as any,
        title,
        msg,
        { type: 'booking', id: booking._id },
        `/student/bookings#${booking._id}`
      );
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

router.post('/complaints', async (req: AuthRequest, res) => {
  try {
    const { pgId, type, description, priority, photoUrls } = req.body;
    
    // Check for active booking
    const booking = await Booking.findOne({ 
      userId: req.user!._id, 
      pgId, 
      status: 'confirmed' 
    });
    
    if (!booking) {
      return res.status(403).json({ error: 'You must have an active booking to file a complaint' });
    }

    const complaint = await Complaint.create({
      userId: req.user!._id,
      pgId,
      type,
      description,
      priority: priority || 'medium',
      photoUrls: photoUrls || [],
      status: 'open',
    });

    // Notify owner
    const pg = await PGListing.findById(pgId).populate<{ ownerId: any }>('ownerId');
    const ownerUserId = pg?.ownerId?.userId;
    if (ownerUserId) {
      await sendNotification(
        ownerUserId,
        'complaint_status',
        'New Complaint Filed',
        `${req.user!.name} raised a ${priority || 'medium'} priority complaint for "${pg!.name}".`,
        { type: 'complaint', id: complaint._id },
        `/owner/complaints#${complaint._id}`
      );
    }

    return res.status(201).json({ complaint });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to file complaint' });
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
