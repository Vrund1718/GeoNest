import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import User, { IUser, UserRole } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

const signAccessToken = (user: IUser) =>
  jwt.sign({ sub: user.id, role: user.role, v: user.tokenVersion }, config.jwtAccessSecret, {
    expiresIn: `${config.accessTokenTtlMin}m`,
  });

const signRefreshToken = (user: IUser) =>
  jwt.sign({ sub: user.id, v: user.tokenVersion }, config.jwtRefreshSecret, {
    expiresIn: `${config.refreshTokenTtlDays}d`,
  });

export const setAuthCookies = (res: Response, user: IUser) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const baseOpts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.nodeEnv === 'production',
    path: '/',
  };

  res.cookie('access_token', accessToken, {
    ...baseOpts,
    maxAge: config.accessTokenTtlMin * 60 * 1000,
  });
  res.cookie('refresh_token', refreshToken, {
    ...baseOpts,
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookies = (res: Response) => {
  const clearOpts = { httpOnly: true, sameSite: 'lax' as const, secure: config.nodeEnv === 'production', path: '/' };
  res.clearCookie('access_token', clearOpts);
  res.clearCookie('refresh_token', clearOpts);
};

export const extractTokens = (req: Request) => {
  const access = req.cookies?.access_token as string | undefined;
  const refresh = req.cookies?.refresh_token as string | undefined;
  return { access, refresh };
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { access, refresh } = extractTokens(req);

    if (!access && !refresh) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (access) {
      try {
        const decoded = jwt.verify(access, config.jwtAccessSecret) as any;
        const user = await User.findById(decoded.sub).select('-hashedPassword');
        if (!user || user.tokenVersion !== decoded.v) {
          return res.status(401).json({ error: 'Token revoked' });
        }
        req.user = user;
        return next();
      } catch {
        if (!refresh) return res.status(401).json({ error: 'Token expired' });
      }
    }

    if (refresh) {
      try {
        const decoded = jwt.verify(refresh, config.jwtRefreshSecret) as any;
        const user = await User.findById(decoded.sub).select('-hashedPassword');
        if (!user || user.tokenVersion !== decoded.v) {
          clearAuthCookies(res);
          return res.status(401).json({ error: 'Token revoked' });
        }
        setAuthCookies(res, user);
        req.user = user;
        return next();
      } catch {
        clearAuthCookies(res);
        return res.status(401).json({ error: 'Invalid refresh token' });
      }
    }
  } catch (err) {
    return res.status(500).json({ error: 'Auth error' });
  }
};

export const requireRole = (roles: UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Role ${req.user.role} not authorized for this action` });
  }
  next();
};
