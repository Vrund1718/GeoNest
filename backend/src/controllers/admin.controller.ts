import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Types } from 'mongoose';
import {
  getPendingPGs,
  getPGFullDetail,
  verifyPG,
} from '../services/pg.service';
import {
  verifyPGSchema,
  pgIdParamSchema,
} from '../validations/pg.validations';
import {
  complaintStatusFilterSchema,
  updateComplaintSchema,
  complaintIdParamSchema,
  usersFilterSchema,
  pendingPGListSchema,
} from '../validations/admin.validations';
import Complaint from '../models/Complaint';
import User from '../models/User';
import PGListing from '../models/PGListing';

export const getPendingPGsController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const opts = pendingPGListSchema.parse(req.query);
    const result = await getPendingPGs(opts);

    const listings = result.listings.map((pg: any) => ({
      ...pg,
      ownerName: pg.ownerId?.userId?.name,
      ownerEmail: pg.ownerId?.userId?.email,
      ownerPhone: pg.ownerId?.userId?.phone,
    }));

    res.json({
      data: listings,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        pages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPGFullDetailController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = pgIdParamSchema.parse(req.params);
    const pg = await getPGFullDetail(id);

    if (!pg) {
      return res.status(404).json({
        error: {
          message: 'PG listing not found',
          code: 'PG_NOT_FOUND',
        },
      });
    }

    res.json({
      data: pg,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPGController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = pgIdParamSchema.parse(req.params);
    const body = verifyPGSchema.parse(req.body);
    const adminId = new Types.ObjectId(req.user!.userId);

    const updated = await verifyPG(id, {
      approve: body.approve,
      adminId,
      reason: body.approve ? undefined : (body as any).reason,
    });

    if (!updated) {
      return res.status(404).json({
        error: {
          message: 'PG listing not found',
          code: 'PG_NOT_FOUND',
        },
      });
    }

    res.json({
      data: updated,
    });
  } catch (error: any) {
    if (error && error.name === 'ZodError' && error.issues) {
      const reasonIssue = error.issues.find((i: any) =>
        i.path && i.path.includes('reason')
      );
      if (reasonIssue) {
        return res.status(400).json({
          error: {
            message: 'Rejection reason is required and must be at least 10 characters',
            code: 'ADMIN_REASON_REQUIRED',
          },
        });
      }
    }
    next(error);
  }
};

export const getComplaints = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const opts = complaintStatusFilterSchema.parse(req.query);
    const filter: any = {};
    if (opts.status) filter.status = opts.status;

    const skip = (opts.page - 1) * opts.limit;

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(opts.limit)
        .populate('userId', 'name email phone')
        .populate('pgId', 'name city')
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    res.json({
      data: complaints,
      pagination: {
        total,
        page: opts.page,
        limit: opts.limit,
        pages: Math.ceil(total / opts.limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateComplaint = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = complaintIdParamSchema.parse(req.params);
    const body = updateComplaintSchema.parse(req.body);

    const updateData: any = {
      status: body.status,
    };

    if (body.adminNote !== undefined) {
      updateData.adminNote = body.adminNote;
    }

    if (body.status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    const updated = await Complaint.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )
      .populate('userId', 'name email phone')
      .populate('pgId', 'name city')
      .lean();

    if (!updated) {
      return res.status(404).json({
        error: {
          message: 'Complaint not found',
          code: 'COMPLAINT_NOT_FOUND',
        },
      });
    }

    res.json({
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const opts = usersFilterSchema.parse(req.query);
    const filter: any = {};
    if (opts.role) filter.role = opts.role;
    if (opts.isActive !== undefined) filter.isActive = opts.isActive;

    const skip = (opts.page - 1) * opts.limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(opts.limit)
        .select('-passwordHash')
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      data: users,
      pagination: {
        total,
        page: opts.page,
        limit: opts.limit,
        pages: Math.ceil(total / opts.limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getOverview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const [totalUsers, totalPGs, pendingVerifications, openComplaints] = await Promise.all([
      User.countDocuments({ isActive: { $ne: false } }),
      PGListing.countDocuments({ deletedAt: { $exists: false } }),
      PGListing.countDocuments({ status: 'PENDING', deletedAt: { $exists: false } }),
      Complaint.countDocuments({ status: { $in: ['REQUESTED', 'IN_PROGRESS'] } }),
    ]);

    res.json({
      data: {
        totalUsers,
        totalPGs,
        pendingVerifications,
        openComplaints,
      },
    });
  } catch (error) {
    next(error);
  }
};
