import { Request, Response, NextFunction } from 'express';
import { error } from '../utils/response';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  console.error(err.stack);
  error(res, '服务器内部错误', 500);
}
