import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db';
import User from '../models/User';
import Owner from '../models/Owner';
import PGListing from '../models/PGListing';
import Amenity from '../models/Amenity';
import Image from '../models/Image';
import Review from '../models/Review';
import Booking from '../models/Booking';
import Wishlist from '../models/Wishlist';
import Complaint from '../models/Complaint';
import Notification from '../models/Notification';
import NearbyPlace from '../models/NearbyPlace';
import Payment from '../models/Payment';
import mongoose from 'mongoose';
import ahmedabadPGsRaw from './ahmedabad_pgs.json';

const sampleImages = [
  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&auto=format&fit=crop',
];

const ahmedabadPGs = ahmedabadPGsRaw.map(pg => ({
  ...pg,
  genderPreference: pg.genderPreference as 'male' | 'female' | 'unisex'
}));


const nearbyPlaceTypes = ['hospital', 'atm', 'gym', 'restaurant', 'medical_store', 'bus_stop', 'metro_station', 'police'] as const;
const nearbyNames: Record<string, string[]> = {
  hospital: ['Shalby Hospital', 'Zydus Hospital', 'Apollo Hospital', 'Civil Hospital'],
  atm: ['HDFC Bank ATM', 'ICICI ATM', 'SBI ATM', 'Axis Bank ATM'],
  gym: ['Gold Gym', 'FitZone Fitness', 'CultFit', 'Anytime Fitness'],
  restaurant: ['Vadilal Food Zone', 'Honest Restaurant', 'Ras Restaurant', 'Bansi Dharshini'],
  medical_store: ['Apollo Pharmacy', 'MedPlus Pharmacy', 'Wellness Forever', 'Aster Pharmacy'],
  bus_stop: ['SG Highway Bus Stop', 'Prahlad Nagar Bus Stop', 'Vastrapur Bus Stand', 'Sola BRTS'],
  metro_station: ['Shyamal Metro Station', 'Thaltej Metro Station', 'AEC Metro Station', 'Guru Tegh Bahadur Nagar'],
  police: ['Bodakdev Police Station', 'Prahlad Nagar Police Booth', 'Vastrapur Police', 'Satellite Police Station'],
};

