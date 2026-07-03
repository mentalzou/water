import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { User } from '../types';

const db = getDb();

export const userModel = {
  create(data: Partial<User> & { phone: string }): User {
    const id = uuidv4();
    db.prepare(
      'INSERT INTO users (id, phone, name, role, password_hash, avatar, status, referrer_distributor_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'), datetime(\'now\', \'localtime\'))'
    ).run(
      id,
      data.phone,
      data.name || '',
      data.role || 'customer',
      data.password_hash || '',
      data.avatar || '',
      data.status || 'active',
      (data as any).referrer_distributor_id || ''
    );
    return this.findById(id)!;
  },

  findById(id: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  },

  findByPhone(phone: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as User | undefined;
  },

  findByOpenId(openId: string): User | undefined {
    if (!openId) return undefined;
    return db.prepare("SELECT * FROM users WHERE open_id = ? AND open_id != ''").get(openId) as User | undefined;
  },

  findAll(page = 1, pageSize = 20, role?: string, keyword?: string): { data: User[]; total: number } {
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];
    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    if (keyword) {
      sql += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    let countSql = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
    const countParams: any[] = [];
    if (role) { countSql += ' AND role = ?'; countParams.push(role); }
    if (keyword) { countSql += ' AND (name LIKE ? OR phone LIKE ?)'; countParams.push(`%${keyword}%`, `%${keyword}%`); }

    const total = (db.prepare(countSql).get(...countParams) as { count: number }).count;
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);
    const data = db.prepare(sql).all(...params) as User[];
    return { data, total };
  },

  /** 查询某分销商的下线客户 */
  findByReferrer(distributorId: string, page = 1, pageSize = 20): { data: User[]; total: number } {
    const total = (db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE referrer_distributor_id = ? AND role = ?'
    ).get(distributorId, 'customer') as { count: number }).count;
    const data = db.prepare(
      'SELECT * FROM users WHERE referrer_distributor_id = ? AND role = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(distributorId, 'customer', pageSize, (page - 1) * pageSize) as User[];
    return { data, total };
  },

  /** 统计某分销商的下线数量 */
  countByReferrer(distributorId: string): number {
    return (db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE referrer_distributor_id = ? AND role = ?'
    ).get(distributorId, 'customer') as { count: number }).count;
  },

  update(id: string, data: Partial<User>): User | undefined {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length > 0) {
      fields.push("updated_at = datetime('now', 'localtime')");
      values.push(id);
      db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.findById(id);
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
