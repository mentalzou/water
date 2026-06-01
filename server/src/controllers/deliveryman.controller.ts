import { Request, Response } from 'express';
import { success, error } from '../utils/response';
import { deliverymanModel } from '../models/deliveryman.model';
import { orderModel } from '../models/order.model';
import { userModel } from '../models/user.model';
import { getDb } from '../utils/db';
import { generateToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';

/** 安全提取 req.body 字段 */
function str(val: unknown): string {
  return Array.isArray(val) ? val[0] || '' : String(val || '');
}

// ============ Deliveryman Login (phone + password + JWT) ============
export function loginDeliveryman(req: Request, res: Response): void {
  const phone = str(req.body.phone);
  const password = str(req.body.password);

  if (!phone || !password) {
    error(res, '请提供手机号和密码');
    return;
  }

  // 查找派送员
  const dm = deliverymanModel.findByPhone(phone);
  if (!dm) { error(res, '派送员不存在', 404); return; }

  // 状态校验：停用/离线不允许登录
  if (dm.status === 'inactive') {
    error(res, '账号已停用，请联系管理员', 403);
    return;
  }
  const user = userModel.findByPhone(phone);
  if (user && user.status === 'inactive') {
    error(res, '账号已停用，请联系管理员', 403);
    return;
  }

  // 通过 user 表验证密码
  let valid = false;
  let userId: string | null = null;

  if (user && user.password_hash && user.password_hash.length > 20) {
    try {
      valid = verifyPassword(password, user.password_hash);
    } catch { valid = false; }
    userId = user.id;
  }
  // fallback：兼容旧方式，用 system_config 密码
  if (!valid) {
    const db = getDb();
    const configPwd = db.prepare("SELECT value FROM system_config WHERE key='admin_password'").get() as { value: string } | undefined;
    valid = !!configPwd && configPwd.value === password;
    if (valid && user) userId = user.id;
  }

  if (!valid) { error(res, '密码错误', 401); return; }

  // 首次登录自动设置哈希
  if (userId && user && (!user.password_hash || user.password_hash.length <= 20)) {
    userModel.update(userId, { password_hash: hashPassword(password) });
  }

  const token = generateToken({ userId: userId || dm.id, role: 'deliveryman' });

  success(res, {
    token,
    deliverymanId: dm.id,
    name: dm.name,
    phone: dm.phone,
    role: 'deliveryman',
  }, '登录成功');
}

export function getTaskList(req: Request, res: Response): void {
  const id = str(req.params.id);
  const status = str(req.query.status) || undefined;

  let sql = "SELECT o.*, (SELECT GROUP_CONCAT(oi.product_name, ', ') FROM order_items oi WHERE oi.order_id = o.id) as product_name FROM orders o WHERE o.deliveryman_id = ?";
  const params: any[] = [id];
  
  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY o.created_at DESC';
  
  const db = require('../utils/db').getDb();
  const tasks = db.prepare(sql).all(...params) as any[];

  // Count by status
  const stats = db.prepare(
    "SELECT status, COUNT(*) as count FROM orders WHERE deliveryman_id = ? GROUP BY status"
  ).all(id) as { status: string; count: number }[];

  success(res, {
    tasks,
    stats,
    summary: {
      total: tasks.length,
      pending: stats.find(s => s.status === 'assigned')?.count || 0,
      delivering: stats.find(s => s.status === 'delivering')?.count || 0,
      completed: stats.find(s => s.status === 'completed')?.count || 0,
    },
  });
}

export function getTaskDetail(req: Request, res: Response): void {
  const taskId = str(req.params.id);
  const order = orderModel.findByIdDetailed(taskId);
  if (!order) { error(res, '任务不存在', 404); return; }
  success(res, order);
}

export function acceptTask(req: Request, res: Response): void {
  const orderId = str(req.params.id);
  const updated = orderModel.updateStatus(orderId, 'delivering');
  if (!updated) { error(res, '操作失败', 400); return; }
  success(res, updated, '已开始配送');
}

export function completeTask(req: Request, res: Response): void {
  const orderId = str(req.params.id);
  const order = orderModel.findById(orderId);
  if (!order) { error(res, '订单不存在', 404); return; }
  
  // Update deliveryman stats
  if (order.deliveryman_id) {
    const db = require('../utils/db').getDb();
    db.prepare('UPDATE deliverymen SET completed_orders = completed_orders + 1 WHERE id = ?').run(order.deliveryman_id);
  }
  
  const updated = orderModel.updateStatus(orderId, 'completed');
  if (!updated) { error(res, '操作失败', 400); return; }
  success(res, updated, '配送完成');
}
