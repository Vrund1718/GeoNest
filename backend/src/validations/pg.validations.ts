import z from 'zod';

export const createPGSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(2000).optional(),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().optional(),
  pincode: z.string().optional(),
  latitude: z.number({ required_error: 'Latitude is required' }),
  longitude: z.number({ required_error: 'Longitude is required' }),
  collegeName: z.string().optional(),
  pricePerMonth: z.number({ required_error: 'Price is required' }).positive('Price must be positive'),
  securityDeposit: z.number().positive().optional(),
  genderPreference: z.enum(['MALE', 'FEMALE', 'CO_ED']).default('CO_ED'),
  totalRooms: z.number().int().positive().default(1),
  availableRooms: z.number().int().nonnegative().default(1),
  foodIncluded: z.boolean().default(false),
  amenities: z.array(z.string()).optional(),
});

export const updatePGSchema = createPGSchema.partial();

export const pgStatusFilterSchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const pgIdParamSchema = z.object({
  id: z.string().min(1, 'PG ID is required'),
});

export const imageIdParamSchema = z.object({
  id: z.string().min(1, 'PG ID is required'),
  imageId: z.string().min(1, 'Image ID is required'),
});

export const verifyPGSchema = z.union([
  z.object({
    approve: z.literal(true),
  }),
  z.object({
    approve: z.literal(false),
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
  }),
]);

export type VerifyPGInput = z.infer<typeof verifyPGSchema>;
