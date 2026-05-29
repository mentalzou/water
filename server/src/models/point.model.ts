import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { PointsRecord } from '../types';

const db = getDb();

export const pointsRecordModel = {
  create(data: Omit<PointsRecord, 'id' | 'created_at'>): PointsRecord {
    const id = uuidv4();
    db.prepare(
        'INSERT INTO points_records (id, user_id, order_id, change_type, change_amount, balance_after, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
        id,
        data.user_id,
        data.order_id || null,
        data.change_type,
        data.change_amount,
        data.balance_after,
        data.description
    );
    return this.findById(id)!;
  },

  findById(id: string): PointsRecord | undefined {
    return db.prepare('SELECT * FROM points_records WHERE id = ?').get(id) as PointsRecord | undefined;
  },

  findByUserId(userId: string, page = 1, pageSize = 20): { data: PointsRecord[]; total: number } {
    const total = (db.prepare('SELECT COUNT(*) as count FROM points_records WHERE user_id = ?').get(userId) as { count: number }).count;
    const data = db.prepare(
        'SELECT * FROM points_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(userId, pageSize, (page - 1) * pageSize) as PointsRecord[];

    return { data, total };
  },

  findByOrderId(orderId: string): PointsRecord[] {
    return db.prepare(
        'SELECT * FROM points_records WHERE order_id = ? ORDER BY created_at ASC'
    ).all(orderId) as PointsRecord[];
  },
};
