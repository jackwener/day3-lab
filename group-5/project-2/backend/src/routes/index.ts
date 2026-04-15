import { Router } from 'express';
import { authRoutes } from './auth';
import { userRoutes } from './user';
import { calendarRoutes } from './calendar';
import { divinationRoutes } from './divination';
import { destinyRoutes } from './destiny';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/user', userRoutes);
routes.use('/calendar', calendarRoutes);
routes.use('/divination', divinationRoutes);
routes.use('/destiny', destinyRoutes);
