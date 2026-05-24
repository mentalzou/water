import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { unauthorized } from '../utils/response';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    unauthorized(res, '缺少认证Token');
    return;
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    unauthorized(res, 'Token无效或已过期');
    return;
  }
  req.user = payload;
  next();
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}
