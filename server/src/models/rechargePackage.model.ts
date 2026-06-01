import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { RechargePackage, UserRecharge } from '../types';

const db = getDb();

export const rechargePackageModel = {
  findAll(): RechargePackage[] {
    return db.prepare(
        "SELECT * FROM recharge_packages WHERE status = 'active' ORDER BY sort_order ASC"
    ).all() as RechargePackage[];
  },

  findById(id: string): RechargePackage | undefined {
    return db.prepare('SELECT * FROM recharge_packages WHERE id = ?').get(id) as RechargePackage | undefined;
  },

  create(data: {
    name: string;
    amount: number;
    discount_rate: number;
    bonus_amount?: number;
    description?: string;
    sort_order?: number;
  }): RechargePackage {
    const id = uuidv4();
    db.prepare(
        'INSERT INTO recharge_packages (id, name, amount, discount_rate, bonus_amount, description, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.name, data.amount, data.discount_rate, data.bonus_amount || 0, data.description || '', data.sort_order || 0);

    return this.findById(id)!;
  },

  updateStatus(id: string, status: 'active' | 'inactive'): RechargePackage | undefined {
    db.prepare('UPDATE recharge_packages SET status = ? WHERE id = ?').run(status, id);
    return this.findById(id);
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM recharge_packages WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
