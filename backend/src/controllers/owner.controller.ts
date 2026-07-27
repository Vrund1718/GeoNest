import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Types } from 'mongoose';
import {
  createPG,
  getPGsByOwner,
  getPGWithOwnerCheck,
  updatePG,
  softDeletePG,
  addImagesToPG,
  deleteImage as deleteImageFromDB,
  setPrimaryImage,
  getImageById,
  getImagesForPG,
} from '../services/pg.service';
import { getOwnerByUserId } from '../services/owner.service';
import { getAmenityCatalog } from '../services/amenity.service';
import {
  createPGSchema,
  updatePGSchema,
  pgStatusFilterSchema,
  pgIdParamSchema,
  imageIdParamSchema,
} from '../validations/pg.validations';
import { validateUploadedFiles } from '../utils/multer';
import { uploadImageBuffer, deleteImage as deleteFromCloudinary } from '../utils/storage.service';

export const createPGListing = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createPGSchema.parse(req.body);
    const userId = new Types.ObjectId(req.user!.userId);
    const owner = await getOwnerByUserId(userId);

    if (!owner) {
      return res.status(404).json({
        error: {
          message: 'Owner profile not found',
          code: 'OWNER_NOT_FOUND',
        },
      });
    }

    const pg = await createPG({
      ...data,
      ownerId: new Types.ObjectId(owner._id),
    });

    res.status(201).json({
      data: pg,
    });
  } catch (error) {
    next(error);
  }
};

export const getOwnerPGs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const opts = pgStatusFilterSchema.parse(req.query);
    const userId = new Types.ObjectId(req.user!.userId);
    const owner = await getOwnerByUserId(userId);

    if (!owner) {
      return res.status(404).json({
        error: {
          message: 'Owner profile not found',
          code: 'OWNER_NOT_FOUND',
        },
      });
    }

    const result = await getPGsByOwner(new Types.ObjectId(owner._id), opts);

    res.json({
      data: result.listings,
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

export const getOwnerPGById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = pgIdParamSchema.parse(req.params);
    const userId = new Types.ObjectId(req.user!.userId);
    const owner = await getOwnerByUserId(userId);

    if (!owner) {
      return res.status(404).json({
        error: {
          message: 'Owner profile not found',
          code: 'OWNER_NOT_FOUND',
        },
      });
    }

    const pg = await getPGWithOwnerCheck(id, new Types.ObjectId(owner._id));

    if (!pg) {
      return res.status(404).json({
        error: {
          message: 'PG listing not found',
          code: 'PG_NOT_FOUND',
        },
      });
    }

    const images = await getImagesForPG(new Types.ObjectId((pg as any)._id));

    res.json({
      data: { ...pg, images },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePGListing = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = pgIdParamSchema.parse(req.params);
    const updates = updatePGSchema.parse(req.body);
    const userId = new Types.ObjectId(req.user!.userId);
    const owner = await getOwnerByUserId(userId);

    if (!owner) {
      return res.status(404).json({
        error: {
          message: 'Owner profile not found',
          code: 'OWNER_NOT_FOUND',
        },
      });
    }

    const updated = await updatePG(id, new Types.ObjectId(owner._id), updates as any);

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
  } catch (error) {
    next(error);
  }
};

export const deletePGListing = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = pgIdParamSchema.parse(req.params);
    const userId = new Types.ObjectId(req.user!.userId);
    const owner = await getOwnerByUserId(userId);

    if (!owner) {
      return res.status(404).json({
        error: {
          message: 'Owner profile not found',
          code: 'OWNER_NOT_FOUND',
        },
      });
    }

    const deleted = await softDeletePG(id, new Types.ObjectId(owner._id));

    if (!deleted) {
      return res.status(404).json({
        error: {
          message: 'PG listing not found',
          code: 'PG_NOT_FOUND',
        },
      });
    }

    res.json({
      data: { success: true },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadPGImages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = pgIdParamSchema.parse(req.params);
    const userId = new Types.ObjectId(req.user!.userId);
    const owner = await getOwnerByUserId(userId);

    if (!owner) {
      return res.status(404).json({
        error: {
          message: 'Owner profile not found',
          code: 'OWNER_NOT_FOUND',
        },
      });
    }

    const pg = await getPGWithOwnerCheck(id, new Types.ObjectId(owner._id));
    if (!pg) {
      return res.status(404).json({
        error: {
          message: 'PG listing not found',
          code: 'PG_NOT_FOUND',
        },
      });
    }

    const files = req.files as Express.Multer.File[];
    validateUploadedFiles(files);

    const uploadPromises = files.map(file =>
      uploadImageBuffer(file.buffer)
    );
    const uploadResults = await Promise.all(uploadPromises);

    const images = await addImagesToPG(
      new Types.ObjectId((pg as any)._id),
      uploadResults,
      userId
    );

    res.status(201).json({
      data: images,
    });
  } catch (error) {
    if (error && (error as any).code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        error: {
          message: (error as Error).message,
          code: 'INVALID_FILE_TYPE',
        },
      });
    }
    if (error && (error as any).code === 'FILE_TOO_BIG') {
      return res.status(400).json({
        error: {
          message: (error as Error).message,
          code: 'FILE_TOO_BIG',
        },
      });
    }
    if (error && (error as any).code === 'TOO_MANY_FILES') {
      return res.status(400).json({
        error: {
          message: (error as Error).message,
          code: 'TOO_MANY_FILES',
        },
      });
    }
    if (error && (error as any).code === 'NO_FILES_UPLOADED') {
      return res.status(400).json({
        error: {
          message: (error as Error).message,
          code: 'NO_FILES_UPLOADED',
        },
      });
    }
    next(error);
  }
};

