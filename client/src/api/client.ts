import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// 自动附加消费者 Token（如果有）
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('customer_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    // 401 / 403 → token 过期，清除凭证并跳转登录页（保留返回地址）
    if (status === 401 || status === 403) {
      localStorage.removeItem('customer_token');
      if (typeof window !== 'undefined') {
        const from = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?from=${from}`;
      }
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    if (error.response?.data?.code === 401) {
      localStorage.removeItem('customer_token');
      if (typeof window !== 'undefined') {
        const from = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?from=${from}`;
      }
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    const message = error.response?.data?.message || '网络请求失败';
    console.error('[API Error]', message);
    return Promise.reject(new Error(message));
  }
);

export default api;
