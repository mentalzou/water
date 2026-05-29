
import { Request, Response } from 'express';
import { success, error, paginated } from '../utils/response';
import { rechargePackageModel } from '../models/rechargePackage.model';
import { userRechargeModel } from '../models/userRecharge.model';
import type { RechargePackage } from '../types';

/** 获取所有充值套餐 */
export function getPackages(req: Request, res: Response): void {
  const packages = rechargePackageModel.findAll();
  success(res, packages);
}

/** 创建充值套餐（管理员） */
export function createPackage(req: Request, res: Response): void {
  const { name, amount, discount_rate, description, sort_order } = req.body;

  if (!name || !amount || !discount_rate) {
    error(res, '请提供套餐名称、金额和折扣率');
    return;
  }

  try {
    const pkg = rechargePackageModel.create({
      name,
      amount: parseFloat(amount),
      discount_rate: parseFloat(discount_rate),
      description,
      sort_order: parseInt(sort_order) || 0,
    });
    success(res, pkg, '充值套餐创建成功');
  } catch (err: any) {
    error(res, err.message || '创建失败');
  }
}

/** 更新套餐状态（管理员） */
export function updatePackageStatus(req: Request, res: Response): void {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    error(res, '请提供有效的状态');
    return;
  }

  const pkg = rechargePackageModel.updateStatus(id, status);
  if (!pkg) {
    error(res, '套餐不存在', 404);
    return;
  }

  success(res, pkg, '状态更新成功');
}

/** 删除套餐（管理员） */
export function deletePackage(req: Request, res: Response): void {
  const { id } = req.params;
  const deleted = rechargePackageModel.delete(id);

  if (!deleted) {
    error(res, '套餐不存在', 404);
    return;
  }

  success(res, null, '套餐删除成功');
}

/** 用户充值 */
export function recharge(req: Request, res: Response): void {
  const userId = (req as any).user?.userId;
  const { package_id } = req.body;

  if (!userId) {
    error(res, '请先登录', 401);
    return;
  }

  if (!package_id) {
    error(res, '请选择充值套餐');
    return;
  }

  const pkg = rechargePackageModel.findById(package_id);
  if (!pkg) {
    error(res, '充值套餐不存在', 404);
    return;
  }

  if (pkg.status !== 'active') {
    error(res, '该充值套餐已下架', 400);
    return;
  }

  try {
    // 计算实际支付金额和余额
    const paidAmount = pkg.amount; // 实际支付金额
    const remainingBalance = pkg.amount; // 初始余额等于充值金额

    const recharge = userRechargeModel.create({
      user_id: userId,
      package_id: pkg.id,
      amount: pkg.amount,
      discount_rate: pkg.discount_rate,
      paid_amount: paidAmount,
      remaining_balance: remainingBalance,
      transaction_id: `RECHARGE_${Date.now()}`, // 模拟交易号
    });

    // 在开发模式下直接标记为已支付
    userRechargeModel.markPaid(recharge.id, recharge.transaction_id!);

    success(res, recharge, '充值成功');
  } catch (err: any) {
    error(res, err.message || '充值失败');
  }
}

/** 获取用户充值记录 */
export function getMyRecharges(req: Request, res: Response): void {
  const userId = (req as any).user?.userId;

  if (!userId) {
    error(res, '请先登录', 401);
    return;
  }

  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;

  const { data, total } = userRechargeModel.findByUserId(userId, page, pageSize);
  paginated(res, data, page, pageSize, total);
}

/** 获取用户当前有效充值 */
export function getActiveRecharge(req: Request, res: Response): void {
  const userId = (req as any).user?.userId;

  if (!userId) {
    error(res, '请先登录', 401);
    return;
  }

  const recharge = userRechargeModel.findActiveByUserId(userId);
  success(res, recharge);
}