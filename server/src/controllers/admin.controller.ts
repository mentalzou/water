import { Request, Response } from 'express';
import { success, paginated, error, notFound } from '../utils/response';
import { productModel } from '../models/product.model';
import { distributorModel } from '../models/distributor.model';
import { deliverymanModel } from '../models/deliveryman.model';
import { areaModel } from '../models/area.model';
import { orderModel } from '../models/order.model';
import { commissionModel } from '../models/commission.model';
import { userModel } from '../models/user.model';
import { roleModel } from '../models/role.model';
import { brandModel } from '../models/brand.model';
import { categoryModel } from '../models/category.model';
import { userRechargeModel } from '../models/userRecharge.model';
import { balanceTransactionModel } from '../models/balanceTransaction.model';
import { queryOrderStatus } from '../services/heliPay.service';
import { getDb } from '../utils/db';
import config from '../config';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { generateToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { changePoints, getUserPointsRecords } from '../services/points.service';

/** 安全提取 req.body 中的字符串值 */
function str(val: unknown): string {
  return Array.isArray(val) ? val[0] || '' : String(val || '');
}

// ============ Dashboard ============
export function getDashboard(_req: Request, res: Response): void {
  const db = getDb();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStr = todayStart.toISOString().split('T')[0];

  const todayOrders = (db.prepare(
      "SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count FROM orders WHERE pay_status = 'paid' AND date(created_at) = ?"
  ).get(todayStr) as any);

  const totalCustomers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get() as { count: number }).count;
  const activeDistributors = (db.prepare("SELECT COUNT(*) as count FROM distributors WHERE status = 'active'").get() as { count: number }).count;
  const pendingDelivery = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('paid','pending_delivery','assigned','delivering')").get() as { count: number }).count;

  // Recent orders
  const recentOrders = db.prepare(
      `SELECT o.order_no, o.customer_name, o.customer_phone, o.total_amount, o.status,
              (SELECT GROUP_CONCAT(oi.product_name, ', ') FROM order_items oi WHERE oi.order_id = o.id) as product_name
       FROM orders o
       ORDER BY o.created_at DESC LIMIT 10`
  ).all();

  // Top distributors
  const topDistributors = db.prepare(
      `SELECT d.code, u.name, d.total_commission
       FROM distributors d LEFT JOIN users u ON d.user_id = u.id
       ORDER BY d.total_commission DESC LIMIT 5`
  ).all();

  success(res, {
    todayRevenue: todayOrders.total,
    todayOrderCount: todayOrders.count,
    totalCustomers,
    activeDistributors,
    pendingDelivery,
    recentOrders,
    topDistributors,
  });
}

// ============ Distributors ============
export function createDistributor(req: Request, res: Response): void {
  const name = str(req.body.name);
  const phone = str(req.body.phone);
  const password = str(req.body.password);
  if (!name || !phone) {
    error(res, '请提供姓名和手机号');
    return;
  }
  if (!password || password.length < 6) {
    error(res, '密码长度不能少于6位');
    return;
  }
  const result = distributorModel.create('', { name, phone, password });
  success(res, result, '分销商创建成功');
}

export function listDistributors(req: Request, res: Response): void {
  const page = parseInt(str(req.query.page)) || 1;
  const pageSize = parseInt(str(req.query.pageSize)) || 20;
  const options: { keyword?: string; status?: string } = {};
  if (req.query.keyword) options.keyword = str(req.query.keyword);
  if (req.query.status) options.status = str(req.query.status);
  const { data, total } = distributorModel.findAll(page, pageSize, options);
  paginated(res, data, page, pageSize, total);
}

export function updateDistributor(req: Request, res: Response): void {
  const id = str(req.params.id);
  const result = distributorModel.update(id, req.body as any);
  if (!result) return notFound(res);

  // Sync status to user table
  if (req.body.status && (result as any).user_id) {
    userModel.update((result as any).user_id, { status: req.body.status });
  }

  success(res, result, '更新成功');
}

export function deleteDistributor(req: Request, res: Response): void {
  const id = str(req.params.id);
  distributorModel.delete(id);
  success(res, null, '删除成功');
}

