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

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
    },
  });
};
