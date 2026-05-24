import api from './client';

export const customerApi = {
  // 认证
  login: (phone: string, password: string) =>
    api.post('/customers/login', { phone, password }),
  register: (data: { phone: string; password: string; name?: string }) =>
    api.post('/customers/register', data),

  // 个人中心 - 密码修改
  changePassword: (oldPassword: string, newPassword: string) =>
    api.put('/customers/password', { old_password: oldPassword, new_password: newPassword }),

  // 个人中心 - 收货地址
  getAddresses: () => api.get('/addresses'),
  addAddress: (data: { contact_name: string; contact_phone: string; province?: string; city?: string; district?: string; detail: string; is_default?: number }) =>
    api.post('/addresses', data),
  updateAddress: (id: string, data: any) =>
    api.put(`/addresses/${id}`, data),
  deleteAddress: (id: string) =>
    api.delete(`/addresses/${id}`),

  // 商品
  getProducts: () => api.get('/products'),

  // 订单（兼容旧接口）
  createOrder: (data: {
    customer_phone: string;
    customer_name?: string;
    address: string;
    items?: { product_id: string; quantity: number }[];
    product_id?: string;
    quantity?: number;
    distributor_code?: string;
  }) => api.post('/orders', data),

  getOrderById: (id: string) => api.get(`/orders/${id}`),

  getMyOrders: (phone: string, page = 1, pageSize = 20) =>
    api.get(`/my-orders?phone=${phone}&page=${page}&pageSize=${pageSize}`),

  // 通过分销商ID查询订单
  getOrdersByDistributorId: (distributorId: string, page = 1, pageSize = 20) =>
    api.get(`/my-orders?distributor_id=${distributorId}&page=${page}&pageSize=${pageSize}`),

  payForOrder: (orderId: string) => api.post(`/orders/${orderId}/pay`),
};