export function resetDistributorPassword(req: Request, res: Response): void {
  const distId = str(req.params.id);
  const newPassword = str(req.body.newPassword);
  if (!newPassword || newPassword.length < 6) {
    error(res, '新密码长度不能少于6位');
    return;
  }
  const dist = distributorModel.findByIdWithUser(distId);
  if (!dist || !dist.user_id) return notFound(res);
  userModel.update(dist.user_id as string, { password_hash: hashPassword(newPassword) });
  success(res, null, '密码已重置');
}

// ============ Deliverymen ============
export function createDeliveryman(req: Request, res: Response): void {
  const name = str(req.body.name);
  const phone = str(req.body.phone);
  const password = str(req.body.password);
  if (!name || !phone) {
    error(res, '请提供姓名和手机号');
    return;
  }
  if (!password || password.length < 6) {
    error(res, '密码长度不能少于6位');
    return;
  }
  const area_ids = Array.isArray(req.body.area_ids) ? req.body.area_ids : [];
  const province = str(req.body.province);
  const city = str(req.body.city);
  const district = str(req.body.district);

  if (!province || !city || !district) {
    error(res, '请选择省/市/区');
    return;
  }

  const result = deliverymanModel.create({ name, phone, area_ids, province, city, district, password });
  success(res, result, '派送员创建成功');
}

export function listDeliverymen(req: Request, res: Response): void {
  const page = parseInt(str(req.query.page)) || 1;
  const pageSize = parseInt(str(req.query.pageSize)) || 20;
  const { data, total } = deliverymanModel.findAll(page, pageSize);
  paginated(res, data, page, pageSize, total);
}

export function updateDeliveryman(req: Request, res: Response): void {
  const id = str(req.params.id);
  const result = deliverymanModel.update(id, req.body as any);
  if (!result) return notFound(res);

  // Sync status to user table
  if (req.body.status && result.user_id) {
    userModel.update(result.user_id as string, { status: req.body.status });
  }

  success(res, result, '更新成功');
}

export function deleteDeliveryman(req: Request, res: Response): void {
  const id = str(req.params.id);
  deliverymanModel.delete(id);
  success(res, null, '删除成功');
}

export function resetDeliverymanPassword(req: Request, res: Response): void {
  const dmId = str(req.params.id);
  const newPassword = str(req.body.newPassword);
  if (!newPassword || newPassword.length < 6) {
    error(res, '新密码长度不能少于6位');
    return;
  }
  const dm = deliverymanModel.findByIdWithUser(dmId);
  if (!dm) return notFound(res);

  // If no linked user, find or create one (for legacy data)
  let userId = dm.user_id;
  if (!userId) {
    const db = getDb();
    // Check if user already exists with this phone
    const existingUser = db.prepare('SELECT id FROM users WHERE phone = ?').get(dm.phone) as any;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      userId = uuidv4();
      db.prepare('INSERT INTO users (id, phone, name, role, status, password_hash) VALUES (?, ?, ?, ?, ?, ?)').run(
          userId, dm.phone, dm.name, 'deliveryman', dm.status || 'active', hashPassword(newPassword),
      );
    }
    // Update password regardless (in case we found existing user)
    userModel.update(userId, { password_hash: hashPassword(newPassword) });
    // Link user to deliveryman
    db.prepare("UPDATE deliverymen SET user_id = ? WHERE id = ?").run(userId, dmId);
    success(res, null, '密码已重置');
    return;
  }

  userModel.update(userId as string, { password_hash: hashPassword(newPassword) });
  success(res, null, '密码已重置');
}

// ============ Areas ============
export function createArea(req: Request, res: Response): void {
  const name = str(req.body.name);
  if (!name) { error(res, '请提供区域名称'); return; }
  const description = str(req.body.description);
  const deliveryman_ids = Array.isArray(req.body.deliveryman_ids) ? req.body.deliveryman_ids : [];
  const result = areaModel.create({ name, description, deliveryman_ids });
  success(res, result, '区域创建成功');
}

export function listAreas(_req: Request, res: Response): void {
  success(res, areaModel.findAll());
}

export function updateArea(req: Request, res: Response): void {
  const id = str(req.params.id);
  const result = areaModel.update(id, req.body as any);
  if (!result) return notFound(res);
  success(res, result, '更新成功');
}

export function deleteArea(req: Request, res: Response): void {
  const id = str(req.params.id);
  areaModel.delete(id);
  success(res, null, '删除成功');
}

