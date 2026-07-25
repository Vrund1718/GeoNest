import { Request, Response, NextFunction } from 'express';
import z from 'zod';
import User, { IUser } from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import env from '../config/env';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters').regex(/(?=.*[A-Za-z])(?=.*\d)/, 'Password must contain at least one letter and one number'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const COOKIE_NAME = 'geonest_token';
const COOKIE_TTL_MS = 24 * 60 * 60 * 1000;

const setAuthCookie = (res: Response, token: string) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: COOKIE_TTL_MS,
    path: '/',
  });
};

const buildUserPayload = (user: IUser) => ({
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        error: {
          message: 'Email already exists',
          code: 'EMAIL_EXISTS',
        },
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    const token = generateToken(user);
    setAuthCookie(res, token);

    res.status(201).json({
      token,
      user: buildUserPayload(user),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        error: {
          message: 'You have not signed up yet please sign up',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    if (!(await comparePassword(password, user.passwordHash))) {
      return res.status(401).json({
        error: {
          message: 'Invalid password',
          code: 'INVALID_PASSWORD',
        },
      });
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    res.json({
      token,
      user: buildUserPayload(user),
    });
  } catch (error) {
    next(error);
  }
};
