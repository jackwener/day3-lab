import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { qimenDivination, liurenDivination } from '../services/divinationService';
import { validate, qimenSchema, liurenSchema } from '../utils/validator';
import { getRemainingCount } from '../middleware/rateLimiter';

export async function postQimen(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const data = validate(qimenSchema, req.body);
    const result = await qimenDivination(userId, data.question, data.location);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function postLiuren(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const data = validate(liurenSchema, req.body);
    const result = await liurenDivination(userId, data.question, data.numbers);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const type = req.query.type as string | undefined;

    const where: any = { userId };
    if (type && ['qimen', 'liuren'].includes(type)) {
      where.type = type;
    }

    const [records, total] = await Promise.all([
      prisma.divinationRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.divinationRecord.count({ where }),
    ]);

    res.json({
      success: true,
      data: records.map((r) => ({
        ...r,
        result: JSON.parse(r.result),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