// ============ Categories ============
export function createCategory(req: Request, res: Response): void {
  const name = str(req.body.name);
  const code = str(req.body.code);
  if (!name || !code) { error(res, '请提供分类名称和编码'); return; }
  const description = str(req.body.description);
  const icon = str(req.body.icon);
  const result = categoryModel.create({ name, code, description, icon });
  success(res, result, '分类创建成功');
}

export function listCategories(req: Request, res: Response): void {
  const keyword = req.query.keyword ? str(req.query.keyword) : undefined;
  success(res, categoryModel.findAll(false, keyword));
}

export function updateCategory(req: Request, res: Response): void {
  const id = str(req.params.id);
  const result = categoryModel.update(id, req.body as any);
  if (!result) return notFound(res);
  success(res, result, '更新成功');
}

export function deleteCategory(req: Request, res: Response): void {
  const id = str(req.params.id);
  categoryModel.delete(id);
  success(res, null, '删除成功');
}

export function listCategoriesForSelect(_req: Request, res: Response): void {
  success(res, categoryModel.findForSelect());
}

// ============ Brands ============
export function createBrand(req: Request, res: Response): void {
  const name = str(req.body.name);
  if (!name) { error(res, '请提供品牌名称'); return; }
  const description = str(req.body.description);
  const logo = str(req.body.logo);
  const category_id = req.body.category_id ? str(req.body.category_id) : undefined;
  const result = brandModel.create({ name, description, logo, category_id });
  success(res, result, '品牌创建成功');
}

export function listBrands(req: Request, res: Response): void {
  const keyword = req.query.keyword ? str(req.query.keyword) : undefined;
  const categoryId = req.query.category_id ? str(req.query.category_id) : undefined;
  success(res, brandModel.findAll(false, keyword, categoryId));
}

export function updateBrand(req: Request, res: Response): void {
  const id = str(req.params.id);
  const result = brandModel.update(id, req.body as any);
  if (!result) return notFound(res);
  success(res, result, '更新成功');
}

export function deleteBrand(req: Request, res: Response): void {
  const id = str(req.params.id);
  brandModel.delete(id);
  success(res, null, '删除成功');
}

export function listBrandsForSelect(_req: Request, res: Response): void {
  success(res, brandModel.findForSelect());
}

// ============ 产品图片上传 ============
const productUploadDir = path.join(config.upload.baseDir, config.upload.productDir);
if (!fs.existsSync(productUploadDir)) {
  fs.mkdirSync(productUploadDir, { recursive: true });
}

const productStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, productUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const productFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (config.upload.imageExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`仅支持图片格式：${config.upload.imageExts.join(', ')}`));
  }
};

export const productUpload = multer({
  storage: productStorage,
  fileFilter: productFileFilter,
  limits: { fileSize: config.upload.maxSize },
});

/** 上传产品图片 */
export function uploadProductImage(req: Request, res: Response): void {
  if (!req.file) {
    error(res, '请选择图片文件');
    return;
  }
  const url = `/uploads/${config.upload.productDir}/${req.file.filename}`;
  success(res, { url }, '上传成功');
}

// ============ Products ============
export function createProduct(req: Request, res: Response): void {
  const name = str(req.body.name);
  const price = Number(req.body.price);
  const unit = str(req.body.unit);
  const description = str(req.body.description);
  const image = str(req.body.image);
  const brandId = req.body.brand_id ? str(req.body.brand_id) : undefined;
  const categoryId = req.body.category_id ? str(req.body.category_id) : undefined;
  if (!name || isNaN(price)) { error(res, '请提供产品名称和价格'); return; }
  const result = productModel.create({ name, description, price, unit, image, brand_id: brandId, category_id: categoryId });
  success(res, result, '产品创建成功');
}

export function listProducts(req: Request, res: Response): void {
  const options: { brandId?: string; categoryId?: string; keyword?: string } = {};
  if (req.query.brand_id) options.brandId = str(req.query.brand_id);
  if (req.query.category_id) options.categoryId = str(req.query.category_id);
  if (req.query.keyword) options.keyword = str(req.query.keyword);
  success(res, productModel.findAll(false, options));
}

export function updateProduct(req: Request, res: Response): void {
  const id = str(req.params.id);
  const result = productModel.update(id, req.body as any);
  if (!result) return notFound(res);
  success(res, result, '更新成功');
}

