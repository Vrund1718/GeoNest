import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: err.issues,
      },
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      error: {
        message: 'Email already exists',
        code: 'DUPLICATE_EMAIL',
      },
    });
  }

  if (
    err.name === 'MongooseError' &&
    typeof err.message === 'string' &&
    err.message.includes('buffering timed out')
  ) {
    return res.status(503).json({
      error: {
        message: 'Database is reconnecting — please try again in a moment',
        code: 'DATABASE_UNAVAILABLE',
      },
    });
  }

  if (
    err.name === 'MongooseServerSelectionError' ||
    (err.message && typeof err.message === 'string' && err.message.includes('Server selection timed out'))
  ) {
    return res.status(503).json({
      error: {
        message: 'Database unavailable — please try again later',
        code: 'DATABASE_UNAVAILABLE',
      },
    });
  }

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
    },
  });
};
