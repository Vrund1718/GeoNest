import Owner, { IOwner } from '../models/Owner';
import { Types } from 'mongoose';

export const getOwnerByUserId = async (userId: string | Types.ObjectId): Promise<IOwner | null> => {
  const result = await Owner.findOne({ userId: new Types.ObjectId(userId) }).lean();
  return result as unknown as IOwner | null;
};

export const getOwnerById = async (ownerId: string | Types.ObjectId): Promise<IOwner | null> => {
  const result = await Owner.findById(ownerId).lean();
  return result as unknown as IOwner | null;
};

export const createOwner = async (data: {
  userId: string | Types.ObjectId;
  companyName?: string;
  licenseNumber?: string;
}): Promise<IOwner> => {
  return Owner.create({
    userId: new Types.ObjectId(data.userId),
    companyName: data.companyName,
    licenseNumber: data.licenseNumber,
  });
};

export const getOwnerWithUser = async (ownerId: string | Types.ObjectId) => {
  return Owner.findById(ownerId).populate('userId', 'name email phone').lean();
};