export function deleteProduct(req: Request, res: Response): void {
  const id = str(req.params.id);
  productModel.delete(id);
  success(res, null, '删除成功');
}

// ============ Orders ============
export function listAllOrders(req: Request, res: Response): void {
  const page = parseInt(str(req.query.page)) || 1;
  const pageSize = parseInt(str(req.query.pageSize)) || 20;
  const status = req.query.status ? str(req.query.status) : undefined;
  const options: { keyword?: string; address?: string; distributor_id?: string; deliveryman_id?: string } = {};
  if (req.query.keyword) options.keyword = str(req.query.keyword);
  if (req.query.address) options.address = str(req.query.address);
  if (req.query.distributor_id) options.distributor_id = str(req.query.distributor_id);
  if (req.query.deliveryman_id) options.deliveryman_id = str(req.query.deliveryman_id);
  const { data, total } = orderModel.findAll(page, pageSize, status, options);
  paginated(res, data, page, pageSize, total);
}

// ============ 订单交易查询（向合利宝查询交易状态） ============
export async function queryOrderPayment(req: Request, res: Response): Promise<void> {
  const id = str(req.params.id);

  // 查询订单
  const order = orderModel.findById(id);
  if (!order) {
    notFound(res);
    return;
  }

  // 只有待支付状态才能查询
  if (order.status !== 'pending') {
    error(res, '仅待支付状态的订单支持交易查询');
    return;
  }

  if (!order.order_no) {
    error(res, '订单缺少订单号');
    return;
  }

  try {
    const result = await queryOrderStatus(order.order_no);

    console.log(`[交易查询] 订单 ${order.order_no} 状态: ${result.status}`);

    // 根据合利宝返回状态更新本地订单
    if (result.status === 'SUCCESS') {
      orderModel.markPaid(order.id, '');
      console.log(`[交易查询] 订单 ${order.order_no} 已自动标记为已支付`);
      success(res, {
        orderNo: result.orderNo,
        helipayStatus: result.status,
        localStatus: 'paid',
        message: '交易查询成功，订单已自动更新为已支付',
      });
    } else {
      success(res, {
        orderNo: result.orderNo,
        helipayStatus: result.status,
        localStatus: order.status,
        message: `交易查询完成，当前合利宝状态: ${result.status}`,
      });
    }
  } catch (err: any) {
    error(res, err.message || '交易查询失败');
  }
}

// ============ 订单退款（向合利宝发起退款） ============
export async function refundOrder(req: Request, res: Response): Promise<void> {
  const id = str(req.params.id);

  // 查询订单
  const order = orderModel.findById(id);
  if (!order) {
    notFound(res);
    return;
  }

  // 只有已付款或待派送状态才能退款
  if (order.status !== 'paid' && order.status !== 'pending_delivery') {
    error(res, '仅已付款状态的订单支持退款');
    return;
  }

  if (!order.order_no) {
    error(res, '订单缺少订单号');
    return;
  }

  const refundAmount = order.total_amount;
  if (!refundAmount || refundAmount <= 0) {
    error(res, '订单金额无效');
    return;
  }

  try {
    const { requestRefund } = require('../services/heliPay.service');
    const result = await requestRefund(order.order_no, refundAmount);

    console.log(`[退款] 订单 ${order.order_no} 退款请求已受理, 退款订单号: ${result.refundOrderNo}, 状态: ${result.orderStatus}`);

    // 退款请求受理成功，订单状态变更为退款中
    orderModel.markRefunding(order.id, result.refundOrderNo);

    success(res, {
      orderNo: result.orderNo,
      refundOrderNo: result.refundOrderNo,
      orderStatus: result.orderStatus,
      message: `退款请求已受理，退款订单号: ${result.refundOrderNo}，合利宝状态: ${result.orderStatus}`,
    });
  } catch (err: any) {
    error(res, err.message || '退款请求失败');
  }
}

