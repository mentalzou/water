
import { Request, Response } from 'express';
import { success, error, paginated } from '../utils/response';
import { rechargePackageModel } from '../models/rechargePackage.model';
import { userRechargeModel } from '../models/userRecharge.model';
import { balanceTransactionModel } from '../models/balanceTransaction.model';
import type { RechargePackage } from '../types';

/** 获取所有充值套餐 */
export function getPackages(req: Request, res: Response): void {
  const packages = rechargePackageModel.findAll();
  success(res, packages);
}

/** 创建充值套餐（管理员） */
export function createPackage(req: Request, res: Response): void {
  const { name, amount, bonus_amount, description, sort_order } = req.body;

  if (!name || !amount) {
    error(res, '请提供套餐名称和金额');
    return;
  }

  try {
    const pkg = rechargePackageModel.create({
      name,
      amount: parseFloat(amount),
      discount_rate: 0,
      bonus_amount: parseFloat(bonus_amount) || 0,
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

/** 用户充值 - 创建待支付充值记录 */
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
    const paidAmount = pkg.amount;
    const remainingBalance = pkg.amount;
    const bonusAmount = pkg.bonus_amount || 0;
    const bonusBalance = bonusAmount;
    const orderNo = `RECHARGE_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const recharge = userRechargeModel.create({
      user_id: userId,
      package_id: pkg.id,
      amount: pkg.amount,
      discount_rate: pkg.discount_rate,
      bonus_amount: bonusAmount,
      paid_amount: paidAmount,
      remaining_balance: remainingBalance,
      bonus_balance: bonusBalance,
      transaction_id: orderNo,
    });

    success(res, recharge, '充值订单创建成功，请完成支付');
  } catch (err: any) {
    error(res, err.message || '充值失败');
  }
}

/** 模拟支付充值（开发环境降级方案） */
export function payForRecharge(req: Request, res: Response): void {
  const { id } = req.params;

  const recharge = userRechargeModel.findById(id);
  if (!recharge) {
    error(res, '充值记录不存在', 404);
    return;
  }

  if (recharge.status === 'active') {
    error(res, '该充值已支付', 400);
    return;
  }

  // 幂等性检查：防止重复入账
  if (balanceTransactionModel.hasRechargeTransaction(id)) {
    error(res, '该充值已入账，请勿重复操作', 400);
    return;
  }

  const transactionId = recharge.transaction_id || `MOCK_TXN_${Date.now()}`;
  const updated = userRechargeModel.markPaid(id, transactionId);
  if (!updated) {
    error(res, '支付失败', 500);
    return;
  }

  // 记录流水：本金充值
  balanceTransactionModel.create({
    user_id: recharge.user_id,
    recharge_id: id,
    tx_type: 'recharge_principal',
    amount: recharge.amount,
    principal_after: recharge.remaining_balance,
    bonus_after: recharge.bonus_balance,
    description: `充值本金到账 - ¥${recharge.amount.toFixed(2)}`,
    operator_ip: (req as any).ip || '',
  });

  // 记录流水：赠送金充值
  if (recharge.bonus_amount > 0) {
    balanceTransactionModel.create({
      user_id: recharge.user_id,
      recharge_id: id,
      tx_type: 'recharge_bonus',
      amount: recharge.bonus_amount,
      principal_after: recharge.remaining_balance,
      bonus_after: recharge.bonus_balance + recharge.bonus_amount,
      description: `充值赠送金到账 - ¥${recharge.bonus_amount.toFixed(2)}`,
      operator_ip: (req as any).ip || '',
    });
  }

  success(res, {
    ...updated,
    mockMode: true,
  }, '支付成功（模拟模式）');
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

/** 获取用户账户余额（汇总所有有效充值） */
export function getUserBalance(req: Request, res: Response): void {
  const userId = (req as any).user?.userId;

  if (!userId) {
    error(res, '请先登录', 401);
    return;
  }

  const balance = userRechargeModel.getTotalBalanceByUserId(userId);
  const activeRecharges = userRechargeModel.findAllActiveByUserId(userId);

  success(res, {
    ...balance,
    active_recharges: activeRecharges,
  });
}
