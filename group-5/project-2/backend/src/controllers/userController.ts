import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../types';
import { validate, profileSchema } from '../utils/validator';
import { calculatePillars, analyzeWuxing } from '../algorithms/bazi/calculator';
import { AppError } from '../middleware/errorHandler';

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const profile = await prisma.destinyProfile.findUnique({ where: { userId } });

    if (!profile) {
      throw new AppError(404, 'PROFILE_NOT_FOUND', '档案不存在');
    }

    res.json({
      success: true,
      data: {
        ...profile,
        bazi: profile.bazi ? JSON.parse(profile.bazi) : null,
        wuxing: profile.wuxing ? JSON.parse(profile.wuxing) : null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function upsertProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const data = validate(profileSchema, req.body);

    // 解析日期计算八字
    const [y, m, d] = data.birthDate.split('-').map(Number);
    let hour: number | undefined;
    if (data.birthTime) {
      hour = parseInt(data.birthTime.split(':')[0], 10);
    }

    const bazi = calculatePillars(y, m, d, hour);
    const wuxing = analyzeWuxing(bazi);
    const noBirthTime = !data.birthTime;

    const profile = await prisma.destinyProfile.upsert({
      where: { userId },
      create: {
        userId,
        nickname: data.nickname,
        gender: data.gender,
        birthDate: data.birthDate,
        birthTime: data.birthTime || null,
        noBirthTime,
        bazi: JSON.stringify(bazi),
        wuxing: JSON.stringify(wuxing),
      },
      update: {
        nickname: data.nickname,
        gender: data.gender,
        birthDate: data.birthDate,
        birthTime: data.birthTime || null,
        noBirthTime,
        bazi: JSON.stringify(bazi),
        wuxing: JSON.stringify(wuxing),
      },
    });

    res.json({
      success: true,
      data: {
        ...profile,
        bazi,
        wuxing,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