// ============ 退款订单查询（向合利宝查询退款状态） ============
export async function queryRefundOrder(req: Request, res: Response): Promise<void> {
  const id = str(req.params.id);

  // 查询订单
  const order = orderModel.findById(id);
  if (!order) {
    notFound(res);
    return;
  }

  // 只有退款中状态才能查询退款
  if (order.status !== 'refunding') {
    error(res, '仅退款中状态的订单支持退款查询');
    return;
  }

  // 从 remark 中解析退款订单号
  const remark = order.remark || '';
  const match = remark.match(/退款订单号:(\d+)/);
  if (!match || !match[1]) {
    error(res, '订单备注中缺少退款订单号，无法查询');
    return;
  }
  const refundOrderNo = match[1];

  try {
    const { queryRefundStatus } = require('../services/heliPay.service');
    const result = await queryRefundStatus(refundOrderNo);

    console.log(`[退款查询] 退款订单号 ${refundOrderNo}, 合利宝状态: ${result.orderStatus}`);

    // 退款成功 → 订单状态变更为已退款
    if (result.orderStatus === 'SUCCESS') {
      orderModel.markRefunded(order.id);
      console.log(`[退款查询] 订单 ${order.order_no} 已自动标记为已退款`);
      success(res, {
        orderNo: result.orderNo,
        refundOrderNo: result.refundOrderNo,
        helipayStatus: result.orderStatus,
        localStatus: 'refunded',
        message: '退款查询成功，退款已完成，订单已更新为已退款',
      });
    } else {
      success(res, {
        orderNo: result.orderNo,
        refundOrderNo: result.refundOrderNo,
        helipayStatus: result.orderStatus,
        localStatus: order.status,
        message: `退款查询完成，当前合利宝状态: ${result.orderStatus}`,
      });
    }
  } catch (err: any) {
    error(res, err.message || '退款查询失败');
  }
}

// ============ 合利宝终端信息 ============

/** 获取合利宝终端信息（密钥脱敏） */
export function getHelipayTerminalInfo(_req: Request, res: Response): void {
  try {
    const { loadTerminalConfig } = require('../config/helipay');
    const config = loadTerminalConfig();

    if (!config) {
      success(res, { exists: false, message: '尚未获取终端信息' });
      return;
    }

    // 脱敏处理：密钥仅显示前后各4位
    const mask = (s: string) => {
      if (!s || s.length <= 8) return '****';
      return s.substring(0, 4) + '****' + s.substring(s.length - 4);
    };

    success(res, {
      exists: true,
      terminal: {
        snNo: config.terminal.snNo,
        userName: config.terminal.userName,
        merchantNo: config.terminal.merchantNo,
        merchantName: config.terminal.merchantName,
      },
      keys: {
        snNo: config.keys.snNo,
        secretKey: mask(config.keys.secretKey),
        signKey: mask(config.keys.signKey),
        updatedAt: config.keys.updatedAt,
        updatedTime: new Date(config.keys.updatedAt).toLocaleString('zh-CN'),
      },
    });
  } catch (e: any) {
    error(res, e.message || '获取终端信息失败');
  }
}

/** 清除合利宝终端信息（DB + 内存），下次支付时将自动重新获取 */
export function deleteHelipayTerminal(_req: Request, res: Response): void {
  try {
    const { clearTerminalConfig } = require('../config/helipay');
    clearTerminalConfig();
    success(res, null, '终端信息已清除，下次支付时将自动重新获取');
  } catch (e: any) {
    error(res, e.message || '清除终端信息失败');
  }
}

// ============ Config ============
export function getConfigs(_req: Request, res: Response): void {
  const db = getDb();
  const configs = db.prepare('SELECT * FROM system_config ORDER BY group_key').all();
  // Group by group_key
  const grouped: Record<string, any[]> = {};
  for (const cfg of configs as any[]) {
    if (!grouped[cfg.group_key]) grouped[cfg.group_key] = [];
    grouped[cfg.group_key].push({
      key: cfg.key,
      value: cfg.type === 'number' ? parseFloat(cfg.value) : cfg.value,
      type: cfg.type,
      description: cfg.description,
    });
  }
  success(res, grouped);
}

export function updateConfig(req: Request, res: Response): void {
  const key = str(req.body.key);
  const value = str(req.body.value);
  if (!key) { error(res, '请提供配置项'); return; }
  const db = getDb();
  db.prepare("UPDATE system_config SET value = ? WHERE key = ?").run(value, key);
  success(res, null, '配置已更新');
}

