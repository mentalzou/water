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
import { getDb } from '../utils/db';
import { generateToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { v4 as uuidv4 } from 'uuid';

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
  const pendingDelivery = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE status IN ('paid','assigned','delivering')").get() as { count: number }).count;

  // Recent orders
  const recentOrders = db.prepare(
    `SELECT o.order_no, o.customer_name, o.customer_phone, o.total_amount, o.status,
       (SELECT group_concat(oi.product_name, ', ')
        FROM order_items oi WHERE oi.order_id = o.id) as product_name
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
  const result = deliverymanModel.create({ name, phone, area_ids, password });
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

// ============ Brands ============
export function createBrand(req: Request, res: Response): void {
  const name = str(req.body.name);
  if (!name) { error(res, '请提供品牌名称'); return; }
  const description = str(req.body.description);
  const logo = str(req.body.logo);
  const result = brandModel.create({ name, description, logo });
  success(res, result, '品牌创建成功');
}

export function listBrands(req: Request, res: Response): void {
  const keyword = req.query.keyword ? str(req.query.keyword) : undefined;
  success(res, brandModel.findAll(false, keyword));
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

// ============ Products ============
export function createProduct(req: Request, res: Response): void {
  const name = str(req.body.name);
  const price = Number(req.body.price);
  const unit = str(req.body.unit);
  const description = str(req.body.description);
  const brandId = req.body.brand_id ? str(req.body.brand_id) : undefined;
  if (!name || isNaN(price)) { error(res, '请提供产品名称和价格'); return; }
  const result = productModel.create({ name, description, price, unit, brand_id: brandId });
  success(res, result, '产品创建成功');
}

export function listProducts(req: Request, res: Response): void {
  const options: { brandId?: string; keyword?: string } = {};
  if (req.query.brand_id) options.brandId = str(req.query.brand_id);
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
