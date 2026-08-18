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
import mongoose from 'mongoose';

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

const ahmedabadPGs = [
  {
    name: "Nirma Residency Boys PG", address: "Near Nirma University Gate 2, SG Highway", city: "Ahmedabad",
    collegeName: "Nirma University", lat: 23.1020, lng: 72.5945, totalRooms: 20, availableRooms: 8,
    genderPreference: 'male' as const, pricePerMonth: 9500, securityDeposit: 9500, verified: true,
    amenities: ["Wi-Fi", "Mess", "Laundry", "24/7 Water", "Parking", "AC"],
  },
  {
    name: "Saffron Girls Hostel", address: "Prahlad Nagar, Near SG Highway", city: "Ahmedabad",
    collegeName: "Nirma University", lat: 23.0987, lng: 72.5900, totalRooms: 30, availableRooms: 12,
    genderPreference: 'female' as const, pricePerMonth: 11000, securityDeposit: 11000, verified: true,
    amenities: ["Wi-Fi", "Mess", "Laundry", "Security", "24/7 Water", "AC", "Gym"],
  },
  {
    name: "Royal Paying Guest", address: "Thaltej, Bodakdev Road", city: "Ahmedabad",
    collegeName: "Nirma University", lat: 23.0950, lng: 72.5980, totalRooms: 15, availableRooms: 5,
    genderPreference: 'unisex' as const, pricePerMonth: 8500, securityDeposit: 8500, verified: true,
    amenities: ["Wi-Fi", "Laundry", "Parking", "CCTV", "24/7 Water"],
  },
  {
    name: "Krishna Girls PG", address: "Bodakdev, Opposite Alpha Mall", city: "Ahmedabad",
    collegeName: "Nirma University", lat: 23.1040, lng: 72.5880, totalRooms: 25, availableRooms: 10,
    genderPreference: 'female' as const, pricePerMonth: 10500, securityDeposit: 10500, verified: true,
    amenities: ["Wi-Fi", "Mess", "AC", "CCTV", "Security", "Lift"],
  },
  {
    name: "Bodakdev Boys Hostel", address: "Bodakdev, Near GNFC Tower", city: "Ahmedabad",
    collegeName: "IIM Ahmedabad", lat: 23.0160, lng: 72.5400, totalRooms: 18, availableRooms: 7,
    genderPreference: 'male' as const, pricePerMonth: 12000, securityDeposit: 12000, verified: true,
    amenities: ["Wi-Fi", "Mess", "Gym", "24/7 Water", "AC", "Study Room"],
  },
  {
    name: "Navrangpura Elite PG", address: "Navrangpura, Near Gujarat University", city: "Ahmedabad",
    collegeName: "GJ University", lat: 23.0380, lng: 72.5490, totalRooms: 22, availableRooms: 9,
    genderPreference: 'unisex' as const, pricePerMonth: 9000, securityDeposit: 9000, verified: true,
    amenities: ["Wi-Fi", "Mess", "Lift", "Parking", "Laundry", "CCTV"],
  },
  {
    name: "Gulmohar Grand Paying Guest", address: "Vastrapur, Near Vastrapur Lake", city: "Ahmedabad",
    collegeName: "IIM Ahmedabad", lat: 23.0180, lng: 72.5420, totalRooms: 35, availableRooms: 15,
    genderPreference: 'unisex' as const, pricePerMonth: 13500, securityDeposit: 13500, verified: true,
    amenities: ["Wi-Fi", "Mess", "AC", "Gym", "Lift", "Pool Table", "Study Room"],
  },
  {
    name: "Chandkheda Comfort PG", address: "Chandkheda, Near New CG Road", city: "Ahmedabad",
    collegeName: "Nirma University", lat: 23.1180, lng: 72.5850, totalRooms: 28, availableRooms: 11,
    genderPreference: 'male' as const, pricePerMonth: 7500, securityDeposit: 7500, verified: true,
    amenities: ["Wi-Fi", "Mess", "24/7 Water", "Parking", "Laundry"],
  },
  {
    name: "SG Highway Girls Hub", address: "SG Highway, Sola Cross Roads", city: "Ahmedabad",
    collegeName: "Nirma University", lat: 23.0890, lng: 72.5990, totalRooms: 32, availableRooms: 13,
    genderPreference: 'female' as const, pricePerMonth: 10000, securityDeposit: 10000, verified: true,
    amenities: ["Wi-Fi", "Mess", "AC", "CCTV", "Security", "Gym", "Lift"],
  },
  {
    name: "New CG Road Boys PG", address: "New CG Road, Chandkheda", city: "Ahmedabad",
    collegeName: "LD Engineering College", lat: 23.0410, lng: 72.5510, totalRooms: 16, availableRooms: 0,
    genderPreference: 'male' as const, pricePerMonth: 8000, securityDeposit: 8000, verified: true,
    amenities: ["Wi-Fi", "Mess", "Laundry", "Parking"],
  },
  {
    name: "Satellite Paradise", address: "Satellite, Near ISRO", city: "Ahmedabad",
    collegeName: "GJ University", lat: 23.0300, lng: 72.5350, totalRooms: 40, availableRooms: 18,
    genderPreference: 'unisex' as const, pricePerMonth: 15000, securityDeposit: 15000, verified: true,
    amenities: ["Wi-Fi", "Mess", "AC", "Gym", "Pool", "Lift", "CCTV", "Study Room", "Laundry"],
  },
  {
    name: "Prahlad Nagar Nest", address: "Prahlad Nagar, Near Inorbit Mall", city: "Ahmedabad",
    collegeName: "Nirma University", lat: 23.0970, lng: 72.5910, totalRooms: 20, availableRooms: 3,
    genderPreference: 'unisex' as const, pricePerMonth: 9200, securityDeposit: 9200, verified: true,
    amenities: ["Wi-Fi", "Mess", "24/7 Water", "Laundry", "CCTV", "AC"],
  },
  {
    name: "Vastrapur Value PG", address: "Vastrapur, Near IIM", city: "Ahmedabad",
    collegeName: "IIM Ahmedabad", lat: 23.0130, lng: 72.5390, totalRooms: 14, availableRooms: 4,
    genderPreference: 'male' as const, pricePerMonth: 11500, securityDeposit: 11500, verified: false,
    amenities: ["Wi-Fi", "Mess", "24/7 Water", "Gym", "Laundry"],
  },
  {
    name: "Shela Green Paying Guest", address: "Shela, South Bopal Road", city: "Ahmedabad",
    collegeName: "Nirma University", lat: 23.0680, lng: 72.4950, totalRooms: 26, availableRooms: 6,
    genderPreference: 'unisex' as const, pricePerMonth: 6500, securityDeposit: 6500, verified: true,
    amenities: ["Wi-Fi", "Mess", "Parking", "24/7 Water", "Laundry"],
  },
  {
    name: "South Bopal Girls Only", address: "South Bopal, Near BRTS Stand", city: "Ahmedabad",
    collegeName: "Nirma University", lat: 23.0710, lng: 72.5030, totalRooms: 24, availableRooms: 9,
    genderPreference: 'female' as const, pricePerMonth: 7800, securityDeposit: 7800, verified: false,
    amenities: ["Wi-Fi", "Mess", "Security", "CCTV", "Lift"],
  },
];

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

  console.log('Creating PG listings...');
  const pgs = [];
  for (let i = 0; i < ahmedabadPGs.length; i++) {
    const p = ahmedabadPGs[i];
    const owner = owners[i % owners.length];
    const amenityIds = p.amenities
      .map(n => amenityByName.get(n.toLowerCase()))
      .filter(Boolean)
      .map(a => a!._id);
    const pg = await PGListing.create({
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
    pgs.push(pg);

    const imgCount = 3 + (i % 4);
    for (let k = 0; k < imgCount; k++) {
      await Image.create({
        pgId: pg._id,
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
          await NearbyPlace.create({
            pgId: pg._id,
            placeType: t,
            name: names[(i + n) % names.length],
            location: { type: 'Point', coordinates: [placeLng, placeLat] },
            distanceMeters: Math.max(50, distance),
          });
        }
      }
    }
  }

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

  await Notification.create([
    { userId: students[0]._id, type: 'booking_confirm', title: 'Booking Confirmed!', body: 'Your booking for Saffron Girls Hostel is confirmed.', isRead: false },
    { userId: students[0]._id, type: 'pg_verified', title: 'New Verified PG', body: 'Satellite Paradise has been verified and is now live!', isRead: true },
    { userId: students[1]._id, type: 'booking_request', title: 'Booking Request Received', body: 'We received your booking request at Royal Paying Guest.', isRead: false },
    { userId: ownerUserDocs[0]._id, type: 'booking_request', title: 'New Booking Request', body: 'You have a new booking request for Nirma Residency Boys PG.', isRead: false },
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
