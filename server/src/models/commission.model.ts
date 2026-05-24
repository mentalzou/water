import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { CommissionRecord } from '../types';

const db = getDb();

export const commissionModel = {
  create(data: {
    order_id: string;
    distributor_id: string;
    order_amount: number;
    commission_rate: number;
    commission_type: 'percentage' | 'fixed';
    commission_amount: number;
  }): CommissionRecord {
    const id = uuidv4();
    db.prepare(
      'INSERT INTO commissions (id, order_id, distributor_id, order_amount, commission_rate, commission_type, commission_amount) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.order_id, data.distributor_id, data.order_amount, data.commission_rate, data.commission_type, data.commission_amount);
    
    // Update distributor totals
    db.prepare('UPDATE distributors SET total_commission = total_commission + ?, available_commission = available_commission + ? WHERE id = ?')
      .run(data.commission_amount, data.commission_amount, data.distributor_id);
    
    return this.findById(id)!;
  },

  findById(id: string): CommissionRecord | undefined {
    return db.prepare('SELECT * FROM commissions WHERE id = ?').get(id) as CommissionRecord | undefined;
  },

  findByDistributor(distributorId: string, page = 1, pageSize = 20): { data: CommissionRecord[]; total: number } {
    const total = (db.prepare('SELECT COUNT(*) as count FROM commissions WHERE distributor_id = ?').get(distributorId) as { count: number }).count;
    const data = db.prepare(
      'SELECT * FROM commissions WHERE distributor_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(distributorId, pageSize, (page - 1) * pageSize) as CommissionRecord[];
    return { data, total };
  },

  findAll(page = 1, pageSize = 20): { data: CommissionRecord[]; total: number } {
    const total = (db.prepare('SELECT COUNT(*) as count FROM commissions').get() as { count: number }).count;
    const data = db.prepare(
      'SELECT c.*, o.order_no, d.code as distributor_code, u.name as distributor_name FROM commissions c LEFT JOIN orders o ON c.order_id = o.id LEFT JOIN distributors d ON c.distributor_id = d.id LEFT JOIN users u ON d.user_id = u.id ORDER BY c.created_at DESC LIMIT ? OFFSET ?'
    ).all(pageSize, (page - 1) * pageSize) as any[];
    return { data: data as unknown as CommissionRecord[], total };
  },

  settle(id: string): CommissionRecord | undefined {
    db.prepare("UPDATE commissions SET status = 'settled', settled_at = datetime('now') WHERE id = ?").run(id);
    const record = this.findById(id);
    if (record && record.status === 'settled') {
      db.prepare('UPDATE distributors SET available_commission = available_commission - ?, frozen_commission = frozen_commission + ? WHERE id = ?')
        .run(record.commission_amount, record.commission_amount, record.distributor_id);
    }
    return record;
  },
};
