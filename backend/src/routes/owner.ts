import { Router } from 'express';
import mongoose from 'mongoose';
import Owner from '../models/Owner';
import PGListing from '../models/PGListing';
import Image from '../models/Image';
import Amenity from '../models/Amenity';
import NearbyPlace from '../models/NearbyPlace';
import Booking from '../models/Booking';
import Complaint from '../models/Complaint';
import { AuthRequest, requireAuth, requireRole } from '../middleware/auth';
import { upload, uploadImage } from '../middleware/upload';
import { fetchAndStoreNearbyPlaces } from '../services/nearbyPlaces';
import { sendNotification } from '../utils/notifications';

const router = Router();

router.use(requireAuth, requireRole(['owner', 'admin']));

const getOwnerForUser = async (userId: mongoose.Types.ObjectId, role: string) => {
  if (role === 'admin') {
    const o = await Owner.findOne();
    return o;
  }
  return Owner.findOne({ userId });
};

router.post('/pg', async (req: AuthRequest, res) => {
  try {
    const owner = await getOwnerForUser(req.user!._id, req.user!.role);
    if (!owner) return res.status(400).json({ error: 'Owner profile not found' });

    const b = req.body;
    const amenityIds = await Promise.all(
      (b.amenities || []).map(async (name: string) => {
        const clean = String(name).trim();
        if (!clean) return null;
        let a = await Amenity.findOne({ name: { $regex: new RegExp(`^${clean}$`, 'i') } });
        if (!a) {
          a = await Amenity.create({ name: clean, category: 'other' });
        }
        return a._id;
      })
    ).then((arr) => arr.filter(Boolean) as mongoose.Types.ObjectId[]);

    const pg = await PGListing.create({
      ownerId: owner._id,
      name: b.name,
      address: b.address,
      city: b.city,
      collegeName: b.collegeName,
      location: b.location || { type: 'Point', coordinates: [72.5714, 23.0225] },
      totalRooms: b.totalRooms,
      availableRooms: b.availableRooms ?? b.totalRooms,
      genderPreference: b.genderPreference,
      pricePerMonth: b.pricePerMonth,
      securityDeposit: b.securityDeposit ?? 0,
      amenities: amenityIds,
    });

    return res.status(201).json({ pg });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to create PG' });
  }
});

