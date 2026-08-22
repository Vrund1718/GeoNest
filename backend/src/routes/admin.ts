import { Router } from 'express';
import PGListing from '../models/PGListing';
import Complaint from '../models/Complaint';
import User from '../models/User';
import Booking from '../models/Booking';
import Owner from '../models/Owner';
import NearbyPlace from '../models/NearbyPlace';
import { AuthRequest, requireAuth, requireRole } from '../middleware/auth';
import { fetchAndStoreNearbyPlaces } from '../services/nearbyPlaces';
import { sendNotification } from '../utils/notifications';

const router = Router();

router.use(requireAuth, requireRole(['admin']));

router.get('/pg/pending', async (req, res) => {
  try {
    const pgs = await PGListing.find({ isVerified: false, status: 'active' })
      .populate('amenities')
      .populate({ path: 'ownerId', populate: { path: 'userId', select: 'name email phone' } })
      .sort({ createdAt: -1 });
    return res.json({ pgs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.put('/pg/:id/verify', async (req: AuthRequest, res) => {
  try {
    const { verified } = req.body;
    const pg = await PGListing.findById(req.params.id).populate<{ ownerId: any }>({
      path: 'ownerId',
      populate: { path: 'userId', select: 'name email phone' },
    });
    if (!pg) return res.status(404).json({ error: 'PG not found' });

    pg.isVerified = Boolean(verified);
    await pg.save();

    if (verified) {
      const [lng, lat] = pg.location.coordinates;
      await fetchAndStoreNearbyPlaces(pg._id, lat, lng);
    }

    const ownerUserId = (pg.ownerId as any)?.userId?._id;
    if (ownerUserId) {
      await sendNotification(
        ownerUserId,
        verified ? 'pg_verified' : 'pg_rejected',
        verified ? 'PG Verified!' : 'PG Verification Rejected',
        verified
          ? `Your PG "${pg.name}" has been verified and is now live.`
          : `Your PG "${pg.name}" was not approved. Please contact support.`,
        { type: 'pg', id: pg._id },
        verified ? `/pg/${pg._id}` : undefined
      );
    }

    return res.json({ pg });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed' });
  }
});

router.get('/complaints', async (req, res) => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    const complaints = await Complaint.find(filter)
      .populate('userId', 'name email')
      .populate('pgId', 'name city')
      .sort({ createdAt: -1 });
    return res.json({ complaints });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.put('/complaints/:id', async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    if (status && ['open', 'in_progress', 'resolved'].includes(status)) {
      const oldStatus = complaint.status;
      complaint.status = status;
      if (status === 'resolved') complaint.resolvedAt = new Date();
      await complaint.save();
      if (oldStatus !== status) {
        await sendNotification(
          complaint.userId,
          'complaint_status',
          'Complaint Status Updated',
          `Your complaint has been updated to "${status}".`,
          { type: 'complaint', id: complaint._id },
          `/student/complaints#${complaint._id}`
        );
      }
    }
    return res.json({ complaint });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { role, active } = req.query;
    const filter: any = {};
    if (role) filter.role = role;
    const users = await User.find(filter).select('-hashedPassword').sort({ createdAt: -1 });
    const bookings = await Booking.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);
    const bMap = new Map(bookings.map((b) => [b._id.toString(), b.count]));
    const result = users.map((u) => ({
      ...u.toObject(),
      bookingsCount: bMap.get(u._id.toString()) || 0,
    }));
    return res.json({ users: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPGs = await PGListing.countDocuments({ status: { $ne: 'deleted' } });
    const pendingVerifications = await PGListing.countDocuments({ isVerified: false, status: 'active' });
    const openComplaints = await Complaint.countDocuments({ status: { $in: ['open', 'in_progress'] } });
    const owners = await Owner.countDocuments();
    const students = await User.countDocuments({ role: 'student' });
    const verifiedPGs = await PGListing.countDocuments({ isVerified: true, status: 'active' });
    const pendingBookings = await Booking.countDocuments({ status: 'requested' });
    return res.json({
      metrics: {
        totalUsers,
        totalPGs,
        pendingVerifications,
        openComplaints,
        owners,
        students,
        verifiedPGs,
        pendingBookings,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

export default router;
