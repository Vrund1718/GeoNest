import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Owner from '../models/Owner';
import {
  AuthRequest,
  requireAuth,
  setAuthCookies,
  clearAuthCookies,
  extractTokens,
} from '../middleware/auth';
import { signUpSchema, logInSchema, validate } from '../middleware/validate';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const router = Router();

router.post('/signup', validate(signUpSchema), async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ errors: [{ field: 'email', message: 'Email already in use' }] });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      hashedPassword,
      role,
    });

    if (role === 'owner') {
      await Owner.create({ userId: user._id, verificationStatus: 'unverified' });
    }

    const publicUser: any = user.toObject(); delete publicUser.hashedPassword;
    setAuthCookies(res, user);
    return res.status(201).json({ user: publicUser });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', validate(logInSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.hashedPassword);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const publicUser: any = user.toObject(); delete publicUser.hashedPassword;
    setAuthCookies(res, user);
    return res.json({ user: publicUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  const u = req.user;
  const publicUser = (u as any).toObject
    ? (u as any).toObject({ transform: (_: any, ret: any) => { delete ret.hashedPassword; return ret; } })
    : { ...(u as any), hashedPassword: undefined };
  return res.json({ user: publicUser });
});

router.post('/refresh', async (req, res) => {
  const { refresh } = extractTokens(req);
  if (!refresh) return res.status(401).json({ error: 'No refresh token' });
  try {
    const decoded = jwt.verify(refresh, config.jwtRefreshSecret) as any;
    const user = await User.findById(decoded.sub).select('-hashedPassword');
    if (!user || user.tokenVersion !== decoded.v) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Token revoked' });
    }
    setAuthCookies(res, user);
    return res.json({ user });
  } catch {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });
  }
  clearAuthCookies(res);
  return res.json({ message: 'Logged out' });
});

export default router;
