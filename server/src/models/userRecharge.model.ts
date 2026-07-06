import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { UserRecharge } from '../types';

const db = getDb();

export const userRechargeModel = {
  create(data: {
    user_id: string;
    package_id: string;
    amount: number;
    discount_rate: number;
    bonus_amount: number;
    paid_amount: number;
    remaining_balance: number;
    bonus_balance: number;
    transaction_id?: string;
    remark?: string;
  }): UserRecharge {
    const id = uuidv4();
    db.prepare(
        'INSERT INTO user_recharges (id, user_id, package_id, amount, discount_rate, bonus_amount, paid_amount, remaining_balance, bonus_balance, status, transaction_id, channel_transaction_id, remark, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))'
    ).run(
        id,
        data.user_id,
        data.package_id,
        data.amount,
        data.discount_rate,
        data.bonus_amount,
        data.paid_amount,
        data.remaining_balance,
        data.bonus_balance,
        'pending',
        data.transaction_id || '',
        '',
        data.remark || ''
    );

    return this.findById(id)!;
  },

  findById(id: string): (UserRecharge & { package?: any }) | undefined {
    const recharge = db.prepare('SELECT * FROM user_recharges WHERE id = ?').get(id) as UserRecharge | undefined;
    if (!recharge) return undefined;

    const pkg = db.prepare('SELECT * FROM recharge_packages WHERE id = ?').get(recharge.package_id) as any;

    return { ...recharge, package: pkg };
  },

  /** 根据 transaction_id 查找充值记录 */
  findByTransactionId(transactionId: string): (UserRecharge & { package?: any }) | undefined {
    if (!transactionId) return undefined;
    const recharge = db.prepare('SELECT * FROM user_recharges WHERE transaction_id = ?').get(transactionId) as UserRecharge | undefined;
    if (!recharge) return undefined;

    const pkg = db.prepare('SELECT * FROM recharge_packages WHERE id = ?').get(recharge.package_id) as any;

    return { ...recharge, package: pkg };
  },

  findByUserId(userId: string, page = 1, pageSize = 20): { data: (UserRecharge & { package?: any })[]; total: number } {
    const total = (db.prepare('SELECT COUNT(*) as count FROM user_recharges WHERE user_id = ?').get(userId) as { count: number }).count;
    const recharges = db.prepare(
        'SELECT * FROM user_recharges WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(userId, pageSize, (page - 1) * pageSize) as UserRecharge[];

    const data = recharges.map(recharge => {
      const pkg = db.prepare('SELECT * FROM recharge_packages WHERE id = ?').get(recharge.package_id) as any;
      return { ...recharge, package: pkg };
    });

    return { data, total };
  },

  findActiveByUserId(userId: string): (UserRecharge & { package?: any }) | undefined {
    const recharge = db.prepare(
        "SELECT * FROM user_recharges WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
    ).get(userId) as UserRecharge | undefined;

    if (!recharge) return undefined;

    const pkg = db.prepare('SELECT * FROM recharge_packages WHERE id = ?').get(recharge.package_id) as any;

    return { ...recharge, package: pkg };
  },

  /** 获取用户所有有效充值记录（按创建时间升序，先充的先消费） */
  findAllActiveByUserId(userId: string): (UserRecharge & { package?: any })[] {
    const recharges = db.prepare(
        "SELECT * FROM user_recharges WHERE user_id = ? AND status = 'active' ORDER BY created_at ASC"
    ).all(userId) as UserRecharge[];

    return recharges.map(recharge => {
      const pkg = db.prepare('SELECT * FROM recharge_packages WHERE id = ?').get(recharge.package_id) as any;
      return { ...recharge, package: pkg };
    });
  },

  /** 获取用户账户总余额汇总 */
  getTotalBalanceByUserId(userId: string): {
    total_principal: number;
    total_bonus: number;
    total_balance: number;
    recharge_count: number;
  } {
    const result = db.prepare(
        "SELECT COALESCE(SUM(remaining_balance), 0) as total_principal, COALESCE(SUM(bonus_balance), 0) as total_bonus, COUNT(*) as recharge_count FROM user_recharges WHERE user_id = ? AND status = 'active'"
    ).get(userId) as { total_principal: number; total_bonus: number; recharge_count: number };

    return {
      total_principal: result.total_principal,
      total_bonus: result.total_bonus,
      total_balance: result.total_principal + result.total_bonus,
      recharge_count: result.recharge_count,
    };
  },

  markPaid(id: string, transactionId: string): UserRecharge | undefined {
    db.prepare(
        "UPDATE user_recharges SET status = 'active', paid_at = datetime('now', 'localtime') WHERE id = ?"
    ).run(id);
    // 如果传入了支付渠道交易号（如微信支付 channelOrderId），存入 channel_transaction_id
    if (transactionId && transactionId !== (this.findById(id)?.transaction_id)) {
      try {
        db.prepare("UPDATE user_recharges SET channel_transaction_id = ? WHERE id = ?").run(transactionId, id);
      } catch (_) { /* channel_transaction_id 列可能尚不存在 */ }
    }
    return this.findById(id);
  },

  updateRemainingBalance(id: string, usedAmount: number): UserRecharge | undefined {
    db.prepare(
        'UPDATE user_recharges SET remaining_balance = remaining_balance - ? WHERE id = ?'
    ).run(usedAmount, id);
    return this.findById(id);
  },

  updateBonusBalance(id: string, usedAmount: number): UserRecharge | undefined {
    db.prepare(
        'UPDATE user_recharges SET bonus_balance = bonus_balance - ? WHERE id = ?'
    ).run(usedAmount, id);
    return this.findById(id);
  },

  expireRecharge(id: string): UserRecharge | undefined {
    db.prepare(
        "UPDATE user_recharges SET status = 'expired' WHERE id = ?"
    ).run(id);
    return this.findById(id);
  },

  markRefunding(id: string, refundOrderNo: string): UserRecharge | undefined {
    db.prepare(
        "UPDATE user_recharges SET status = 'refunding', remark = ? WHERE id = ?"
    ).run(`退款订单号:${refundOrderNo}`, id);
    return this.findById(id);
  },

  markRefunded(id: string): UserRecharge | undefined {
    db.prepare(
        "UPDATE user_recharges SET status = 'refunded' WHERE id = ?"
    ).run(id);
    return this.findById(id);
  },

  /** 退还余额到用户账户（用于订单退款回退） */
  restoreBalance(userId: string, principalAmount: number, bonusAmount: number): void {
    // 查找该用户最近一条充值记录（active 或 expired，优先 active）
    let recharge = db.prepare(
      "SELECT * FROM user_recharges WHERE user_id = ? ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC LIMIT 1"
    ).get(userId) as UserRecharge | undefined;

    // 恢复本金
    if (principalAmount > 0) {
      if (recharge) {
        // 如果充值记录已过期但还有余额空间，重新激活
        if (recharge.status === 'expired') {
          db.prepare("UPDATE user_recharges SET status = 'active' WHERE id = ?").run(recharge.id);
        }
        db.prepare(
          'UPDATE user_recharges SET remaining_balance = remaining_balance + ? WHERE id = ?'
        ).run(principalAmount, recharge.id);
      } else {
        // 无历史充值记录，创建一条新的虚拟充值记录用于记账
        const id = uuidv4();
        db.prepare(
          "INSERT INTO user_recharges (id, user_id, package_id, amount, discount_rate, bonus_amount, paid_amount, remaining_balance, bonus_balance, status, transaction_id, remark, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, datetime('now', 'localtime'))"
        ).run(id, userId, '', principalAmount, 0, 0, principalAmount, principalAmount, 0, `REFUND_RESTORE_${Date.now()}`, '订单退款退回本金');
      }
    }

    // 恢复赠送金
    if (bonusAmount > 0) {
      recharge = db.prepare(
        "SELECT * FROM user_recharges WHERE user_id = ? ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at DESC LIMIT 1"
      ).get(userId) as UserRecharge | undefined;

      if (recharge) {
        if (recharge.status === 'expired') {
          db.prepare("UPDATE user_recharges SET status = 'active' WHERE id = ?").run(recharge.id);
        }
        db.prepare(
          'UPDATE user_recharges SET bonus_balance = bonus_balance + ? WHERE id = ?'
        ).run(bonusAmount, recharge.id);
      } else {
        const id = uuidv4();
        db.prepare(
          "INSERT INTO user_recharges (id, user_id, package_id, amount, discount_rate, bonus_amount, paid_amount, remaining_balance, bonus_balance, status, transaction_id, remark, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, datetime('now', 'localtime'))"
        ).run(id, userId, '', 0, 0, bonusAmount, 0, 0, bonusAmount, `REFUND_BONUS_${Date.now()}`, '订单退款退回赠送金');
      }
    }
  },
};
