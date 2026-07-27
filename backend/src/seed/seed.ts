import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import User from '../models/User';
import Owner from '../models/Owner';
import PGListing from '../models/PGListing';
import Amenity from '../models/Amenity';
import Image from '../models/Image';
import { hashPassword } from '../utils/password';

const AMENITY_CATALOG = [
  { name: 'Wi-Fi', category: 'CONNECTIVITY', iconKey: 'wifi' },
  { name: 'Attached Bathroom', category: 'LIFESTYLE', iconKey: 'bath' },
  { name: '24/7 Power Backup', category: 'SAFETY', iconKey: 'power' },
  { name: 'Laundry Service', category: 'LAUNDRY', iconKey: 'laundry' },
  { name: 'RO Drinking Water', category: 'FOOD', iconKey: 'water' },
  { name: 'CCTV Surveillance', category: 'SAFETY', iconKey: 'cctv' },
  { name: 'Daily Housekeeping', category: 'LAUNDRY', iconKey: 'housekeeping' },
  { name: 'Mess / Tiffin Included', category: 'FOOD', iconKey: 'food' },
  { name: 'Air Conditioning', category: 'LIFESTYLE', iconKey: 'ac' },
  { name: 'Two-Wheeler Parking', category: 'OTHER', iconKey: 'parking' },
  { name: 'Security Guard', category: 'SAFETY', iconKey: 'safety' },
  { name: 'Private Lockers', category: 'SAFETY', iconKey: 'lock' },
  { name: 'Refrigerator Access', category: 'FOOD', iconKey: 'fridge' },
  { name: 'Common Lounge', category: 'LIFESTYLE', iconKey: 'sofa' },
  { name: 'Study Room', category: 'LIFESTYLE', iconKey: 'study' },
];

const PG_TEMPLATES = [
  {
    city: 'Delhi', state: 'Delhi', college: 'DU - North Campus',
    name: 'Kailash Boys Residency', ownerIdx: 0, gender: 'MALE' as const,
    address: '14, Kailash Hills, Hudson Lane, Kingsway Camp',
    area: '110009', price: 9500, deposit: 15000, rooms: 18, available: 4,
    food: true, latJit: 0.04, lngJit: 0.03,
  },
  {
    city: 'Bangalore', state: 'Karnataka', college: 'IIT Bombay',
    name: 'Indiranagar Ladies Abode', ownerIdx: 1, gender: 'FEMALE' as const,
    address: '412, 2nd Cross, Defence Colony, Indiranagar',
    area: '560038', price: 14500, deposit: 28000, rooms: 22, available: 6,
    food: true, latJit: 0.02, lngJit: 0.025,
  },
  {
    city: 'Pune', state: 'Maharashtra', college: 'VJTI Mumbai',
    name: 'FC Road Scholars Nest', ownerIdx: 2, gender: 'CO_ED' as const,
    address: '88/B, Deccan Gymkhana, Fergusson College Road',
    area: '411004', price: 8500, deposit: 12000, rooms: 12, available: 2,
    food: false, latJit: 0.03, lngJit: 0.04,
  },
  {
    city: 'Mumbai', state: 'Maharashtra', college: 'BITS Pilani',
    name: 'Matunga Premium Hostel', ownerIdx: 0, gender: 'MALE' as const,
    address: '7, Kings Circle, Near Ruia College, Matunga East',
    area: '400019', price: 13000, deposit: 25000, rooms: 28, available: 5,
    food: true, latJit: 0.02, lngJit: 0.02,
  },
  {
    city: 'Ahmedabad', state: 'Gujarat', college: 'Nirma University',
    name: 'SG Highway Comfort Living', ownerIdx: 1, gender: 'CO_ED' as const,
    address: '305, Anand Nagar, Sarkhej-Gandhinagar Highway, Bodakdev',
    area: '380054', price: 10500, deposit: 18000, rooms: 16, available: 3,
    food: true, latJit: 0.03, lngJit: 0.035,
  },
  {
    city: 'Delhi', state: 'Delhi', college: 'DU - South Campus',
    name: 'Saket Girls Casa Bella', ownerIdx: 2, gender: 'FEMALE' as const,
    address: 'Block C, 3rd Floor, Green Park Main, Near Yusuf Sarai',
    area: '110016', price: 11500, deposit: 22000, rooms: 14, available: 2,
    food: true, latJit: 0.03, lngJit: 0.02,
  },
  {
    city: 'Bangalore', state: 'Karnataka', college: 'IITB',
    name: 'HSR Layout Tech Nest', ownerIdx: 0, gender: 'CO_ED' as const,
    address: 'Sector 3, 17th A Main, HSR Layout',
    area: '560102', price: 12000, deposit: 20000, rooms: 25, available: 7,
    food: false, latJit: 0.025, lngJit: 0.03,
  },
  {
    city: 'Pune', state: 'Maharashtra', college: 'BITS Pilani',
    name: 'Kothrud Zen Residence', ownerIdx: 1, gender: 'FEMALE' as const,
    address: 'Paud Road, Near Vanaz Factory, Kothrud',
    area: '411038', price: 9200, deposit: 14000, rooms: 15, available: 4,
    food: true, latJit: 0.035, lngJit: 0.025,
  },
  {
    city: 'Delhi', state: 'Delhi', college: 'DU',
    name: 'Laxmi Nagar Study Hub', ownerIdx: 2, gender: 'MALE' as const,
    address: 'Main Vikas Marg, Opp. Metro Pillar 37, Laxmi Nagar',
    area: '110092', price: 7800, deposit: 10000, rooms: 32, available: 8,
    food: false, latJit: 0.02, lngJit: 0.025,
  },
  {
    city: 'Ahmedabad', state: 'Gujarat', college: 'Nirma',
    name: 'Navrangpura Classic Stay', ownerIdx: 0, gender: 'MALE' as const,
    address: 'Behind Gujarat University, Stadium Road, Navrangpura',
    area: '380009', price: 7500, deposit: 9000, rooms: 20, available: 11,
    food: true, latJit: 0.035, lngJit: 0.02,
  },
];

