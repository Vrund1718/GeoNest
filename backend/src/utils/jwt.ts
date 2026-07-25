import jwt from 'jsonwebtoken';
import env from '../config/env';
import { IUser, UserRole } from '../models/User';

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

export const generateToken = (user: IUser) => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    role: user.role,
  };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1d' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
};

export const verifyAccessToken = verifyToken;
