import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { BalanceTransaction } from '../types';

const db = getDb();

export const balanceTransactionModel = {
  /** 创建流水记录 */
  create(data: {
    user_id: string;
    recharge_id?: string;
    order_id?: string;
    tx_type: BalanceTransaction['tx_type'];
    amount: number;
    principal_after: number;
    bonus_after: number;
    description: string;
    operator_ip?: string;
  }): BalanceTransaction {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO balance_transactions (id, user_id, recharge_id, order_id, tx_type, amount, principal_after, bonus_after, description, operator_ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.user_id,
      data.recharge_id || null,
      data.order_id || null,
      data.tx_type,
      data.amount,
      data.principal_after,
      data.bonus_after,
      data.description,
      data.operator_ip || ''
    );
    return db.prepare('SELECT * FROM balance_transactions WHERE id = ?').get(id) as BalanceTransaction;
  },

  /** 查询用户流水（分页） */
  findByUserId(userId: string, page = 1, pageSize = 20): { data: BalanceTransaction[]; total: number } {
    const total = (db.prepare(
      'SELECT COUNT(*) as count FROM balance_transactions WHERE user_id = ?'
    ).get(userId) as { count: number }).count;

    const rows = db.prepare(
      'SELECT * FROM balance_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(userId, pageSize, (page - 1) * pageSize) as BalanceTransaction[];

    return { data: rows, total };
  },

  /** 查询某笔充值的所有流水 */
  findByRechargeId(rechargeId: string): BalanceTransaction[] {
    return db.prepare(
      'SELECT * FROM balance_transactions WHERE recharge_id = ? ORDER BY created_at DESC'
    ).all(rechargeId) as BalanceTransaction[];
  },

  /** 查询某笔订单的流水 */
  findByOrderId(orderId: string): BalanceTransaction[] {
    return db.prepare(
      'SELECT * FROM balance_transactions WHERE order_id = ? ORDER BY created_at DESC'
    ).all(orderId) as BalanceTransaction[];
  },

  /** 充值活动效益统计 */
  getRechargeStats(startDate?: string, endDate?: string): {
    totalRechargeAmount: number;
    totalBonusAmount: number;
    netRechargeIncome: number;
    totalConsumedBonus: number;
    bonusConsumptionRate: number;
  } {
    let dateFilter = '';
    const params: string[] = [];
    if (startDate) {
      dateFilter += ' AND created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += ' AND created_at <= ?';
      params.push(endDate + ' 23:59:59');
    }

    // 充值本金总额
    const principalSql = `SELECT COALESCE(SUM(amount), 0) as total FROM balance_transactions WHERE tx_type = 'recharge_principal'${dateFilter}`;
    const principalResult = db.prepare(principalSql).get(...params) as { total: number };

    // 充值赠送总额
    const bonusSql = `SELECT COALESCE(SUM(amount), 0) as total FROM balance_transactions WHERE tx_type = 'recharge_bonus'${dateFilter}`;
    const bonusResult = db.prepare(bonusSql).get(...params) as { total: number };

    // 赠送金消耗总额
    const consumedSql = `SELECT COALESCE(SUM(amount), 0) as total FROM balance_transactions WHERE tx_type = 'consume_bonus'${dateFilter}`;
    const consumedResult = db.prepare(consumedSql).get(...params) as { total: number };

    const totalRechargeAmount = principalResult.total;
    const totalBonusAmount = bonusResult.total;
    const netRechargeIncome = totalRechargeAmount - totalBonusAmount;
    const totalConsumedBonus = consumedResult.total;
    const bonusConsumptionRate = totalBonusAmount > 0 ? Math.round((totalConsumedBonus / totalBonusAmount) * 10000) / 100 : 0;

    return {
      totalRechargeAmount,
      totalBonusAmount,
      netRechargeIncome,
      totalConsumedBonus,
      bonusConsumptionRate,
    };
  },

  /** 检查充值订单是否已入账（幂等性） */
  hasRechargeTransaction(rechargeId: string): boolean {
    const count = (db.prepare(
      "SELECT COUNT(*) as count FROM balance_transactions WHERE recharge_id = ? AND tx_type IN ('recharge_principal','recharge_bonus')"
    ).get(rechargeId) as { count: number }).count;
    return count > 0;
  },
};