// ============ Admin Auth (Login - no auth middleware needed) ============
export function adminLogin(req: Request, res: Response): void {
  const phone = str(req.body.phone);
  const password = str(req.body.password);
  if (!phone || !password) {
    error(res, '请提供手机号和密码');
    return;
  }

  const user = userModel.findByPhone(phone);
  if (!user) {
    error(res, '用户不存在', 404);
    return;
  }

  // 检查角色是否有管理后台权限（admin 角色或有任意管理权限的角色均可登录）
  if (user.role !== 'admin') {
    const userRole = roleModel.findByCode(user.role);
    const hasAdminPermission = userRole && Array.isArray(JSON.parse(userRole.permissions || '[]')) &&
        JSON.parse(userRole.permissions || '[]').length > 0;
    if (!hasAdminPermission) {
      error(res, '无权登录管理后台', 403);
      return;
    }
  }

  if (user.status !== 'active' && user.status !== undefined) {
    error(res, '账号已停用，请联系管理员', 403);
    return;
  }

  let valid = false;

  if (user.password_hash && user.password_hash.length > 20) {
    valid = verifyPassword(password, user.password_hash);
  } else {
    const db = getDb();
    const configPwd = db.prepare("SELECT value FROM system_config WHERE key='admin_password'").get() as { value: string } | undefined;
    valid = !!configPwd && configPwd.value === password;
  }

  if (!valid) {
    error(res, '密码错误', 401);
    return;
  }

  // 首次登录时自动设置密码哈希
  if (!user.password_hash || user.password_hash.length <= 20) {
    userModel.update(user.id, { password_hash: hashPassword(password) });
  }

  const token = generateToken({ userId: user.id, role: user.role as any });

  // 获取该角色的权限列表
  let permissions: string[] = [];
  if (user.role === 'admin') {
    permissions = ['*']; // admin 拥有所有权限
  } else {
    const userRole = roleModel.findByCode(user.role);
    if (userRole) {
      try { permissions = JSON.parse(userRole.permissions || '[]'); } catch { permissions = []; }
    }
  }

  success(res, {
    token,
    userId: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    permissions,
  }, '登录成功');
}

// ============ 获取当前用户信息（含权限） ============
export function getProfile(req: Request, res: Response): void {
  const userId = (req as any).user?.userId;
  if (!userId) { error(res, '未登录', 401); return; }

  const user = userModel.findById(userId);
  if (!user) { error(res, '用户不存在', 404); return; }

  // 获取权限
  let permissions: string[] = [];
  if (user.role === 'admin') {
    permissions = ['*'];
  } else {
    const userRole = roleModel.findByCode(user.role);
    if (userRole) {
      try { permissions = JSON.parse(userRole.permissions || '[]'); } catch { permissions = []; }
    }
  }

  success(res, { id: user.id, name: user.name, phone: user.phone, role: user.role, status: user.status, permissions });
}

// ============ User Management ============
export function listUsers(req: Request, res: Response): void {
  const page = parseInt(str(req.query.page)) || 1;
  const pageSize = parseInt(str(req.query.pageSize)) || 20;
  const role = req.query.role ? str(req.query.role) : undefined;
  const keyword = req.query.keyword ? str(req.query.keyword) : undefined;
  const { data, total } = userModel.findAll(page, pageSize, role, keyword);
  paginated(res, data, page, pageSize, total);
}

export function getUserDetail(req: Request, res: Response): void {
  const id = str(req.params.id);
  const user = userModel.findById(id);
  if (!user) return notFound(res);
  const { password_hash: _ph, ...safeUser } = user;
  success(res, safeUser);
}

export function createUser(req: Request, res: Response): void {
  const phone = str(req.body.phone);
  const name = str(req.body.name);
  const role = str(req.body.role) || 'customer';
  const password = str(req.body.password);
  const status = str(req.body.status) || 'active';

  if (!phone) { error(res, '请提供手机号'); return; }

  const existing = userModel.findByPhone(phone);
  if (existing) { error(res, '该手机号已注册'); return; }

  const userData: any = { phone, name, role, status };
  if (password) {
    userData.password_hash = hashPassword(password);
  }
  const result = userModel.create(userData);
  const { password_hash: _ph2, ...safeResult } = result;
  success(res, safeResult, '用户创建成功');
}

export function updateUser(req: Request, res: Response): void {
  const id = str(req.params.id);
  const body: Record<string, any> = { ...req.body };
  if (body.password) {
    body.password_hash = hashPassword(body.password);
    delete body.password;
  }
  const result = userModel.update(id, body);
  if (!result) return notFound(res);
  const { password_hash: _ph, ...safeResult } = result;
  success(res, safeResult, '更新成功');
}

