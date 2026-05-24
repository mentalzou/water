import api from './client';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

/** 带认证的请求封装 */
function authFetch(url: string, options?: RequestInit): Promise<any> {
  const token = localStorage.getItem('deliveryman_token');
  return api.get(url.replace(API_BASE + '/', ''), {
    headers: {
      Authorization: `Bearer ${token}`,
    } as Record<string, string>,
  });
}

// 注意：实际使用时直接用 fetch + token 即可
// 这里保留接口定义供其他地方引用

export const deliverymanApi = {
  login: (phone: string, password: string): Promise<any> =>
    fetch(`${API_BASE}/deliverymen/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    }).then(r => r.json()),

  getTaskList: (id: string, status?: string, token?: string): Promise<any> => {
    let url = `${API_BASE}/deliverymen/${id}/tasks`;
    if (status) url += `?status=${status}`;
    return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
  },

  getTaskDetail: (taskId: string, token?: string): Promise<any> =>
    fetch(`${API_BASE}/tasks/${taskId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),

  acceptTask: (taskId: string, token?: string): Promise<any> =>
    fetch(`${API_BASE}/tasks/${taskId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),

  completeTask: (taskId: string, token?: string): Promise<any> =>
    fetch(`${API_BASE}/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` } ,
    }).then(r => r.json()),
};
