import Amenity, { IAmenity, AmenityCategory } from '../models/Amenity';

export const getAmenityCatalog = async (): Promise<IAmenity[]> => {
  const result = await Amenity.find({ isActive: true }).sort({ category: 1, name: 1 }).lean();
  return result as unknown as IAmenity[];
};

export const getAmenityByIds = async (ids: string[]): Promise<IAmenity[]> => {
  const result = await Amenity.find({ _id: { $in: ids }, isActive: true }).lean();
  return result as unknown as IAmenity[];
};

export const getAmenityByCategory = async (category: AmenityCategory): Promise<IAmenity[]> => {
  const result = await Amenity.find({ category, isActive: true }).sort({ name: 1 }).lean();
  return result as unknown as IAmenity[];
};
