import PGListing, { IPGListing, PGStatus, GenderPreference } from '../models/PGListing';
import Image, { IImage } from '../models/Image';
import { Types } from 'mongoose';
import { UploadResult } from '../utils/storage.service';

const MATERIAL_FIELDS: (keyof IPGListing)[] = [
  'name', 'description', 'address', 'city', 'state', 'pincode',
  'latitude', 'longitude', 'collegeName', 'pricePerMonth', 'securityDeposit',
  'genderPreference', 'totalRooms', 'availableRooms', 'foodIncluded', 'amenities'
];

export interface CreatePGData {
  ownerId: Types.ObjectId;
  name: string;
  description?: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  collegeName?: string;
  pricePerMonth: number;
  securityDeposit?: number;
  genderPreference: GenderPreference;
  totalRooms?: number;
  availableRooms?: number;
  foodIncluded?: boolean;
  amenities?: string[];
}

export const createPG = async (data: CreatePGData): Promise<IPGListing> => {
  const amenityIds = data.amenities?.map(id => new Types.ObjectId(id)) || [];
  const pg = await PGListing.create({
    ...data,
    amenities: amenityIds,
    status: 'DRAFT' as PGStatus,
    location: {
      type: 'Point',
      coordinates: [data.longitude, data.latitude],
    },
  });
  return pg;
};

export const getPGsByOwner = async (
  ownerId: Types.ObjectId,
  opts: { status?: PGStatus; page: number; limit: number }
): Promise<{ listings: IPGListing[]; total: number; page: number; limit: number }> => {
  const filter: any = { ownerId, deletedAt: { $exists: false } };
  if (opts.status) filter.status = opts.status;

  const skip = (opts.page - 1) * opts.limit;

  const [listingsRaw, total] = await Promise.all([
    PGListing.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(opts.limit)
      .populate('amenities')
      .lean(),
    PGListing.countDocuments(filter),
  ]);

  const listings = listingsRaw as unknown as IPGListing[];
  return { listings, total, page: opts.page, limit: opts.limit };
};

export const getPGById = async (id: string | Types.ObjectId): Promise<IPGListing | null> => {
  const result = await PGListing.findOne({ _id: id, deletedAt: { $exists: false } })
    .populate('amenities')
    .populate('ownerId')
    .lean();
  return result as unknown as IPGListing | null;
};

export const getPGWithOwnerCheck = async (
  id: string | Types.ObjectId,
  ownerId: Types.ObjectId
): Promise<IPGListing | null> => {
  const result = await PGListing.findOne({ _id: id, ownerId, deletedAt: { $exists: false } })
    .populate('amenities')
    .lean();
  return result as unknown as IPGListing | null;
};

export const hasMaterialChanges = (
  existing: IPGListing,
  updates: Partial<CreatePGData>
): boolean => {
  for (const field of MATERIAL_FIELDS) {
    if (field in updates) {
      const newValue = (updates as any)[field];
      const existingValue = (existing as any)[field];
      if (field === 'amenities') {
        const newArr = Array.isArray(newValue) ? newValue.map(String).sort() : [];
        const oldArr = Array.isArray(existingValue) ? existingValue.map((v: any) => String(v)).sort() : [];
        if (JSON.stringify(newArr) !== JSON.stringify(oldArr)) return true;
      } else {
        if (String(newValue) !== String(existingValue)) return true;
      }
    }
  }
  return false;
};

export const updatePG = async (
  id: string | Types.ObjectId,
  ownerId: Types.ObjectId,
  updates: Partial<CreatePGData>
): Promise<IPGListing | null> => {
  const existing = await PGListing.findOne({ _id: id, ownerId, deletedAt: { $exists: false } });
  if (!existing) return null;

  const materialChanged = hasMaterialChanges(existing, updates);
  const wasActiveOrRejected = existing.status === 'ACTIVE' || existing.status === 'REJECTED';

  const updateData: any = { ...updates };

  if (updates.amenities) {
    updateData.amenities = updates.amenities.map(id => new Types.ObjectId(id));
  }

  if (materialChanged && wasActiveOrRejected) {
    updateData.status = 'PENDING' as PGStatus;
    updateData.isVerified = false;
  }

  Object.assign(existing, updateData);
  await existing.save();
  return existing.toObject();
};

