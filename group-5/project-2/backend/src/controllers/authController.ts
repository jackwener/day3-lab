import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { cache } from '../config/cache';
import { hashPassword, comparePassword } from '../utils/encryption';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../services/authService';
import { validate, registerSchema, loginSchema } from '../utils/validator';
import { AppError } from '../middleware/errorHandler';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = validate(registerSchema, req.body);

    // Check duplicates
    if (data.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) throw new AppError(409, 'EMAIL_EXISTS', '邮箱已存在');
    }
    if (data.phone) {
      const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
      if (existing) throw new AppError(409, 'PHONE_EXISTS', '手机号已存在');
    }

    const hashed = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email || null,
        phone: data.phone || null,
        password: hashed,
        nickname: data.nickname,
      },
    });

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, phone: user.phone, nickname: user.nickname },
        token,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = validate(loginSchema, req.body);

    // Rate limit check
    const key = `login_fail:${data.email}`;
    const failCount = parseInt(cache.get(key) || '0', 10);
    if (failCount >= 5) {
      throw new AppError(429, 'TOO_MANY_ATTEMPTS', '登录失败次数过多，请15分钟后重试');
    }

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      cache.incr(key, 900); // 15 min window
      throw new AppError(401, 'INVALID_CREDENTIALS', '账号或密码错误');
    }

    const valid = await comparePassword(data.password, user.password);
    if (!valid) {
      cache.incr(key, 900);
      throw new AppError(401, 'INVALID_CREDENTIALS', '账号或密码错误');
    }

    // Clear fail count on success
    cache.del(key);

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, phone: user.phone, nickname: user.nickname },
        token,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshTokenStr = req.cookies?.refreshToken;
    if (!refreshTokenStr) {
      throw new AppError(401, 'UNAUTHORIZED', '缺少Refresh Token');
    }

    const payload = verifyRefreshToken(refreshTokenStr);
    const token = generateToken(payload.userId);

    res.json({
      success: true,
      data: { token },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
