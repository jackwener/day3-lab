import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Prisma unique constraint
  if ((err as any).code === 'P2002') {
    const field = (err as any).meta?.target?.[0] || 'field';
    res.status(409).json({
      success: false,
      error: { code: `${field.toUpperCase()}_EXISTS`, message: `${field}已存在` },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Prisma not found
  if ((err as any).code === 'P2025') {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '资源不存在' },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    timestamp: new Date().toISOString(),
  });
}