router.get('/pg', async (req: AuthRequest, res) => {
  try {
    const owner = await getOwnerForUser(req.user!._id, req.user!.role);
    if (!owner) return res.json({ pgs: [] });
    const filter: any = { ownerId: owner._id, status: { $ne: 'deleted' } };
    const pgs = await PGListing.find(filter).sort({ createdAt: -1 }).populate('amenities');
    const counts = await Image.aggregate([
      { $match: { pgId: { $in: pgs.map((p) => p._id) } } },
      { $group: { _id: '$pgId', count: { $sum: 1 }, primary: { $first: { $cond: ['$isPrimary', '$url', null] } } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c]));
    return res.json({
      pgs: pgs.map((p) => ({
        ...p.toObject(),
        imageCount: countMap.get(p._id.toString())?.count || 0,
        primaryImage: countMap.get(p._id.toString())?.primary || null,
      })),
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to list PGs' });
  }
});

router.get('/pg/:id', async (req: AuthRequest, res) => {
  try {
    const owner = await getOwnerForUser(req.user!._id, req.user!.role);
    const pg = await PGListing.findById(req.params.id).populate('amenities');
    if (!pg) return res.status(404).json({ error: 'PG not found' });
    if (req.user!.role !== 'admin' && String(pg.ownerId) !== String(owner?._id)) {
      return res.status(403).json({ error: 'Not the owner' });
    }
    const images = await Image.find({ pgId: pg._id }).sort({ isPrimary: -1, createdAt: -1 });
    return res.json({ pg, images });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to get PG' });
  }
});

router.put('/pg/:id', async (req: AuthRequest, res) => {
  try {
    const owner = await getOwnerForUser(req.user!._id, req.user!.role);
    const pg = await PGListing.findById(req.params.id);
    if (!pg) return res.status(404).json({ error: 'PG not found' });
    if (req.user!.role !== 'admin' && String(pg.ownerId) !== String(owner?._id)) {
      return res.status(403).json({ error: 'Not the owner' });
    }
    const b = req.body;
    if (b.name != null) pg.name = b.name;
    if (b.address != null) pg.address = b.address;
    if (b.city != null) pg.city = b.city;
    if (b.collegeName !== undefined) pg.collegeName = b.collegeName;
    if (b.location != null) pg.location = b.location;
    if (b.totalRooms != null) pg.totalRooms = b.totalRooms;
    if (b.availableRooms != null) pg.availableRooms = b.availableRooms;
    if (b.genderPreference != null) pg.genderPreference = b.genderPreference;
    if (b.pricePerMonth != null) pg.pricePerMonth = b.pricePerMonth;
    if (b.securityDeposit != null) pg.securityDeposit = b.securityDeposit;
    if (b.amenities) {
      const amenityIds = await Promise.all(
        (b.amenities || []).map(async (name: string) => {
          const clean = String(name).trim();
          if (!clean) return null;
          let a = await Amenity.findOne({ name: { $regex: new RegExp(`^${clean}$`, 'i') } });
          if (!a) a = await Amenity.create({ name: clean, category: 'other' });
          return a._id;
        })
      ).then((arr) => arr.filter(Boolean) as mongoose.Types.ObjectId[]);
      pg.amenities = amenityIds;
    }
    if (b.status != null) pg.status = b.status;
    await pg.save();
    await pg.populate('amenities');
    return res.json({ pg });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to update PG' });
  }
});

router.delete('/pg/:id', async (req: AuthRequest, res) => {
  try {
    const owner = await getOwnerForUser(req.user!._id, req.user!.role);
    const pg = await PGListing.findById(req.params.id);
    if (!pg) return res.status(404).json({ error: 'PG not found' });
    if (req.user!.role !== 'admin' && String(pg.ownerId) !== String(owner?._id)) {
      return res.status(403).json({ error: 'Not the owner' });
    }
    pg.status = 'deleted';
    await pg.save();
    return res.json({ message: 'PG soft-deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete PG' });
  }
});

router.post('/pg/:id/images', upload.array('images', 10), async (req: AuthRequest, res) => {
  try {
    const owner = await getOwnerForUser(req.user!._id, req.user!.role);
    const pg = await PGListing.findById(req.params.id);
    if (!pg) return res.status(404).json({ error: 'PG not found' });
    if (req.user!.role !== 'admin' && String(pg.ownerId) !== String(owner?._id)) {
      return res.status(403).json({ error: 'Not the owner' });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const existing = await Image.countDocuments({ pgId: pg._id });
    const created: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const { url } = await uploadImage(files[i].path);
      const isPrimary = existing === 0 && i === 0;
      const img = await Image.create({
        pgId: pg._id,
        url,
        isPrimary,
        uploadedBy: req.user!._id,
      });
      created.push(img);
    }
    return res.status(201).json({ images: created });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

router.get('/bookings', async (req: AuthRequest, res) => {
  try {
    const owner = await getOwnerForUser(req.user!._id, req.user!.role);
    if (!owner) return res.json({ bookings: [] });
    const pgs = await PGListing.find({ ownerId: owner._id }, '_id');
    const bookings = await Booking.find({ pgId: { $in: pgs.map((p) => p._id) } })
      .populate('pgId', 'name city')
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    return res.json({ bookings });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.put('/bookings/:id/status', async (req: AuthRequest, res) => {
  try {
    const owner = await getOwnerForUser(req.user!._id, req.user!.role);
    const booking = await Booking.findById(req.params.id).populate<{ pgId: any }>('pgId');
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (req.user!.role !== 'admin' && String((booking.pgId as any)?.ownerId) !== String(owner?._id)) {
      return res.status(403).json({ error: 'Not your PG' });
    }
    const { status } = req.body;
    if (!['requested', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const prev = booking.status;
    booking.status = status;
    await booking.save();
    if (prev !== status) {
      const title = status === 'confirmed' ? 'Booking Confirmed!' :
        status === 'cancelled' ? 'Booking Cancelled' :
        status === 'completed' ? 'Booking Completed' : 'Booking Updated';
      const msg = status === 'confirmed'
        ? `Your booking for "${(booking.pgId as any)?.name || 'your PG'}" is confirmed!`
        : status === 'cancelled'
        ? `Your booking for "${(booking.pgId as any)?.name || 'your PG'}" has been cancelled.`
        : `Your booking status is now ${status}.`;
      const notifType = status === 'confirmed' ? 'booking_confirm' : status === 'cancelled' ? 'booking_cancel' : 'general';
      await sendNotification(booking.userId, notifType as any, title, msg);
    }
    return res.json({ booking });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

router.get('/complaints', async (req: AuthRequest, res) => {
  try {
    const owner = await getOwnerForUser(req.user!._id, req.user!.role);
    if (!owner) return res.json({ complaints: [] });
    const pgs = await PGListing.find({ ownerId: owner._id }, '_id');
    const complaints = await Complaint.find({ pgId: { $in: pgs.map((p) => p._id) } })
      .populate('pgId', 'name city')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    return res.json({ complaints });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed' });
  }
});

export default router;
