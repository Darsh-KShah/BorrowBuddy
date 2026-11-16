import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { config } from './config.js';
import { Session, User } from './models.js';

export type AuthRequest = Request & { user?: { id: string; role: 'STUDENT' | 'ADMIN' } };
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export const accessToken = (user: { id: string; role: string }) =>
  jwt.sign({ sub: user.id, role: user.role }, config.accessSecret, { expiresIn: `${config.accessMinutes}m` });
export const refreshToken = (user: { id: string }) =>
  jwt.sign({ sub: user.id, type: 'refresh' }, config.refreshSecret, { expiresIn: `${config.refreshDays}d`, jwtid: crypto.randomUUID() });
export const verifyRefreshToken = (token: string) => jwt.verify(token, config.refreshSecret) as jwt.JwtPayload & { type?: string };
export const hashRefreshToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
export const createRefreshSession = async (userId: string) => {
  const token = refreshToken({ id: userId });
  await Session.create({
    userId,
    refreshTokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + config.refreshDays * 86_400_000),
  });
  return token;
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication is required.' } });
  try {
    const payload = jwt.verify(header.slice(7), config.accessSecret) as jwt.JwtPayload;
    const user = await User.findById(payload.sub).select('_id role accountStatus');
    if (!user || user.accountStatus !== 'ACTIVE') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Account is not active.' } });
    req.user = { id: user.id, role: user.role };
    next();
  } catch {
    res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Access token is invalid or expired.' } });
  }
};
