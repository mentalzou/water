import { Request, Response } from 'express';
import { success, error, paginated } from '../utils/response';
import { productModel } from '../models/product.model';
import { orderModel } from '../models/order.model';
import { distributorModel } from '../models/distributor.model';
import { userModel } from '../models/user.model';
import addressModel from '../models/address.model';
import { createCustomerOrder, processPaymentSuccess } from '../services/order.service';
import { generateToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { getUserPointsRecords, getPointsConfig, changePoints } from '../services/points.service';
import { getDb } from '../utils/db';

/** 安全提取 req.body 中的字符串值 */
function str(val: unknown): string {
  return Array.isArray(val) ? val[0] || '' : String(val || '');
}

// ============ Customer Auth ============
export function customerLogin(req: Request, res: Response): void {
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');

  if (!phone || !password) {
    error(res, '请输入手机号和密码');
    return;
  }

  const user = userModel.findByPhone(phone);
  if (!user) {
    error(res, '账号不存在，请先注册', 404);
    return;
  }

  if (!user.password_hash) {
    error(res, '该账号未设置密码，请使用手机号注册', 400);
    return;
  }

  if (!verifyPassword(password, user.password_hash)) {
    error(res, '密码错误', 401);
    return;
  }

  if (user.status !== 'active') {
    error(res, '账号已被禁用', 403);
    return;
  }

  // 首次明文密码自动升级为哈希
  if (user.password_hash && user.password_hash.length <= 20) {
    userModel.update(user.id, { password_hash: hashPassword(password) });
  }

  const token = generateToken({ userId: user.id, role: user.role });
  success(res, {
    token,
    userId: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    open_id: (user as any).open_id || '',
  }, '登录成功');
}

/**
 * 微信 OAuth code 换取 openId
 * 支持小程序 wx.login() 的 code 和公众号 OAuth 的 code
 */
export async function getWechatOpenId(req: Request, res: Response): Promise<void> {
  try {
    const code = String(req.body.code || '').trim();
    const type = String(req.body.type || 'oa').trim(); // 'oa' = 公众号, 'miniprogram' = 小程序

    if (!code) {
      error(res, '缺少微信授权码(code)');
      return;
    }

    const db = getDb();
    const appId = (db.prepare("SELECT value FROM system_config WHERE key='wx_app_id'").get() as any)?.value || process.env.WECHAT_APP_ID || '';
    const appSecret = (db.prepare("SELECT value FROM system_config WHERE key='wx_app_secret'").get() as any)?.value || process.env.WECHAT_APP_SECRET || '';

    if (!appId || !appSecret) {
      error(res, '微信配置未初始化，请在管理后台配置 wx_app_id 和 wx_app_secret');
      return;
    }

    let apiUrl: string;
    if (type === 'miniprogram') {
      // 小程序: code2session
      apiUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
    } else {
      // 公众号: sns/oauth2/access_token
      apiUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`;
    }

    console.log('[WechatOpenId] Requesting:', apiUrl.replace(appSecret, '***'));

    const response = await fetch(apiUrl);
    const data: any = await response.json();

    if (data.errcode && data.errcode !== 0) {
      console.error('[WechatOpenId] WeChat API error:', data);
      error(res, `获取微信openId失败: ${data.errmsg || 'unknown error'}`);
      return;
    }

    const openId = data.openid;
    if (!openId) {
      error(res, '未获取到微信openId');
      return;
    }

    console.log('[WechatOpenId] Got openId:', openId);

    // 尝试将 openId 更新到当前登录的用户记录中
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const jwt = require('../utils/jwt');
        const decoded = jwt.verifyToken(token);
        if (decoded?.userId) {
          const db2 = getDb();
          db2.prepare('UPDATE users SET open_id = ? WHERE id = ?').run(openId, decoded.userId);
          console.log('[WechatOpenId] Updated open_id for user:', decoded.userId);
        }
      } catch {
        // Token 无效或未登录，仅返回 openId
      }
    }

    success(res, { openid: openId, open_id: openId }, '获取openId成功');
  } catch (err: any) {
    console.error('[WechatOpenId] Error:', err);
    error(res, err.message || '获取openId失败');
  }
}

export function customerRegister(req: Request, res: Response): void {
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');
  const name = String(req.body.name || '').trim();

  if (!phone || !password) {
    error(res, '请输入手机号和密码');
    return;
  }
  if (phone.length < 11) {
    error(res, '请输入正确的手机号');
    return;
  }
  if (password.length < 6) {
    error(res, '密码至少6位');
    return;
  }

  const existing = userModel.findByPhone(phone);
  if (existing) {
    error(res, '该手机号已注册', 409);
    return;
  }

  const user = userModel.create({
    phone,
    name: name || '',
    role: 'customer',
    password_hash: hashPassword(password),
    status: 'active',
  });

  const token = generateToken({ userId: user.id, role: 'customer' });
  success(res, {
    token,
    userId: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    open_id: '',
  }, '注册成功');
}

// ============ Products ============
export function getProducts(_req: Request, res: Response): void {
  success(res, productModel.findAll(true));
}

// ============ Orders ============
export function createOrder(req: Request, res: Response): void {
  const { customer_phone, customer_name, address, items, distributor_code, pay_method } = req.body;
  
  // 验证必填字段
  if (!customer_phone || !address) {
    error(res, '请填写完整订单信息（手机号、地址）');
    return;
  }

  // 验证商品列表
  if (!items || !Array.isArray(items) || items.length === 0) {
    error(res, '请选择至少一个商品');
    return;
  }

  // 转换商品格式
  const orderItems = items.map((item: any) => ({
    product_id: item.product_id,
    quantity: parseInt(String(item.quantity || 1)),
  }));

  // 查找分销商
  let distributorId: string | undefined;
  if (distributor_code) {
    const dist = distributorModel.findByCode(distributor_code);
    if (dist) distributorId = dist.id;
  }

  const userId = (req as any).user?.userId;
  const payMethod = (pay_method === 'balance' ? 'balance' : 'online') as 'online' | 'balance';

  // 余额支付需要登录
  if (payMethod === 'balance' && !userId) {
    error(res, '请先登录', 401);
    return;
  }

  // 创建订单（支持多商品 + 支付方式）
  const result = createCustomerOrder({
    customer_phone,
    customer_name: customer_name || '',
    address,
    items: orderItems,
    distributor_id: distributorId,
    user_id: userId,
    pay_method: payMethod,
  });

  if (!result) {
    error(res, '创建订单失败，请检查商品信息');
    return;
  }

  // 余额支付失败（余额不足等）
  if (result.balanceError) {
    error(res, result.balanceError, 400);
    return;
  }

  // 余额支付成功时，直接标记已支付
  if (payMethod === 'balance' && result.order) {
    const paidOrder = processPaymentSuccess(result.order.id, `BALANCE_${Date.now()}`);
    success(res, paidOrder, '订单创建成功，已从余额扣除');
    return;
  }

  success(res, result.order, '订单创建成功');
}

export function getOrderById(req: Request, res: Response): void {
  const id = str(req.params.id);
  const order = orderModel.findByIdDetailed(id);
  if (!order) { error(res, '订单不存在', 404); return; }
  success(res, order);
}

export function getMyOrders(req: Request, res: Response): void {
  // 优先使用 query 中的 phone，不再用 userId 当手机号
  const phone = (req.query.phone as string) || '';
  const distributorId = req.query.distributor_id as string;
  
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  
  // 如果有 distributor_id，优先按分销商查询
  if (distributorId) {
    const { data, total } = orderModel.findByDistributorId(distributorId, page, pageSize);
    paginated(res, data, page, pageSize, total);
    return;
  }
  
  // 否则按手机号查询
  if (!phone) { error(res, '请提供手机号或分销商ID'); return; }
  const { data, total } = orderModel.findByPhone(phone as string, page, pageSize);
  paginated(res, data, page, pageSize, total);
}

// ============ Payment (Mock) ============
export function payForOrder(req: Request, res: Response): void {
  const id = str(req.params.id);
  const order = orderModel.findById(id);
  if (!order) { error(res, '订单不存在', 404); return; }

  // In production: call WeChat Pay API
  // For dev mode: simulate payment success
  const updated = processPaymentSuccess(id, `MOCK_TXN_${Date.now()}`);

  success(res, {
    ...updated,
    paymentUrl: null, // In production this would be the h5_url
    mockMode: true,
  }, '支付成功（模拟模式）');
}

// ============ Password Change ============
export function changePassword(req: Request, res: Response): void {
  const userId = (req as any).user?.userId;
  if (!userId) { error(res, '未登录', 401); return; }

  const oldPassword = str(req.body.old_password);
  const newPassword = str(req.body.new_password);

  if (!oldPassword || !newPassword) {
    error(res, '请输入旧密码和新密码');
    return;
  }
  if (newPassword.length < 6) {
    error(res, '新密码至少6位');
    return;
  }

  const user = userModel.findById(userId);
  if (!user) { error(res, '用户不存在', 404); return; }

  if (user.password_hash && !verifyPassword(oldPassword, user.password_hash)) {
    error(res, '旧密码错误', 401);
    return;
  }

  userModel.update(userId, { password_hash: hashPassword(newPassword) });
  success(res, null, '密码修改成功');
}

// ============ Address Management ============
function getAddressUserId(req: Request): string | null {
  // 支持从 token 或 query 参数获取
  return (req as any).user?.userId || req.query.user_id as string || null;
}

export function getAddresses(req: Request, res: Response): void {
  const userId = getAddressUserId(req);
  if (!userId) { error(res, '未登录', 401); return; }
  success(res, addressModel.findByUserId(userId));
}

export function addAddress(req: Request, res: Response): void {
  const userId = getAddressUserId(req);
  if (!userId) { error(res, '未登录', 401); return; }

  const contact_name = str(req.body.contact_name);
  const contact_phone = str(req.body.contact_phone);
  const detail = str(req.body.detail);

  if (!contact_name || !contact_phone || !detail) {
    error(res, '请填写完整地址信息（联系人、手机号、详细地址）');
    return;
  }

  const address = addressModel.create({
    user_id: userId,
    contact_name,
    contact_phone,
    province: str(req.body.province),
    city: str(req.body.city),
    district: str(req.body.district),
    detail,
    is_default: req.body.is_default ? 1 : 0,
  });

  success(res, address, '添加成功');
}

export function updateAddress(req: Request, res: Response): void {
  const userId = getAddressUserId(req);
  if (!userId) { error(res, '未登录', 401); return; }

  const id = str(req.params.id);
  const existing = addressModel.findById(id);
  if (!existing || existing.user_id !== userId) {
    error(res, '地址不存在', 404);
    return;
  }

  const data: any = {};
  if (req.body.contact_name) data.contact_name = str(req.body.contact_name);
  if (req.body.contact_phone) data.contact_phone = str(req.body.contact_phone);
  if (req.body.province !== undefined) data.province = str(req.body.province);
  if (req.body.city !== undefined) data.city = str(req.body.city);
  if (req.body.district !== undefined) data.district = str(req.body.district);
  if (req.body.detail) data.detail = str(req.body.detail);
  if (req.body.is_default !== undefined) data.is_default = req.body.is_default ? 1 : 0;

  const updated = addressModel.update(id, data);
  success(res, updated, '更新成功');
}

export function deleteAddress(req: Request, res: Response): void {
  const userId = getAddressUserId(req);
  if (!userId) { error(res, '未登录', 401); return; }

  const id = str(req.params.id);
  if (addressModel.delete(id, userId)) {
    success(res, null, '删除成功');
  } else {
    error(res, '地址不存在或无权删除', 404);
  }
}

// ============ Points Management ============
export function getMyPoints(req: Request, res: Response): void {
  const userId = (req as any).user?.userId;
  if (!userId) { error(res, '未登录', 401); return; }

  const user = userModel.findById(userId);
  if (!user) { error(res, '用户不存在', 404); return; }

  const config = getPointsConfig();
  success(res, {
    points: user.points || 0,
    earnRate: config.earnRate,
    minOrderAmount: config.minOrderAmount,
  });
}

export function getMyPointsRecords(req: Request, res: Response): void {
  const userId = (req as any).user?.userId;
  if (!userId) { error(res, '未登录', 401); return; }

  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;

  const { data, total } = getUserPointsRecords(userId, page, pageSize);
  paginated(res, data, page, pageSize, total);
}

export function usePoints(req: Request, res: Response): void {
  const userId = (req as any).user?.userId;
  if (!userId) { error(res, '未登录', 401); return; }

  const pointsToUse = parseInt(req.body.points || '0');
  if (pointsToUse <= 0) {
    error(res, '请输入有效的积分数量');
    return;
  }

  try {
    const result = changePoints({
      userId,
      changeType: 'spend',
      amount: pointsToUse,
      description: req.body.description || '积分消费',
    });

    success(res, {
      newBalance: result.newBalance,
      usedPoints: pointsToUse,
    }, '积分使用成功');
  } catch (err: any) {
    error(res, err.message || '积分使用失败');
  }
}
