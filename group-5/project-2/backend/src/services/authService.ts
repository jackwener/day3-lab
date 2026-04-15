import jwt from 'jsonwebtoken';
import { config } from '../config/env';

interface TokenPayload {
  userId: number;
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId } as TokenPayload, config.jwtSecret, { expiresIn: '24h' });
}

export function generateRefreshToken(userId: number): string {
  return jwt.sign({ userId } as TokenPayload, config.jwtRefreshSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
}
