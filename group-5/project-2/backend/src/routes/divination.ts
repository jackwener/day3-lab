import { Router } from 'express';
import { auth } from '../middleware/auth';
import { qimenRateLimiter, liurenRateLimiter } from '../middleware/rateLimiter';
import { postQimen, postLiuren, getHistory } from '../controllers/divinationController';

export const divinationRoutes = Router();

divinationRoutes.post('/qimen', auth as any, qimenRateLimiter as any, postQimen as any);
divinationRoutes.post('/liuren', auth as any, liurenRateLimiter as any, postLiuren as any);
divinationRoutes.get('/history', auth as any, getHistory as any);