export function deleteUser(req: Request, res: Response): void {
  const id = str(req.params.id);
  const user = userModel.findById(id);
  if (!user) return notFound(res);
  if (user.role === 'admin') {
    error(res, '不能删除管理员账户'); return;
  }
  userModel.delete(id);
  success(res, null, '删除成功');
}

export function resetUserPassword(req: Request, res: Response): void {
  const id = str(req.params.id);
  const newPassword = str(req.body.newPassword);
  if (!newPassword || newPassword.length < 6) {
    error(res, '新密码长度不能少于6位'); return;
  }
  const result = userModel.update(id, { password_hash: hashPassword(newPassword) });
  if (!result) return notFound(res);
  success(res, null, '密码已重置');
}

// ============ Role Management ============
export function listRoles(_req: Request, res: Response): void {
  const roles = roleModel.findAll();
  const parsed = roles.map(r => ({ ...r, permissions: JSON.parse(r.permissions || '[]') }));
  success(res, parsed);
}

export function createRole(req: Request, res: Response): void {
  const name = str(req.body.name);
  const code = str(req.body.code);
  const description = str(req.body.description);
  const permissions: string[] = Array.isArray(req.body.permissions) ? req.body.permissions : [];
  if (!name || !code) { error(res, '请提供角色名称和角色编码'); return; }

  const existing = roleModel.findByCode(code);
  if (existing) { error(res, '角色编码已存在'); return; }

  const result = roleModel.create({
    name, code, description,
    permissions: JSON.stringify(permissions),
  });
  const parsed = { ...result, permissions: JSON.parse(result.permissions || '[]') };
  success(res, parsed, '角色创建成功');
}

export function updateRole(req: Request, res: Response): void {
  const id = str(req.params.id);
  const body: Record<string, any> = { ...req.body };
  if (body.permissions) {
    body.permissions = JSON.stringify(body.permissions);
  }
  const result = roleModel.update(id, body);
  if (!result) return notFound(res);
  const parsed = { ...result, permissions: JSON.parse(result.permissions || '[]') };
  success(res, parsed, '更新成功');
}

export function deleteRole(req: Request, res: Response): void {
  const id = str(req.params.id);
  const role = roleModel.findById(id);
  if (!role) return notFound(res);
  if (role.code === 'admin' || role.code === 'customer') {
    error(res, '不能删除系统内置角色'); return;
  }
  roleModel.delete(id);
  success(res, null, '删除成功');
}

/**
 * 获取用户积分信息
 */
export function getUserPoints(req: Request, res: Response): void {
  const id = str(req.params.id);

  const user = userModel.findById(id);
  if (!user) {
    error(res, '用户不存在', 404);
    return;
  }

  success(res, {
    userId: user.id,
    name: user.name,
    phone: user.phone,
    points: user.points || 0,
  });
}

/**
 * 调整用户积分
 */
export function adjustUserPoints(req: Request, res: Response): void {
  const id = str(req.params.id);
  const { amount, description } = req.body;

  if (!amount || typeof amount !== 'number') {
    error(res, '请输入有效的积分数量');
    return;
  }

  const user = userModel.findById(id);
  if (!user) {
    error(res, '用户不存在', 404);
    return;
  }

  try {
    const result = changePoints({
      userId: id,
      changeType: 'adjust',
      amount: Math.abs(amount), // 取绝对值，正负由changeType决定
      description: description || `管理员调整积分`,
    });

    success(res, {
      userId: id,
      newBalance: result.newBalance,
      adjustedAmount: amount,
    }, '积分调整成功');
  } catch (err: any) {
    error(res, err.message || '积分调整失败');
  }
}

/**
 * 获取用户积分记录
 */
