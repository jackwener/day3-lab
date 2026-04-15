import { Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';
import { AuthRequest } from '../types';

export function auth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '未认证或Token过期' },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = { userId: payload.userId };
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '未认证或Token过期' },
      timestamp: new Date().toISOString(),
    });
  }
}
