import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { generateCalendar } from '../services/calendarService';
import { AppError } from '../middleware/errorHandler';

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getToday(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const dateParam = req.query.date as string | undefined;
    const dateStr = dateParam || formatDate(new Date());

    const content = await generateCalendar(userId, dateStr);

    res.json({
      success: true,
      data: content,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function getByDate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const dateStr = req.params.date;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new AppError(400, 'INVALID_DATE', '日期格式无效，应为YYYY-MM-DD');
    }

    // Validate range: ±7 days
    const target = new Date(dateStr);
    const now = new Date();
    const diff = Math.abs(target.getTime() - now.getTime()) / 86400000;
    if (diff > 7) {
      throw new AppError(400, 'DATE_OUT_OF_RANGE', '日期超出前后7天范围');
    }

    const content = await generateCalendar(userId, dateStr);

    res.json({
      success: true,
      data: content,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