export function getUserPointsHistory(req: Request, res: Response): void {
  const id = str(req.params.id);
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;

  const user = userModel.findById(id);
  if (!user) {
    error(res, '用户不存在', 404);
    return;
  }

  const { data, total } = getUserPointsRecords(id, page, pageSize);

  success(res, {
    userId: id,
    userName: user.name,
    currentPoints: user.points || 0,
    records: data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

// ============ Recharge Packages ============
export function listRechargePackages(_req: Request, res: Response): void {
  const db = getDb();
  const packages = db.prepare(
      "SELECT * FROM recharge_packages ORDER BY sort_order ASC"
  ).all();
  success(res, packages);
}

export function createRechargePackage(req: Request, res: Response): void {
  const { name, amount, bonus_amount, description, sort_order } = req.body;

  if (!name || !amount) {
    error(res, '请提供套餐名称和金额');
    return;
  }

  try {
    const id = uuidv4();
    const db = getDb();
    db.prepare(
        'INSERT INTO recharge_packages (id, name, amount, discount_rate, bonus_amount, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, name, parseFloat(amount), 0, parseFloat(bonus_amount) || 0, description || '', parseInt(sort_order) || 0);

    const pkg = db.prepare('SELECT * FROM recharge_packages WHERE id = ?').get(id);
    success(res, pkg, '充值套餐创建成功');
  } catch (err: any) {
    error(res, err.message || '创建失败');
  }
}

export function updateRechargePackage(req: Request, res: Response): void {
  const { id } = req.params;
  const { name, amount, bonus_amount, description, sort_order } = req.body;

  try {
    const db = getDb();
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (amount !== undefined) {
      updates.push('amount = ?');
      values.push(parseFloat(amount));
    }
    if (bonus_amount !== undefined) {
      updates.push('bonus_amount = ?');
      values.push(parseFloat(bonus_amount));
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(parseInt(sort_order));
    }

    if (updates.length === 0) {
      error(res, '没有要更新的字段');
      return;
    }

    values.push(id);
    db.prepare(`UPDATE recharge_packages SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const pkg = db.prepare('SELECT * FROM recharge_packages WHERE id = ?').get(id);
    success(res, pkg, '更新成功');
  } catch (err: any) {
    error(res, err.message || '更新失败');
  }
}

export function updateRechargePackageStatus(req: Request, res: Response): void {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    error(res, '请提供有效的状态');
    return;
  }

  try {
    const db = getDb();
    db.prepare('UPDATE recharge_packages SET status = ? WHERE id = ?').run(status, id);
    const pkg = db.prepare('SELECT * FROM recharge_packages WHERE id = ?').get(id);

    if (!pkg) {
      error(res, '套餐不存在', 404);
      return;
    }

    success(res, pkg, '状态更新成功');
  } catch (err: any) {
    error(res, err.message || '更新失败');
  }
}

export function deleteRechargePackage(req: Request, res: Response): void {
  const { id } = req.params;

  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM recharge_packages WHERE id = ?').run(id);

    if (result.changes === 0) {
      error(res, '套餐不存在', 404);
      return;
    }

    success(res, null, '套餐删除成功');
  } catch (err: any) {
    error(res, err.message || '删除失败');
  }
}

// ============ 充值订单明细查询 ============
export function listRechargeOrders(req: Request, res: Response): void {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const status = req.query.status as string || '';

  const db = getDb();
  let sql = 'SELECT ur.*, u.name as user_name, u.phone as user_phone, rp.name as package_name FROM user_recharges ur LEFT JOIN users u ON ur.user_id = u.id LEFT JOIN recharge_packages rp ON ur.package_id = rp.id WHERE 1=1';
  const params: any[] = [];

  if (status) {
    sql += ' AND ur.status = ?';
    params.push(status);
  }

  const countSql = sql.replace('SELECT ur.*, u.name as user_name, u.phone as user_phone, rp.name as package_name', 'SELECT COUNT(*) as count');
  const total = (db.prepare(countSql).get(...params) as { count: number }).count;

  sql += ' ORDER BY ur.created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);
  const data = db.prepare(sql).all(...params);

  paginated(res, data, page, pageSize, total);
}

// ============ 充值活动效益统计 ============
export function getRechargeStats(req: Request, res: Response): void {
  const startDate = req.query.start_date as string || '';
  const endDate = req.query.end_date as string || '';
  const stats = balanceTransactionModel.getRechargeStats(startDate || undefined, endDate || undefined);
  success(res, stats);
}

// ============ 账户变动流水查询 ============
export function listBalanceTransactions(req: Request, res: Response): void {
  const userId = req.query.user_id as string || '';
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;

  if (!userId) {
    error(res, '请提供用户ID');
    return;
  }

  const { data, total } = balanceTransactionModel.findByUserId(userId, page, pageSize);
  paginated(res, data, page, pageSize, total);
}
