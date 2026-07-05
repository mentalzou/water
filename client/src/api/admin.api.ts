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

// Areas (旧配送区域 - 保留兼容)
export const getAreas = () => adminApi.get('/areas');
export const createArea = (data: any) => adminApi.post('/areas', data);
export const updateArea = (id: string, data: any) => adminApi.put(`/areas/${id}`, data);
export const deleteArea = (id: string) => adminApi.delete(`/areas/${id}`);

// Regions (省市区管理)
export const getRegions = () => adminApi.get('/regions');
export const getRegionsFlat = () => adminApi.get('/regions/flat');
export const createRegion = (data: { name: string; parent_id?: string }) =>
  adminApi.post('/regions', data);
export const updateRegion = (id: string, data: { name?: string; sort_order?: number; status?: string }) =>
  adminApi.put(`/regions/${id}`, data);
export const deleteRegion = (id: string) => adminApi.delete(`/regions/${id}`);

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

export const closeOrder = (id: string) =>
  adminApi.post(`/orders/${id}/close`);

// Configs
export const getConfigs = () => adminApi.get('/configs');
export const updateConfig = (key: string, value: string) =>
  adminApi.put('/configs', { key, value });

// Delivery Fee Rules
export const getDeliveryFeeRules = () => adminApi.get('/delivery-fee-rules');
export const createDeliveryFeeRule = (data: { building_type: string; floor_from: number; floor_to: number; fee: number }) =>
  adminApi.post('/delivery-fee-rules', data);
export const updateDeliveryFeeRule = (id: string, data: any) =>
  adminApi.put(`/delivery-fee-rules/${id}`, data);
export const deleteDeliveryFeeRule = (id: string) =>
  adminApi.delete(`/delivery-fee-rules/${id}`);

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
export const getRechargeOrders = (params?: {
  page?: number; pageSize?: number; status?: string;
  keyword?: string; package_id?: string; start_date?: string; end_date?: string;
}) =>
    adminApi.get('/recharge/orders', { params });
export const queryRechargePayment = (id: string) =>
    adminApi.post(`/recharge/orders/${id}/query-payment`);
export const refundRecharge = (id: string) =>
    adminApi.post(`/recharge/orders/${id}/refund`);
export const queryRechargeRefund = (id: string) =>
    adminApi.post(`/recharge/orders/${id}/query-refund`);
export const getRechargeStats = (params?: { start_date?: string; end_date?: string }) =>
    adminApi.get('/recharge/stats', { params });
export const getBalanceTransactions = (params: { user_id: string; page?: number; pageSize?: number; tx_type?: string; start_date?: string; end_date?: string }) =>
    adminApi.get('/recharge/transactions', { params });

// User Recharge Balance
export const getUserRechargeBalance = (userId: string) =>
    adminApi.get(`/users/${userId}/recharge-balance`);

// Commission Management
export const getCommissions = (params: {
  page?: number; pageSize?: number; order_no?: string;
  start_date?: string; end_date?: string; status?: string;
  payout_start_date?: string; payout_end_date?: string; distributor_id?: string;
}) => adminApi.get('/commissions', { params });

export const getCommissionStats = (params: {
  order_no?: string; start_date?: string; end_date?: string; status?: string;
  payout_start_date?: string; payout_end_date?: string; distributor_id?: string;
}) => adminApi.get('/commissions/stats', { params });

export const exportCommissions = (params: {
  order_no?: string; start_date?: string; end_date?: string; status?: string;
  payout_start_date?: string; payout_end_date?: string; distributor_id?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
  return adminApi.get(`/commissions/export?${query.toString()}`, { responseType: 'blob' });
};

export const exportPayoutRecord = (params: {
  order_no?: string; start_date?: string; end_date?: string;
  payout_start_date?: string; payout_end_date?: string; distributor_id?: string;
}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, v); });
  return adminApi.get(`/commissions/payout/export?${query.toString()}`, { responseType: 'blob' });
};

export const importPayoutRecord = (data: { batch_no: string; payout_date: string; commission_ids?: string[] }) =>
  adminApi.post('/commissions/payout/import', data);
