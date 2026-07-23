import jwt from 'jsonwebtoken';
import env from '../config/env';
import { IUser } from '../models/User';

export const generateToken = (user: IUser) => {
  return jwt.sign(
    { userId: user._id },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string };
};
