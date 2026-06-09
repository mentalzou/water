import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { unauthorized } from '../utils/response';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  // 优先从 Authorization 头取 token，其次从 query 参数取（便于文件下载等场景）
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  if (!token && typeof req.query.token === 'string' && req.query.token.length > 0) {
    token = req.query.token;
  }
  if (!token) {
    unauthorized(res, '缺少认证Token');
    return;
  }
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
