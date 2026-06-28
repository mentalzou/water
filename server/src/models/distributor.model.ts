import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import { hashPassword } from '../utils/password';
import type { Distributor } from '../types';

const db = getDb();

export const distributorModel = {
  create(userId: string, data: { name: string; phone: string; password?: string; commission_type?: string; commission_rate?: number }): Distributor & { user?: any } {
    const id = uuidv4();
    const code = `DM${Date.now().toString(36).toUpperCase()}`;
    const commissionType = data.commission_type || 'percentage';
    const commissionRate = data.commission_rate ?? 5;
    
    // Create user first
    const existingUser = db.prepare('SELECT id FROM users WHERE phone = ?').get(data.phone);
    let userIdToUse = userId;
    if (!existingUser) {
      const newUserId = uuidv4();
      const passwordHash = data.password ? hashPassword(data.password) : '';
      db.prepare('INSERT INTO users (id, phone, name, role, password_hash) VALUES (?, ?, ?, ?, ?)').run(newUserId, data.phone, data.name, 'distributor', passwordHash);
      userIdToUse = newUserId;
    }

    db.prepare(
      'INSERT INTO distributors (id, user_id, code, commission_type, commission_rate) VALUES (?, ?, ?, ?, ?)'
    ).run(id, userIdToUse, code, commissionType, commissionRate);
    
    return this.findByIdWithUser(id)!;
  },

  findById(id: string): Distributor | undefined {
    return db.prepare('SELECT * FROM distributors WHERE id = ?').get(id) as Distributor | undefined;
  },

  findByCode(code: string): Distributor | undefined {
    return db.prepare('SELECT * FROM distributors WHERE code = ?').get(code) as Distributor | undefined;
  },

  findByUserId(userId: string): Distributor | undefined {
    return db.prepare('SELECT * FROM distributors WHERE user_id = ?').get(userId) as Distributor | undefined;
  },

  findByIdWithUser(id: string): (Distributor & { user: any }) | undefined {
    return db.prepare(
      'SELECT d.*, u.id as user_id, u.phone, u.name as user_name, u.avatar FROM distributors d LEFT JOIN users u ON d.user_id = u.id WHERE d.id = ?'
    ).get(id) as (Distributor & { user: any }) | undefined;
  },

  findAll(page = 1, pageSize = 20, options?: { keyword?: string; status?: string }): { data: (Distributor & { user: any })[]; total: number } {
    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (options?.keyword) {
      where += ' AND (u.name LIKE ? OR u.phone LIKE ? OR d.code LIKE ?)';
      params.push(`%${options.keyword}%`, `%${options.keyword}%`, `%${options.keyword}%`);
    }
    if (options?.status) {
      where += ' AND d.status = ?';
      params.push(options.status);
    }
    const total = (db.prepare(`SELECT COUNT(*) as count FROM distributors d LEFT JOIN users u ON d.user_id = u.id ${where}`).get(...params) as { count: number }).count;
    const data = db.prepare(
      `SELECT d.*, u.id as user_id, u.phone, u.name as user_name, u.avatar FROM distributors d LEFT JOIN users u ON d.user_id = u.id ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, pageSize, (page - 1) * pageSize) as (Distributor & { user: any })[];
    return { data, total };
  },

  update(id: string, data: Partial<Distributor>): Distributor | undefined {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE distributors SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.findById(id);
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM distributors WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
