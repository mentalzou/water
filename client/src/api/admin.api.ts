import api from './client';
import axios from 'axios';

const adminApi = axios.create({
  baseURL: '/api/admin',
  timeout: 15000,
});

// 自动附加管理员 Token
adminApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

adminApi.interceptors.response.use(
  (response: any) => response.data,
  (error: any) => {
    const status = error.response?.status;
    // 401 / 403 → token 过期，清除凭证并跳转登录页
    if (status === 401 || status === 403) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    // 业务 code 401
    if (error.response?.data?.code === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    const message = error.response?.data?.message || '网络请求失败';
    return Promise.reject(new Error(message));
  }
);

export default adminApi;

// Auth
export const loginAdmin = (password: string) =>
  adminApi.post('/auth/login', { password });

// Dashboard
export const getDashboard = () => adminApi.get('/dashboard');

// Distributors
export const getDistributors = (page = 1, pageSize = 20) =>
  adminApi.get(`/distributors?page=${page}&pageSize=${pageSize}`);
  
export const createDistributor = (data: any) =>
  adminApi.post('/distributors', data);
  
export const updateDistributor = (id: string, data: any) =>
  adminApi.put(`/distributors/${id}`, data);
  
export const deleteDistributor = (id: string) =>
  adminApi.delete(`/distributors/${id}`);

// Deliverymen
export const getDeliverymen = (page = 1, pageSize = 20) =>
  adminApi.get(`/deliverymen?page=${page}&pageSize=${pageSize}`);
  
export const createDeliveryman = (data: any) =>
  adminApi.post('/deliverymen', data);
  
export const updateDeliveryman = (id: string, data: any) =>
  adminApi.put(`/deliverymen/${id}`, data);
  
export const deleteDeliveryman = (id: string) =>
  adminApi.delete(`/deliverymen/${id}`);

// Areas
export const getAreas = () => adminApi.get('/areas');
export const createArea = (data: any) => adminApi.post('/areas', data);
export const updateArea = (id: string, data: any) => adminApi.put(`/areas/${id}`, data);
export const deleteArea = (id: string) => adminApi.delete(`/areas/${id}`);

// Products
export const getProducts = () => adminApi.get('/products');
export const createProduct = (data: any) => adminApi.post('/products', data);
export const updateProduct = (id: string, data: any) => adminApi.put(`/products/${id}`, data);
export const deleteProduct = (id: string) => adminApi.delete(`/products/${id}`);

// Orders
export const getOrders = (page = 1, pageSize = 20, status?: string) => {
  let url = `/orders?page=${page}&pageSize=${pageSize}`;
  if (status) url += `&status=${status}`;
  return adminApi.get(url);
};

// Configs
export const getConfigs = () => adminApi.get('/configs');
export const updateConfig = (key: string, value: string) =>
  adminApi.put('/configs', { key, value });

// Recharge Packages
export const getRechargePackages = () => adminApi.get('/recharge/packages');
export const createRechargePackage = (data: any) =>
    adminApi.post('/recharge/packages', data);
export const updateRechargePackage = (id: string, data: any) =>
    adminApi.put(`/recharge/packages/${id}`, data);
export const updateRechargePackageStatus = (id: string, status: string) =>
    adminApi.put(`/recharge/packages/${id}/status`, { status });
export const deleteRechargePackage = (id: string) =>
    adminApi.delete(`/recharge/packages/${id}`);

// Recharge Orders & Reports
export const getRechargeOrders = (params?: { page?: number; pageSize?: number; status?: string }) =>
    adminApi.get('/recharge/orders', { params });
export const getRechargeStats = (params?: { start_date?: string; end_date?: string }) =>
    adminApi.get('/recharge/stats', { params });
export const getBalanceTransactions = (params: { user_id: string; page?: number; pageSize?: number }) =>
    adminApi.get('/recharge/transactions', { params });
