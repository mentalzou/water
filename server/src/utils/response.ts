import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

export function success<T>(res: Response, data: T, message = '操作成功', code = 200): void {
  const response: ApiResponse<T> = { code: 200, message, data };
  res.status(code).json(response);
}

export function paginated<T>(res: Response, data: T[], page: number, pageSize: number, total: number, message = '查询成功'): void {
  const totalPages = Math.ceil(total / pageSize) || 1;
  const response: PaginatedResponse<T> = {
    code: 200,
    message,
    data,
    pagination: { page, pageSize, total, totalPages },
  };
  res.status(200).json(response);
}

export function error(res: Response, message = '服务器内部错误', code = 500): void {
  res.status(code).json({ code, message, data: null });
}

export function notFound(res: Response, message = '资源不存在'): void {
  error(res, message, 404);
}

export function unauthorized(res: Response, message = '未授权访问'): void {
  error(res, message, 401);
}

export function forbidden(res: Response, message = '权限不足'): void {
  error(res, message, 403);
}

export function badRequest(res: Response, message = '请求参数错误'): void {
  error(res, message, 400);
}
