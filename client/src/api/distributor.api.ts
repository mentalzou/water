import axios from 'axios';

// 分销商专用 axios 实例，使用 distributor_token
const distributorClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

distributorClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('distributor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

distributorClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || '网络请求失败';
    console.error('[Distributor API Error]', message);
    return Promise.reject(new Error(message));
  }
);

export const distributorApi = {
  getInfo: (code: string) => distributorClient.get(`/distributors/${code}`),

  getShareLink: (id: string) => distributorClient.get(`/distributors/${id}/share`),

  getCommissionSummary: (id: string) =>
    distributorClient.get(`/distributors/${id}/commission/summary`),

  getCommissionRecords: (id: string, page = 1, pageSize = 20) =>
    distributorClient.get(`/distributors/${id}/commissions?page=${page}&pageSize=${pageSize}`),
};
