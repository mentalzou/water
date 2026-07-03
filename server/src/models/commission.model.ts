import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { CommissionRecord, CommissionSummary, PayoutRecord } from '../types';

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
      'INSERT INTO commissions (id, order_id, distributor_id, order_amount, commission_rate, commission_type, commission_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))'
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

  /**
   * 带筛选条件的分页查询
   */
  findAllFiltered(params: {
    page?: number;
    pageSize?: number;
    order_no?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    payout_start_date?: string;
    payout_end_date?: string;
    distributor_id?: string;
  }): { data: CommissionRecord[]; total: number } {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const conditions: string[] = [];
    const vals: any[] = [];

    if (params.order_no) {
      conditions.push('o.order_no LIKE ?');
      vals.push(`%${params.order_no}%`);
    }
    if (params.start_date) {
      conditions.push("date(c.created_at) >= ?");
      vals.push(params.start_date);
    }
    if (params.end_date) {
      conditions.push("date(c.created_at) <= ?");
      vals.push(params.end_date);
    }
    if (params.status) {
      conditions.push('c.status = ?');
      vals.push(params.status);
    }
    if (params.payout_start_date) {
      conditions.push("c.payout_date >= ?");
      vals.push(params.payout_start_date);
    }
    if (params.payout_end_date) {
      conditions.push("c.payout_date <= ?");
      vals.push(params.payout_end_date);
    }
    if (params.distributor_id) {
      conditions.push('c.distributor_id = ?');
      vals.push(params.distributor_id);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const baseSelect = 'SELECT c.*, o.order_no, d.code as distributor_code, u.name as distributor_name, u.phone as distributor_phone';

    const countRow = db.prepare(
      `SELECT COUNT(*) as count FROM commissions c LEFT JOIN orders o ON c.order_id = o.id LEFT JOIN distributors d ON c.distributor_id = d.id LEFT JOIN users u ON d.user_id = u.id ${where}`
    ).get(...vals) as { count: number };

    const data = db.prepare(
      `${baseSelect} FROM commissions c LEFT JOIN orders o ON c.order_id = o.id LEFT JOIN distributors d ON c.distributor_id = d.id LEFT JOIN users u ON d.user_id = u.id ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
    ).all(...vals, pageSize, (page - 1) * pageSize) as any[];

    return { data: data as unknown as CommissionRecord[], total: countRow.count };
  },

  /**
   * 不分页获取全部记录（用于导出）
   */
  findAllNoPaginate(params: {
    order_no?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    payout_start_date?: string;
    payout_end_date?: string;
    distributor_id?: string;
  }): CommissionRecord[] {
    const conditions: string[] = [];
    const vals: any[] = [];

    if (params.order_no) {
      conditions.push('o.order_no LIKE ?');
      vals.push(`%${params.order_no}%`);
    }
    if (params.start_date) {
      conditions.push("date(c.created_at) >= ?");
      vals.push(params.start_date);
    }
    if (params.end_date) {
      conditions.push("date(c.created_at) <= ?");
      vals.push(params.end_date);
    }
    if (params.status) {
      conditions.push('c.status = ?');
      vals.push(params.status);
    }
    if (params.payout_start_date) {
      conditions.push("c.payout_date >= ?");
      vals.push(params.payout_start_date);
    }
    if (params.payout_end_date) {
      conditions.push("c.payout_date <= ?");
      vals.push(params.payout_end_date);
    }
    if (params.distributor_id) {
      conditions.push('c.distributor_id = ?');
      vals.push(params.distributor_id);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    return db.prepare(
      `SELECT c.*, o.order_no, d.code as distributor_code, u.name as distributor_name, u.phone as distributor_phone FROM commissions c LEFT JOIN orders o ON c.order_id = o.id LEFT JOIN distributors d ON c.distributor_id = d.id LEFT JOIN users u ON d.user_id = u.id ${where} ORDER BY c.created_at DESC`
    ).all(...vals) as any[];
  },

  /**
   * 统计汇总
   */
  stats(params: {
    order_no?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    payout_start_date?: string;
    payout_end_date?: string;
    distributor_id?: string;
  }): CommissionSummary {
    const conditions: string[] = [];
    const vals: any[] = [];

    if (params.order_no) {
      conditions.push('o.order_no LIKE ?');
      vals.push(`%${params.order_no}%`);
    }
    if (params.start_date) {
      conditions.push("date(c.created_at) >= ?");
      vals.push(params.start_date);
    }
    if (params.end_date) {
      conditions.push("date(c.created_at) <= ?");
      vals.push(params.end_date);
    }
    if (params.status) {
      conditions.push('c.status = ?');
      vals.push(params.status);
    }
    if (params.payout_start_date) {
      conditions.push("c.payout_date >= ?");
      vals.push(params.payout_start_date);
    }
    if (params.payout_end_date) {
      conditions.push("c.payout_date <= ?");
      vals.push(params.payout_end_date);
    }
    if (params.distributor_id) {
      conditions.push('c.distributor_id = ?');
      vals.push(params.distributor_id);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = db.prepare(
      `SELECT COALESCE(SUM(c.order_amount), 0) as total_order_amount, COUNT(*) as total_count, COALESCE(SUM(c.commission_amount), 0) as total_commission FROM commissions c LEFT JOIN orders o ON c.order_id = o.id ${where}`
    ).get(...vals) as any;

    return {
      total_order_amount: result.total_order_amount,
      total_count: result.total_count,
      total_commission: result.total_commission,
    };
  },

  /**
   * 按分销商汇总获取打款记录（仅 pending 状态）
   */
  getPayoutRecords(params: {
    order_no?: string;
    start_date?: string;
    end_date?: string;
    payout_start_date?: string;
    payout_end_date?: string;
    distributor_id?: string;
  }): PayoutRecord[] {
    const conditions: string[] = ["c.status = 'pending'"];
    const vals: any[] = [];

    if (params.order_no) {
      conditions.push('o.order_no LIKE ?');
      vals.push(`%${params.order_no}%`);
    }
    if (params.start_date) {
      conditions.push("date(c.created_at) >= ?");
      vals.push(params.start_date);
    }
    if (params.end_date) {
      conditions.push("date(c.created_at) <= ?");
      vals.push(params.end_date);
    }
    if (params.payout_start_date) {
      conditions.push("c.payout_date >= ?");
      vals.push(params.payout_start_date);
    }
    if (params.payout_end_date) {
      conditions.push("c.payout_date <= ?");
      vals.push(params.payout_end_date);
    }
    if (params.distributor_id) {
      conditions.push('c.distributor_id = ?');
      vals.push(params.distributor_id);
    }

    const where = 'WHERE ' + conditions.join(' AND ');
    return db.prepare(
      `SELECT d.id as distributor_id, d.code as distributor_code, u.name as distributor_name, u.phone as distributor_phone, SUM(c.commission_amount) as commission_amount FROM commissions c LEFT JOIN orders o ON c.order_id = o.id LEFT JOIN distributors d ON c.distributor_id = d.id LEFT JOIN users u ON d.user_id = u.id ${where} GROUP BY c.distributor_id ORDER BY d.code ASC`
    ).all(...vals) as PayoutRecord[];
  },

  /**
   * 批量结算佣金（打款导入）
   */
  batchSettle(batch_no: string, payout_date: string, commissionIds: string[]): { settled: number; batchId: string } {
    let settled = 0;
    const txn = db.transaction(() => {
      const batchId = uuidv4();

      // 汇总金额
      const result = db.prepare(
        `SELECT COALESCE(SUM(commission_amount), 0) as total, COUNT(DISTINCT distributor_id) as dist_count FROM commissions WHERE id IN (${commissionIds.map(() => '?').join(',')}) AND status = 'pending'`
      ).get(...commissionIds) as any;

      if (result.total === 0) return;

      // 创建打款批次
      db.prepare(
        'INSERT INTO payout_batches (id, batch_no, payout_date, total_amount, distributor_count, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))'
      ).run(batchId, batch_no, payout_date, result.total, result.dist_count);

      // 更新佣金记录
      for (const cid of commissionIds) {
        const record = this.findById(cid);
        if (!record || record.status !== 'pending') continue;

        db.prepare(
          "UPDATE commissions SET status = 'settled', settled_at = datetime('now', 'localtime'), payout_batch_no = ?, payout_date = ? WHERE id = ? AND status = 'pending'"
        ).run(batch_no, payout_date, cid);

        // 更新分销商资金：可用 → 冻结
        db.prepare(
          'UPDATE distributors SET available_commission = MAX(0, available_commission - ?), frozen_commission = frozen_commission + ? WHERE id = ?'
        ).run(record.commission_amount, record.commission_amount, record.distributor_id);

        settled++;
      }
    });
    txn();

    const batchRecord = db.prepare('SELECT id FROM payout_batches WHERE batch_no = ?').get(batch_no) as any;
    return { settled, batchId: batchRecord?.id || '' };
  },

  settle(id: string): CommissionRecord | undefined {
    db.prepare("UPDATE commissions SET status = 'settled', settled_at = datetime('now', 'localtime') WHERE id = ?").run(id);
    const record = this.findById(id);
    if (record && record.status === 'settled') {
      db.prepare('UPDATE distributors SET available_commission = available_commission - ?, frozen_commission = frozen_commission + ? WHERE id = ?')
        .run(record.commission_amount, record.commission_amount, record.distributor_id);
    }
    return record;
  },
};
