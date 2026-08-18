import { z } from 'zod';

export const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number');

export const signUpSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format'),
    phone: z.string().min(10, 'Phone must be at least 10 digits').regex(/^\+?\d{10,15}$/, 'Invalid phone format'),
    password: strongPassword,
    role: z.enum(['student', 'owner', 'admin']),
  }),
});

export const logInSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const pgListingSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    address: z.string().min(10, 'Address is required'),
    city: z.string().min(2, 'City is required'),
    collegeName: z.string().optional(),
    location: z.object({
      type: z.literal('Point'),
      coordinates: z.array(z.number()).length(2),
    }),
    totalRooms: z.number().int().min(1, 'At least 1 room required'),
    availableRooms: z.number().int().min(0),
    genderPreference: z.enum(['male', 'female', 'unisex']),
    pricePerMonth: z.number().positive('Price must be positive'),
    securityDeposit: z.number().nonnegative(),
    amenities: z.array(z.string()).default([]),
  }),
});

export const bookingSchema = z.object({
  body: z.object({
    startDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid start date'),
    endDate: z.string().refine((v) => !isNaN(Date.parse(v)), 'Invalid end date'),
  }),
});

export const reviewSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1, 'Min rating 1').max(5, 'Max rating 5'),
    text: z.string().min(3, 'Review must be at least 3 characters'),
  }),
});

export const complaintSchema = z.object({
  body: z.object({
    type: z.enum(['hygiene', 'noise', 'safety', 'staff', 'amenity', 'other']),
    description: z.string().min(10, 'Description must be at least 10 characters'),
  }),
});

export const validate = (schema: z.ZodObject<any>) => (req: any, res: any, next: any) => {
  try {
    schema.parse({ body: req.body, params: req.params, query: req.query });
    next();
  } catch (err: any) {
    const errors = err.issues.map((i: any) => ({ field: i.path.join('.'), message: i.message }));
    return res.status(400).json({ errors });
  }
};
