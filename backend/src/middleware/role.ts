import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { UserRole } from '../models/User';

type AllowedRole = Exclude<UserRole, 'student'>;

export const requireRole = (...roles: AllowedRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        error: {
          message: 'Not authorized to access this route',
          code: 'UNAUTHORIZED',
        },
      });
    }

    if (!roles.includes(req.user.role as AllowedRole)) {
      return res.status(403).json({
        error: {
          message: `Role ${req.user.role} is forbidden from accessing this resource`,
          code: 'ROLE_FORBIDDEN',
        },
      });
    }

    next();
  };
};

export const requireOwner = requireRole('owner');
export const requireAdmin = requireRole('admin');
