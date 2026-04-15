import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { analyzeDestiny } from '../services/destinyService';
import { validate, destinySchema } from '../utils/validator';

export async function postAnalyze(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const data = validate(destinySchema, req.body);
    const result = await analyzeDestiny(userId, data.name, data.gender, data.birthDate, data.birthTime, data.noBirthTime);

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

    const [records, total] = await Promise.all([
      prisma.destinyHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          gender: true,
          birthDate: true,
          keywords: true,
          createdAt: true,
        },
      }),
      prisma.destinyHistory.count({ where: { userId } }),
    ]);

    res.json({
      success: true,
      data: records.map((r) => ({
        ...r,
        keywords: JSON.parse(r.keywords),
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