const STATUS_PATTERN: Array<'ACTIVE' | 'ACTIVE' | 'ACTIVE' | 'ACTIVE' | 'ACTIVE' | 'ACTIVE' | 'ACTIVE' | 'PENDING' | 'PENDING' | 'DRAFT'>
  = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING', 'PENDING', 'DRAFT'];

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Delhi: { lat: 28.6139, lng: 77.209 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
};

const pickN = <T>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
};

const jitter = (base: number, range: number) => base + (Math.random() - 0.5) * range;
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const main = async () => {
  console.log('🌱 Starting seed...');
  await mongoose.disconnect().catch(() => {});
  await connectDB();

  console.log('🧹 Clearing existing seed data...');
  const adminEmail = 'admin@geonest.in';
  const ownerEmails = ['owner1@geonest.in', 'owner2@geonest.in', 'owner3@geonest.in'];
  const allEmails = [adminEmail, ...ownerEmails];

  const existingUsers = await User.find({ email: { $in: allEmails } });
  const existingUserIds = existingUsers.map((u) => u._id);
  if (existingUserIds.length > 0) {
    const owners = await Owner.find({ userId: { $in: existingUserIds } }).select('_id');
    const ownerIds = owners.map((o) => o._id);
    const pgs = await PGListing.find({ ownerId: { $in: ownerIds } }).select('_id');
    const pgIds = pgs.map((p) => p._id);
    await Image.deleteMany({ pgId: { $in: pgIds } });
    await PGListing.deleteMany({ _id: { $in: pgIds } });
    await Owner.deleteMany({ userId: { $in: existingUserIds } });
    await User.deleteMany({ _id: { $in: existingUserIds } });
  }
  await Amenity.deleteMany({ name: { $in: AMENITY_CATALOG.map((a) => a.name) } });

  console.log('🔑 Creating admin user...');
  const admin = await User.create({
    name: 'GeoNest Admin',
    email: adminEmail,
    role: 'admin',
    isActive: true,
    passwordHash: await hashPassword('Admin@123'),
  });
  console.log(`   Admin created: ${admin.email}`);

  console.log('🏢 Creating amenities catalog...');
  const amenityDocs = await Amenity.create(AMENITY_CATALOG);
  console.log(`   Created ${amenityDocs.length} amenities`);

  console.log('👥 Creating 3 owners with Owner docs linked + business names...');
  const OWNER_BUSINESS_INFO = [
    { businessName: 'Kailash Residency Pvt. Ltd.', companyName: 'Kailash PG Services', licenseNumber: 'GJ-RES-000123', isPhoneVerified: true, isVerified: true },
    { businessName: 'Indiranagar Ladies Abode', companyName: 'ComfortStays Hospitality', licenseNumber: 'KA-RES-004521', isPhoneVerified: true, isVerified: true },
    { businessName: 'Zen Living Stays', companyName: 'Zen Living Stays LLP', licenseNumber: 'MH-RES-007890', isPhoneVerified: true, isVerified: true },
  ];
  const ownerUsers = [];
  const ownerDocs = [];
  for (let i = 0; i < 3; i++) {
    const user = await User.create({
      name: ['Rajesh Kumar', 'Priya Menon', 'Amit Shah'][i],
      email: ownerEmails[i],
      phone: `+91900000000${i + 1}`,
      role: 'owner',
      isActive: true,
      passwordHash: await hashPassword('Owner@123'),
    });
    ownerUsers.push(user);
    const info = OWNER_BUSINESS_INFO[i];
    const owner = await Owner.create({
      userId: user._id,
      businessName: info.businessName,
      companyName: info.companyName,
      licenseNumber: info.licenseNumber,
      idProofUrl: undefined,
      isPhoneVerified: info.isPhoneVerified,
      isVerified: info.isVerified,
    });
    ownerDocs.push(owner);
    console.log(`   Owner: ${user.name} <${user.email}> -> OwnerId: ${owner._id}`);
  }

  console.log('🏠 Creating 10 distinct PG listings with varied city, college, price...');
  const pgs = [];
  for (let i = 0; i < PG_TEMPLATES.length; i++) {
    const t = PG_TEMPLATES[i];
    const baseCoords = CITY_COORDS[t.city];
    const numAmenities = t.gender === 'CO_ED' ? randomInt(6, 9) : randomInt(4, 7);
    const pickedAmenities = pickN(amenityDocs, numAmenities);
    const latitude = jitter(baseCoords.lat, t.latJit);
    const longitude = jitter(baseCoords.lng, t.lngJit);
    const status = STATUS_PATTERN[i];

    const pg = await PGListing.create({
      ownerId: ownerDocs[t.ownerIdx]._id,
      name: t.name,
      description: `${t.name} is a thoughtfully managed ${t.gender === 'CO_ED' ? 'co-ed' : t.gender === 'MALE' ? 'all-boys' : 'all-girls'} PG within walking distance of ${t.college}. ${t.food ? 'Home-style north and south Indian meals served three times a day' : 'Flexible meal options at an extra cost — most students order from the tiffin services nearby'}. Amenities include ${pickedAmenities.slice(0, 4).map(a => a.name.toLowerCase()).join(', ')}, and more.`,
      address: t.address,
      city: t.city,
      state: t.state,
      pincode: t.area,
      latitude,
      longitude,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      collegeName: t.college,
      totalRooms: t.rooms,
      availableRooms: status === 'ACTIVE' ? t.available : t.available,
      genderPreference: t.gender,
      pricePerMonth: t.price,
      securityDeposit: t.deposit,
      foodIncluded: t.food,
      status,
      isVerified: status === 'ACTIVE',
      rejectionReason: undefined,
      verifiedByAdminId: status === 'ACTIVE' ? admin._id : undefined,
      verifiedAt: status === 'ACTIVE' ? new Date() : undefined,
      amenities: pickedAmenities.map(a => a._id),
      deletedAt: undefined,
    });
    pgs.push(pg);
    console.log(`   PG #${i + 1}: ${pg.name} | ${pg.city} | ₹${pg.pricePerMonth}/mo | Status: ${pg.status}`);

    const numImages = i < 7 ? 3 : 2;
    for (let j = 0; j < numImages; j++) {
      await Image.create({
        pgId: pg._id,
        url: `https://picsum.photos/seed/${encodeURIComponent(t.name.replace(/\s/g, ''))}-${j}/800/600.jpg`,
        cloudinaryPublicId: `seed-pg-${i}-${j}`,
        width: 800,
        height: 600,
        isPrimary: j === 0,
        uploadedBy: ownerUsers[t.ownerIdx]._id,
      });
    }
  }

  console.log(`✅ Seed complete!`);
  console.log(`   Admin: ${adminEmail} / Admin@123`);
  ownerEmails.forEach((e, i) => console.log(`   Owner "${['Rajesh Kumar', 'Priya Menon', 'Amit Shah'][i]}": ${e} / Owner@123`));
  console.log(`   PGs: ${pgs.length} created (7 ACTIVE, 2 PENDING, 1 DRAFT)`);
  console.log(`   Amenities: ${amenityDocs.length} in catalog`);

  await mongoose.disconnect();
  process.exit(0);
};

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