export const softDeletePG = async (
  id: string | Types.ObjectId,
  ownerId: Types.ObjectId
): Promise<boolean> => {
  const result = await PGListing.updateOne(
    { _id: id, ownerId, deletedAt: { $exists: false } },
    { $set: { deletedAt: new Date(), status: 'INACTIVE' as PGStatus } }
  );
  return result.modifiedCount > 0;
};

export const addImagesToPG = async (
  pgId: Types.ObjectId,
  uploadResults: UploadResult[],
  uploadedBy?: Types.ObjectId
): Promise<IImage[]> => {
  const existingPrimary = await Image.findOne({ pgId, isPrimary: true }).lean();
  const imageDocs = uploadResults.map((r, i) => ({
    pgId,
    url: r.url,
    cloudinaryPublicId: r.publicId,
    width: r.width,
    height: r.height,
    isPrimary: !existingPrimary && i === 0,
    uploadedBy: uploadedBy || new Types.ObjectId('000000000000000000000000'),
  }));

  const created = await Image.create(imageDocs);
  return created.map(doc => doc.toObject());
};

export const getImagesForPG = async (pgId: Types.ObjectId): Promise<IImage[]> => {
  const result = await Image.find({ pgId }).sort({ isPrimary: -1, createdAt: 1 }).lean();
  return result as unknown as IImage[];
};

export const deleteImage = async (
  imageId: string | Types.ObjectId,
  pgId: Types.ObjectId
): Promise<IImage | null> => {
  const image = await Image.findOneAndDelete({ _id: imageId, pgId });
  if (image && image.isPrimary) {
    const nextPrimary = await Image.findOne({ pgId, _id: { $ne: imageId } }).sort({ createdAt: 1 });
    if (nextPrimary) {
      nextPrimary.isPrimary = true;
      await nextPrimary.save();
    }
  }
  return image;
};

export const getImageById = async (imageId: string | Types.ObjectId): Promise<IImage | null> => {
  const result = await Image.findById(imageId).lean();
  return result as unknown as IImage | null;
};

export const setPrimaryImage = async (
  imageId: string | Types.ObjectId,
  pgId: Types.ObjectId
): Promise<boolean> => {
  const session = await Image.startSession();
  session.startTransaction();
  try {
    await Image.updateMany(
      { pgId },
      { $set: { isPrimary: false } },
      { session }
    );
    const result = await Image.updateOne(
      { _id: imageId, pgId },
      { $set: { isPrimary: true } },
      { session }
    );
    await session.commitTransaction();
    session.endSession();
    return result.modifiedCount > 0;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

export const getPendingPGs = async (
  opts: { page: number; limit: number }
): Promise<{ listings: any[]; total: number; page: number; limit: number }> => {
  const skip = (opts.page - 1) * opts.limit;

  const [listings, total] = await Promise.all([
    PGListing.find({ status: 'PENDING', deletedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(opts.limit)
      .populate({
        path: 'ownerId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .lean(),
    PGListing.countDocuments({ status: 'PENDING', deletedAt: { $exists: false } }),
  ]);

  return { listings, total, page: opts.page, limit: opts.limit };
};

export const getPGFullDetail = async (id: string | Types.ObjectId) => {
  const pg = await PGListing.findOne({ _id: id, deletedAt: { $exists: false } })
    .populate('amenities')
    .populate({
      path: 'ownerId',
      populate: { path: 'userId', select: 'name email phone' },
    })
    .lean();

  if (!pg) return null;

  const images = await getImagesForPG(new Types.ObjectId((pg as any)._id));
  return { ...pg, images };
};

export const verifyPG = async (
  id: string | Types.ObjectId,
  opts: { approve: boolean; adminId: Types.ObjectId; reason?: string }
): Promise<IPGListing | null> => {
  const pg = await PGListing.findOne({ _id: id, deletedAt: { $exists: false } });
  if (!pg) return null;

  if (opts.approve) {
    pg.isVerified = true;
    pg.status = 'ACTIVE';
    pg.verifiedByAdminId = opts.adminId;
    pg.verifiedAt = new Date();
    pg.rejectionReason = undefined;
  } else {
    pg.status = 'REJECTED';
    pg.rejectionReason = opts.reason;
    pg.isVerified = false;
  }

  await pg.save();
  return pg.toObject();
};
