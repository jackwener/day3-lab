import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getToday, getByDate } from '../controllers/calendarController';

export const calendarRoutes = Router();

calendarRoutes.get('/today', auth as any, getToday as any);
calendarRoutes.get('/:date', auth as any, getByDate as any);