export const deletePGImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, imageId } = imageIdParamSchema.parse(req.params);
    const userId = new Types.ObjectId(req.user!.userId);
    const owner = await getOwnerByUserId(userId);

    if (!owner) {
      return res.status(404).json({
        error: {
          message: 'Owner profile not found',
          code: 'OWNER_NOT_FOUND',
        },
      });
    }

    const pg = await getPGWithOwnerCheck(id, new Types.ObjectId(owner._id));
    if (!pg) {
      return res.status(404).json({
        error: {
          message: 'PG listing not found',
          code: 'PG_NOT_FOUND',
        },
      });
    }

    const image = await getImageById(imageId);
    const pgObjId = new Types.ObjectId((pg as any)._id);
    if (!image || !image.pgId.equals(pgObjId)) {
      return res.status(404).json({
        error: {
          message: 'Image not found',
          code: 'IMAGE_NOT_FOUND',
        },
      });
    }

    const deleted = await deleteImageFromDB(imageId, pgObjId);
    if (deleted) {
      await deleteFromCloudinary(deleted.cloudinaryPublicId);
    }

    res.json({
      data: { success: true },
    });
  } catch (error) {
    next(error);
  }
};

export const setPrimaryPGImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, imageId } = imageIdParamSchema.parse(req.params);
    const userId = new Types.ObjectId(req.user!.userId);
    const owner = await getOwnerByUserId(userId);

    if (!owner) {
      return res.status(404).json({
        error: {
          message: 'Owner profile not found',
          code: 'OWNER_NOT_FOUND',
        },
      });
    }

    const pg = await getPGWithOwnerCheck(id, new Types.ObjectId(owner._id));
    if (!pg) {
      return res.status(404).json({
        error: {
          message: 'PG listing not found',
          code: 'PG_NOT_FOUND',
        },
      });
    }

    const image = await getImageById(imageId);
    const pgObjId = new Types.ObjectId((pg as any)._id);
    if (!image || !image.pgId.equals(pgObjId)) {
      return res.status(404).json({
        error: {
          message: 'Image not found',
          code: 'IMAGE_NOT_FOUND',
        },
      });
    }

    await setPrimaryImage(imageId, pgObjId);

    res.json({
      data: { success: true },
    });
  } catch (error) {
    next(error);
  }
};

export const getAmenities = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const amenities = await getAmenityCatalog();
    res.json({
      data: amenities,
    });
  } catch (error) {
    next(error);
  }
};
