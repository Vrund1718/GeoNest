import z from 'zod';

export const complaintStatusFilterSchema = z.object({
  status: z.enum(['REQUESTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const updateComplaintSchema = z.object({
  status: z.enum(['REQUESTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']),
  adminNote: z.string().optional(),
});

export const complaintIdParamSchema = z.object({
  id: z.string().min(1, 'Complaint ID is required'),
});

export const usersFilterSchema = z.object({
  role: z.enum(['student', 'owner', 'admin']).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const pendingPGListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});
