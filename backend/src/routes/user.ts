import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { normalizeIndianPhone } from '../utils/phone';
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

router.get('/active-bookings', async (req: AuthRequest, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user!._id, status: 'confirmed' })
      .populate('pgId', 'name city address pricePerMonth primaryImage')
      .sort({ createdAt: -1 });
    return res.json({ bookings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.get('/bookings/:id/cancellation-preview', async (req: AuthRequest, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, userId: req.user!._id }).populate<{ pgId: any }>('pgId');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const pg = booking.pgId as any;
    const now = new Date();
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const pricePerMonth = pg?.pricePerMonth || 0;
    const dailyRate = Math.round((pricePerMonth / 30) * 100) / 100;

    if (booking.status === 'requested') {
      return res.json({
        preview: {
          bookingId: booking._id,
          pgName: pg?.name || 'PG',
          cancellationDate: now,
          startDate: start,
          endDate: end,
          totalDays,
          daysUtilized: 0,
          dailyRate,
          totalStayCost: 0,
          securityDeposit: 0,
          totalPaid: 0,
          usageCharge: 0,
          cancellationCharge: 0,
          securityDepositRefund: 0,
          netRefundAmount: 0,
          policyNote: 'Booking request was not yet confirmed or paid. No cancellation charges apply.'
        }
      });
    }

    const totalStayCost = dailyRate * totalDays;
    const securityDeposit = pg?.securityDeposit || 0;
    const totalPaid = totalStayCost + securityDeposit;

    let daysUtilized = 0;
    if (now < start) {
      daysUtilized = 0;
    } else if (now > end) {
      daysUtilized = totalDays;
    } else {
      daysUtilized = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const usageCharge = Math.round(daysUtilized * dailyRate);
    const unutilizedCost = Math.max(0, totalStayCost - usageCharge);
    const cancellationCharge = daysUtilized === 0
      ? Math.max(200, Math.round(totalStayCost * 0.10))
      : Math.max(200, Math.round(unutilizedCost * 0.10));

    const securityDepositRefund = securityDeposit;
    const netRefundAmount = Math.max(0, totalPaid - usageCharge - cancellationCharge);

    return res.json({
      preview: {
        bookingId: booking._id,
        pgName: pg?.name || 'PG',
        cancellationDate: now,
        startDate: start,
        endDate: end,
        totalDays,
        daysUtilized,
        dailyRate,
        totalStayCost,
        securityDeposit,
        totalPaid,
        usageCharge,
        cancellationCharge,
        securityDepositRefund,
        netRefundAmount,
        policyNote: '10% cancellation charge applies to unutilized stay period. Days used are charged at standard daily rate.'
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to calculate cancellation charges' });
  }
});

router.put('/bookings/:id/status', async (req: AuthRequest, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate<{ pgId: any }>('pgId');
    if (!booking) return res.status(404).json({ error: 'Not found' });

    // Enforce ownership: student can only manage their own booking
    if (String(booking.userId) !== String(req.user!._id)) {
      return res.status(403).json({ error: 'Access denied: not your booking' });
    }

    const { status } = req.body;
    // Students can only cancel their own bookings. Confirming or completing is strictly owner/admin action.
    if (status !== 'cancelled') {
      return res.status(403).json({ error: 'Students can only cancel their bookings' });
    }

    const prev = booking.status;
    if (prev === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    booking.status = 'cancelled';

    if (prev === 'confirmed') {
      const pg = booking.pgId as any;
      const now = new Date();
      const start = new Date(booking.startDate);
      const end = new Date(booking.endDate);
      const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const pricePerMonth = pg?.pricePerMonth || 0;
      const dailyRate = Math.round((pricePerMonth / 30) * 100) / 100;
      const totalStayCost = dailyRate * totalDays;
      const securityDeposit = pg?.securityDeposit || 0;
      const totalPaid = totalStayCost + securityDeposit;

      let daysUtilized = 0;
      if (now < start) {
        daysUtilized = 0;
      } else if (now > end) {
        daysUtilized = totalDays;
      } else {
        daysUtilized = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }

      const usageCharge = Math.round(daysUtilized * dailyRate);
      const unutilizedCost = Math.max(0, totalStayCost - usageCharge);
      const cancellationCharge = daysUtilized === 0
        ? Math.max(200, Math.round(totalStayCost * 0.10))
        : Math.max(200, Math.round(unutilizedCost * 0.10));

      const securityDepositRefund = securityDeposit;
      const netRefundAmount = Math.max(0, totalPaid - usageCharge - cancellationCharge);

      booking.cancellationDetails = {
        cancellationDate: now,
        daysUtilized,
        usageCharge,
        cancellationCharge,
        securityDepositRefund,
        netRefundAmount
      };

      // Release room back to inventory
      if (pg?._id) {
        await PGListing.findByIdAndUpdate(pg._id, { $inc: { availableRooms: 1 } });
      }
    } else {
      booking.cancellationDetails = {
        cancellationDate: new Date(),
        daysUtilized: 0,
        usageCharge: 0,
        cancellationCharge: 0,
        securityDepositRefund: 0,
        netRefundAmount: 0
      };
    }

    await booking.save();

    await sendNotification(
      booking.userId,
      'booking_cancel',
      'Booking Cancelled',
      `Your booking for "${(booking.pgId as any)?.name || 'your PG'}" has been cancelled.`,
      { type: 'booking', id: booking._id },
      `/student/bookings#${booking._id}`
    );

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
    const bookingFilter: any = { 
      userId: req.user!._id, 
      status: 'confirmed' 
    };
    if (pgId) {
      bookingFilter.pgId = pgId;
    }

    const booking = await Booking.findOne(bookingFilter);
    
    if (!booking) {
      return res.status(403).json({ error: 'You can only file a complaint if you have an active PG booking.' });
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

router.put('/notifications/mark-all-read', async (req: AuthRequest, res) => {
  try {
    await Notification.updateMany({ userId: req.user!._id, isRead: false }, { isRead: true });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to mark all notifications as read' });
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
    const { name, phone, phoneVerificationToken } = req.body;
    const u = await User.findById(req.user!._id);
    if (!u) return res.status(404).json({ error: 'Not found' });
    if (name != null && String(name).trim().length >= 2) u.name = String(name).trim();

    if (phone != null && String(phone).trim() !== u.phone) {
      const cleanPhone = String(phone).trim();
      const normPhone = normalizeIndianPhone(cleanPhone);
      if (!normPhone) {
        return res.status(400).json({ error: 'Invalid phone format. Must be a valid 10-digit Indian number.' });
      }
      if (!phoneVerificationToken) {
        return res.status(400).json({ error: 'Changing phone number requires OTP verification.' });
      }
      try {
        const decoded = jwt.verify(phoneVerificationToken, config.otpTokenSecret) as any;
        if (!decoded.verified || decoded.phone !== normPhone) {
          return res.status(400).json({ error: 'Phone verification token is invalid or does not match phone number.' });
        }
        u.phone = normPhone;
      } catch {
        return res.status(400).json({ error: 'Invalid or expired phone verification token.' });
      }
    }

    await u.save();
    const safe: any = u.toObject(); delete safe.hashedPassword;
    return res.json({ user: safe });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

export default router;
