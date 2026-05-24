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
    const message = error.response?.data?.message || '网络请求失败';
    console.error('[API Error]', message);
    return Promise.reject(new Error(message));
  }
);

export default api;
