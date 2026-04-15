import { Router } from 'express';
import { auth } from '../middleware/auth';
import { postAnalyze, getHistory } from '../controllers/destinyController';

export const destinyRoutes = Router();

destinyRoutes.post('/analyze', auth as any, postAnalyze as any);
destinyRoutes.get('/history', auth as any, getHistory as any);