const seed = async () => {
  await connectDB();

  console.log('Wiping existing collections...');
  await User.deleteMany({});
  await Owner.deleteMany({});
  await PGListing.deleteMany({});
  await Amenity.deleteMany({});
  await Image.deleteMany({});
  await Review.deleteMany({});
  await Booking.deleteMany({});
  await Wishlist.deleteMany({});
  await Complaint.deleteMany({});
  await Notification.deleteMany({});
  await NearbyPlace.deleteMany({});

  const pwHash = await bcrypt.hash('StrongPass1', 10);

  console.log('Creating users...');
  const admin = await User.create({ name: 'SmartPG Admin', email: 'admin@smartpg.local', phone: '+919876543210', hashedPassword: pwHash, role: 'admin' });

  const ownerUsers = [
    { name: 'Rajesh Patel', email: 'rajesh@smartpg.local', phone: '+919876543201' },
    { name: 'Priya Shah', email: 'priya@smartpg.local', phone: '+919876543202' },
    { name: 'Ajay Mehta', email: 'ajay@smartpg.local', phone: '+919876543203' },
  ];
  const ownerUserDocs = await User.create(ownerUsers.map(u => ({ ...u, hashedPassword: pwHash, role: 'owner' })));
  const owners = await Owner.create(ownerUserDocs.map(u => ({ userId: u._id, verificationStatus: 'verified' as const, govIdUrl: 'https://example.com/govid.png' })));

  const studentUsers = [
    { name: 'Aarav Sharma', email: 'aarav@smartpg.local', phone: '+919876543211' },
    { name: 'Diya Verma', email: 'diya@smartpg.local', phone: '+919876543212' },
    { name: 'Aditya Kumar', email: 'aditya@smartpg.local', phone: '+919876543213' },
    { name: 'Sneha Gupta', email: 'sneha@smartpg.local', phone: '+919876543214' },
    { name: 'Rohan Desai', email: 'rohan@smartpg.local', phone: '+919876543215' },
    { name: 'Neha Singh', email: 'neha@smartpg.local', phone: '+919876543216' },
  ];
  const students = await User.create(studentUsers.map(u => ({ ...u, hashedPassword: pwHash, role: 'student' })));

  console.log('Creating amenities...');
  const amenityDefs = [
    { name: 'Wi-Fi', category: 'common' as const },
    { name: 'Mess', category: 'kitchen' as const },
    { name: 'Laundry', category: 'common' as const },
    { name: '24/7 Water', category: 'washroom' as const },
    { name: 'AC', category: 'room' as const },
    { name: 'Parking', category: 'common' as const },
    { name: 'Gym', category: 'common' as const },
    { name: 'CCTV', category: 'security' as const },
    { name: 'Security', category: 'security' as const },
    { name: 'Lift', category: 'common' as const },
    { name: 'Study Room', category: 'common' as const },
    { name: 'Pool Table', category: 'common' as const },
    { name: 'Pool', category: 'common' as const },
    { name: 'Non-AC Cooler', category: 'room' as const },
  ];
  const amenityDocs = await Amenity.create(amenityDefs);
  const amenityByName = new Map(amenityDocs.map(a => [a.name.toLowerCase(), a]));

  console.log('Creating PG listings (building bulk operations)...');
  const pgsToInsert: any[] = [];
  const imagesToInsert: any[] = [];
  const nearbyPlacesToInsert: any[] = [];

  for (let i = 0; i < ahmedabadPGs.length; i++) {
    const p = ahmedabadPGs[i];
    const owner = owners[i % owners.length];
    const amenityIds = p.amenities
      .map(n => amenityByName.get(n.toLowerCase()))
      .filter(Boolean)
      .map(a => a!._id);

    const pgId = new mongoose.Types.ObjectId();

    pgsToInsert.push({
      _id: pgId,
      ownerId: owner._id,
      name: p.name,
      address: p.address,
      city: p.city,
      collegeName: p.collegeName,
      location: { type: 'Point', coordinates: [p.lng, p.lat] },
      totalRooms: p.totalRooms,
      availableRooms: p.availableRooms,
      genderPreference: p.genderPreference,
      pricePerMonth: p.pricePerMonth,
      securityDeposit: p.securityDeposit,
      isVerified: p.verified,
      status: 'active',
      amenities: amenityIds,
    });

    const imgCount = 3 + (i % 4);
    for (let k = 0; k < imgCount; k++) {
      imagesToInsert.push({
        pgId: pgId,
        url: sampleImages[(i + k) % sampleImages.length],
        isPrimary: k === 0,
        uploadedBy: admin._id,
      });
    }

    if (p.verified) {
      for (let tIdx = 0; tIdx < nearbyPlaceTypes.length; tIdx++) {
        const t = nearbyPlaceTypes[tIdx];
        const names = nearbyNames[t] || [];
        for (let n = 0; n < 2; n++) {
          const offLat = (Math.sin(i + tIdx * 2 + n) * 0.007);
          const offLng = (Math.cos(i + tIdx * 2 + n) * 0.007);
          const placeLat = p.lat + offLat;
          const placeLng = p.lng + offLng;
          const dx = (placeLng - p.lng) * 111000 * Math.cos(p.lat * Math.PI / 180);
          const dy = (placeLat - p.lat) * 111000;
          const distance = Math.round(Math.sqrt(dx * dx + dy * dy));
          nearbyPlacesToInsert.push({
            pgId: pgId,
            placeType: t,
            name: names[(i + n) % names.length],
            location: { type: 'Point', coordinates: [placeLng, placeLat] },
            distanceMeters: Math.max(50, distance),
          });
        }
      }
    }
  }

  console.log(`Inserting ${pgsToInsert.length} PG listings in bulk...`);
  const pgs = await PGListing.insertMany(pgsToInsert);

  console.log(`Inserting ${imagesToInsert.length} images in bulk...`);
  await Image.insertMany(imagesToInsert);

  console.log(`Inserting ${nearbyPlacesToInsert.length} nearby places in bulk...`);
  await NearbyPlace.insertMany(nearbyPlacesToInsert);


  console.log('Creating reviews, bookings, wishlist, complaints...');
  const reviewTexts = [
    'Great PG with good mess and Wi-Fi. Host is very supportive.',
    'Nice location, close to college. Amenities are well maintained.',
    'Value for money. Clean rooms and friendly staff.',
    'Highly recommended for students. Security is top-notch.',
    'Decent stay, laundry service is prompt.',
    'Good atmosphere, study room is a plus.',
    'AC works well, electricity backup is there.',
    'Worth the price, would stay again.',
  ];
  for (let i = 0; i < 25; i++) {
    const pg = pgs[i % pgs.length];
    const user = students[i % students.length];
    const exists = await Review.findOne({ pgId: pg._id, userId: user._id });
    if (exists) continue;
    await Review.create({
      pgId: pg._id,
      userId: user._id,
      rating: 3 + (i % 3),
      text: reviewTexts[i % reviewTexts.length],
      sentimentScore: null,
      isFlaggedFake: null,
    });
  }

  for (let i = 0; i < 12; i++) {
    const pg = pgs[i % pgs.length];
    const user = students[(i + 1) % students.length];
    const start = new Date();
    start.setDate(start.getDate() + (i % 10));
    const end = new Date(start);
    end.setMonth(end.getMonth() + 3 + (i % 3));
    const statuses: any = ['requested', 'confirmed', 'confirmed', 'completed', 'cancelled', 'requested'];
    await Booking.create({
      pgId: pg._id,
      userId: user._id,
      status: statuses[i % statuses.length],
      startDate: start,
      endDate: end,
      renewalHistory: [],
    });
  }

  // Create some mock payments
  const confirmedBookings = await Booking.find({ status: 'confirmed' });
  for (const b of confirmedBookings) {
    await Payment.create({
      bookingId: b._id,
      userId: b.userId,
      amount: 9500,
      status: 'success',
      paymentMethod: 'UPI',
      transactionId: 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    });
  }

  for (let i = 0; i < 15; i++) {
    const pg = pgs[(i * 2) % pgs.length];
    const user = students[i % students.length];
    await Wishlist.updateOne(
      { userId: user._id, pgId: pg._id },
      { $setOnInsert: { userId: user._id, pgId: pg._id } },
      { upsert: true }
    );
  }

  const complaintTypes = ['hygiene', 'noise', 'safety', 'staff', 'amenity', 'other'] as const;
  const complaintStatuses = ['open', 'in_progress', 'resolved'] as const;
  const complaintTexts = [
    'Rooms are not cleaned on a regular basis.',
    'Neighbours are noisy late at night.',
    'Main door lock is not working properly.',
    'Mess staff is unprofessional.',
    'Wi-Fi has been down for 3 days.',
  ];
  for (let i = 0; i < 5; i++) {
    const pg = pgs[i % pgs.length];
    const user = students[i % students.length];
    const status = complaintStatuses[i % complaintStatuses.length];
    const comp = await Complaint.create({
      userId: user._id,
      pgId: pg._id,
      type: complaintTypes[i % complaintTypes.length],
      description: complaintTexts[i % complaintTexts.length],
      status,
      resolvedAt: status === 'resolved' ? new Date() : undefined,
    });
    if (status !== 'open') {
      await Notification.create({
        userId: user._id,
        type: 'complaint_status',
        title: 'Complaint Status Updated',
        body: `Your complaint #${comp._id.toString().slice(-6)} is now "${status}".`,
        isRead: i % 2 === 0,
      });
    }
  }

  const saffron = pgs.find(p => p.name === 'Saffron Girls Hostel');
  const satellite = pgs.find(p => p.name === 'Satellite Paradise');
  const royal = pgs.find(p => p.name === 'Royal Paying Guest');
  const nirma = pgs.find(p => p.name === 'Nirma Residency Boys PG');

  await Notification.create([
    { 
      userId: students[0]._id, 
      type: 'booking_confirm', 
      title: 'Booking Confirmed!', 
      body: 'Your booking for Saffron Girls Hostel is confirmed.', 
      isRead: false,
      referenceType: 'pg',
      referenceId: saffron?._id,
      actionUrl: saffron ? `/pg/${saffron._id}` : undefined
    },
    { 
      userId: students[0]._id, 
      type: 'pg_verified', 
      title: 'New Verified PG', 
      body: 'Satellite Paradise has been verified and is now live!', 
      isRead: true,
      referenceType: 'pg',
      referenceId: satellite?._id,
      actionUrl: satellite ? `/pg/${satellite._id}` : undefined
    },
    { 
      userId: students[1]._id, 
      type: 'booking_request', 
      title: 'Booking Request Received', 
      body: 'We received your booking request at Royal Paying Guest.', 
      isRead: false,
      referenceType: 'pg',
      referenceId: royal?._id,
      actionUrl: royal ? `/pg/${royal._id}` : undefined
    },
    { 
      userId: ownerUserDocs[0]._id, 
      type: 'booking_request', 
      title: 'New Booking Request', 
      body: 'You have a new booking request for Nirma Residency Boys PG.', 
      isRead: false,
      referenceType: 'pg',
      referenceId: nirma?._id,
      actionUrl: nirma ? `/pg/${nirma._id}` : undefined
    },
  ]);

  console.log('Seed complete.');
  console.log('  Admin:', admin.email, '/ StrongPass1');
  console.log('  Owners:', ownerUsers.map(o => o.email).join(', '), '/ StrongPass1');
  console.log('  Students:', studentUsers.map(s => s.email).join(', '), '/ StrongPass1');
  console.log('  PG listings:', pgs.length);

  await disconnectDB();
};

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
