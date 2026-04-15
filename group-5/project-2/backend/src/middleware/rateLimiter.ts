import { Request, Response, NextFunction } from 'express';
import { cache } from '../config/cache';
import { AppError } from './errorHandler';
import { AuthRequest } from '../types';

// 通用 API 限流 (15分钟100次)
export function apiRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || 'unknown';
  const key = `ratelimit:${ip}`;
  const count = cache.incr(key, 900);
  if (count > 100) {
    res.status(429).json({
      success: false,
      error: { code: 'TOO_MANY_REQUESTS', message: '请求过于频繁，请稍后重试' },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next();
}

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 奇门遁甲限流 (每日1次/用户)
export function qimenRateLimiter(req: AuthRequest, res: Response, next: NextFunction): void {
  const userId = req.user?.userId;
  if (!userId) { next(); return; }

  const key = `qimen:${userId}:${getToday()}`;
  const count = parseInt(cache.get(key) || '0', 10);
  if (count >= 1) {
    res.status(429).json({
      success: false,
      error: { code: 'DAILY_LIMIT_EXCEEDED', message: '奇门遁甲每日仅可使用1次' },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next();
}

// 大小六壬限流 (每日5次/用户)
export function liurenRateLimiter(req: AuthRequest, res: Response, next: NextFunction): void {
  const userId = req.user?.userId;
  if (!userId) { next(); return; }

  const key = `liuren:${userId}:${getToday()}`;
  const count = parseInt(cache.get(key) || '0', 10);
  if (count >= 5) {
    res.status(429).json({
      success: false,
      error: { code: 'DAILY_LIMIT_EXCEEDED', message: '大小六壬每日仅可使用5次' },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next();
}

// 记录使用次数
export function incrementUsage(userId: number, type: 'qimen' | 'liuren'): void {
  const key = `${type}:${userId}:${getToday()}`;
  // TTL到次日0点
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const ttl = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
  cache.incr(key, ttl);
}

// 获取剩余次数
export function getRemainingCount(userId: number, type: 'qimen' | 'liuren'): number {
  const key = `${type}:${userId}:${getToday()}`;
  const used = parseInt(cache.get(key) || '0', 10);
  const limit = type === 'qimen' ? 1 : 5;
  return Math.max(0, limit - used);
}
