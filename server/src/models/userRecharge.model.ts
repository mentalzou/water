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
        'INSERT INTO user_recharges (id, user_id, package_id, amount, discount_rate, bonus_amount, paid_amount, remaining_balance, bonus_balance, transaction_id, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
        data.transaction_id || '',
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

  markPaid(id: string, transactionId: string): UserRecharge | undefined {
    db.prepare(
        "UPDATE user_recharges SET status = 'active', transaction_id = ?, paid_at = datetime('now') WHERE id = ?"
    ).run(transactionId, id);
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
};
