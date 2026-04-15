import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getProfile, upsertProfile } from '../controllers/userController';

export const userRoutes = Router();

userRoutes.get('/profile', auth as any, getProfile as any);
userRoutes.put('/profile', auth as any, upsertProfile as any);
