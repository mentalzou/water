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

  // 个人中心 - 积分管理
  getMyPoints: () => api.get('/customers/points'),
  getMyPointsRecords: (page = 1, pageSize = 20) =>
      api.get(`/customers/points/records?page=${page}&pageSize=${pageSize}`),
  usePoints: (points: number, description?: string) =>
      api.post('/customers/points/use', { points, description }),

  // 充值相关
  getRechargePackages: () => api.get('/customers/recharge/packages'),
  recharge: (packageId: string) => api.post('/customers/recharge', { package_id: packageId }),
  payForRecharge: (rechargeId: string) => api.post(`/customers/recharge/${rechargeId}/pay`),
  createRechargePayment: (data: { rechargeId: string; openId: string }) =>
      api.post('/payment/recharge/create', data),
  getMyRecharges: (page = 1, pageSize = 20) =>
      api.get(`/customers/recharge/my-recharges?page=${page}&pageSize=${pageSize}`),
  getActiveRecharge: () => api.get('/customers/recharge/active'),
  getUserBalance: () => api.get('/customers/recharge/balance'),

  // 商品和分类
  getProducts: () => api.get('/products'),
  getCategories: () => api.get('/categories'),

  // 订单（兼容旧接口）
  createOrder: (data: {
    customer_phone: string;
    customer_name?: string;
    address: string;
    items?: { product_id: string; quantity: number }[];
    product_id?: string;
    quantity?: number;
    distributor_code?: string;
    pay_method?: 'online' | 'balance';
  }) => api.post('/orders', data),

  getOrderById: (id: string) => api.get(`/orders/${id}`),

  getMyOrders: (phone: string, page = 1, pageSize = 20) =>
    api.get(`/my-orders?phone=${phone}&page=${page}&pageSize=${pageSize}`),

  // 通过分销商ID查询订单
  getOrdersByDistributorId: (distributorId: string, page = 1, pageSize = 20) =>
    api.get(`/my-orders?distributor_id=${distributorId}&page=${page}&pageSize=${pageSize}`),

  payForOrder: (orderId: string) => api.post(`/orders/${orderId}/pay`),

  // 微信支付
  createPayment: (data: { orderId: string; openId: string }) =>
      api.post('/payment/create', data),

  // 微信一键登录 - openId 登录/注册（支持分销商推广码）
  wechatLogin: (openId: string, distributorCode?: string) =>
      api.post('/customers/wechat-login', { openId, distributor_code: distributorCode || '' }),

  // 微信 OAuth - code 换 openId
  getWechatOpenId: (code: string, type: string = 'oa') =>
      api.post('/wechat/openid', { code, type }),
};
