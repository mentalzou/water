import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { WithdrawRequest } from '../types';

const db = getDb();

export const withdrawModel = {
  create(data: {
    distributor_id: string;
    amount: number;
    bank_name?: string;
    bank_account?: string;
    account_name?: string;
  }): WithdrawRequest {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO withdraw_requests (id, distributor_id, amount, bank_name, bank_account, account_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, data.distributor_id, data.amount, data.bank_name || '', data.bank_account || '', data.account_name || '');

    // 冻结可用佣金
    db.prepare(
      'UPDATE distributors SET available_commission = available_commission - ?, frozen_commission = frozen_commission + ? WHERE id = ?'
    ).run(data.amount, data.amount, data.distributor_id);

    return this.findById(id)!;
  },

  findById(id: string): WithdrawRequest | undefined {
    return db.prepare('SELECT * FROM withdraw_requests WHERE id = ?').get(id) as WithdrawRequest | undefined;
  },

  findByDistributor(distributorId: string, page = 1, pageSize = 20): { data: WithdrawRequest[]; total: number } {
    const total = (db.prepare(
      'SELECT COUNT(*) as count FROM withdraw_requests WHERE distributor_id = ?'
    ).get(distributorId) as { count: number }).count;
    const data = db.prepare(
      'SELECT * FROM withdraw_requests WHERE distributor_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(distributorId, pageSize, (page - 1) * pageSize) as WithdrawRequest[];
    return { data, total };
  },

  findAll(page = 1, pageSize = 20, status?: string): { data: (WithdrawRequest & { distributor_code?: string; distributor_name?: string })[]; total: number } {
    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (status) {
      where += ' AND wr.status = ?';
      params.push(status);
    }
    const total = (db.prepare(
      `SELECT COUNT(*) as count FROM withdraw_requests wr LEFT JOIN distributors d ON wr.distributor_id = d.id LEFT JOIN users u ON d.user_id = u.id ${where}`
    ).get(...params) as { count: number }).count;
    const data = db.prepare(
      `SELECT wr.*, d.code as distributor_code, u.name as distributor_name
       FROM withdraw_requests wr
       LEFT JOIN distributors d ON wr.distributor_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       ${where} ORDER BY wr.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, pageSize, (page - 1) * pageSize) as any[];
    return { data, total };
  },

  updateStatus(id: string, status: WithdrawRequest['status'], reviewedBy?: string, remark?: string): WithdrawRequest | undefined {
    const record = this.findById(id);
    if (!record) return undefined;

    if (status === 'rejected') {
      // 拒绝：退回冻结佣金到可用
      db.prepare(
        'UPDATE distributors SET available_commission = available_commission + ?, frozen_commission = frozen_commission - ? WHERE id = ?'
      ).run(record.amount, record.amount, record.distributor_id);
    } else if (status === 'paid') {
      // 已打款：从冻结中扣除
      db.prepare(
        'UPDATE distributors SET frozen_commission = frozen_commission - ?, total_commission = total_commission - ? WHERE id = ?'
      ).run(record.amount, record.amount, record.distributor_id);
    }

    db.prepare(
      `UPDATE withdraw_requests SET status = ?, reviewed_by = ?, remark = ?, reviewed_at = datetime('now') WHERE id = ?`
    ).run(status, reviewedBy || '', remark || '', id);

    return this.findById(id);
  },
};
