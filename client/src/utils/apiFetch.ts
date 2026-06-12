/**
 * 统一的 fetch 封装，自动处理 401 token 过期 → 跳转登录页
 * 
 * 用法：
 *   import { apiFetch } from '../utils/apiFetch';
 *   const res = await apiFetch('/admin/orders?page=1&pageSize=20', { tokenKey: 'admin_token' });
 */
const LOGIN_PATHS: Record<string, string> = {
  admin_token: '/admin/login',
  distributor_token: '/distributor/login',
  deliveryman_token: '/deliveryman/login',
  customer_token: '/login',
};

export async function apiFetch(
  url: string,
  options: RequestInit & { tokenKey?: string; loginPath?: string; rawResponse?: boolean } = {}
): Promise<any> {
  const { tokenKey = 'admin_token', loginPath, rawResponse, ...fetchOptions } = options;
  const token = localStorage.getItem(tokenKey) || '';

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // 有 body 时自动设置 Content-Type
  if (fetchOptions.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    cache: 'no-store',
  });

  // 401 / 403 → 清除 token 并跳转登录页
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem(tokenKey);
    const target = loginPath || LOGIN_PATHS[tokenKey] || '/login';
    if (typeof window !== 'undefined') {
      window.location.href = target;
    }
    throw new Error('登录已过期，请重新登录');
  }

  // 原始响应模式（用于文件下载等）
  if (rawResponse) {
    return response;
  }

  const text = await response.text();
  try {
    const json = JSON.parse(text);
    // 业务层返回 401（某些接口用 code 而非 status code）
    if (json.code === 401) {
      localStorage.removeItem(tokenKey);
      const target = loginPath || LOGIN_PATHS[tokenKey] || '/login';
      if (typeof window !== 'undefined') {
        window.location.href = target;
      }
      throw new Error('登录已过期，请重新登录');
    }
    return json;
  } catch (e: any) {
    if (e.message === '登录已过期，请重新登录') throw e;
    return null;
  }
}
