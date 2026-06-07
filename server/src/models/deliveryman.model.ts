import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import { hashPassword } from '../utils/password';
import type { Deliveryman } from '../types';

const db = getDb();

export const deliverymanModel = {
  create(data: Partial<Deliveryman> & { password?: string }): Deliveryman {
    const id = uuidv4();

    // Create user for login
    let userIdToUse: string | null = null;
    if (data.phone) {
      const existingUser = db.prepare('SELECT id FROM users WHERE phone = ?').get(data.phone) as any;
      if (!existingUser) {
        const newUserId = uuidv4();
        const passwordHash = data.password ? hashPassword(data.password) : '';
        db.prepare('INSERT INTO users (id, phone, name, role, status, password_hash) VALUES (?, ?, ?, ?, ?, ?)').run(
          newUserId, data.phone, data.name || '', 'deliveryman', data.status || 'active', passwordHash,
        );
        userIdToUse = newUserId;
      } else {
        userIdToUse = existingUser.id;
      }
    }

    db.prepare(
      'INSERT INTO deliverymen (id, user_id, name, phone, area_ids, province, city, district, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id,
      userIdToUse,
      data.name || '',
      data.phone || '',
      JSON.stringify(data.area_ids || []),
      data.province || '',
      data.city || '',
      data.district || '',
      data.status || 'active'
    );
    return this.findById(id)!;
  },

  findById(id: string): Deliveryman | undefined {
    const row = db.prepare('SELECT * FROM deliverymen WHERE id = ?').get(id) as any;
    if (row) {
      row.area_ids = JSON.parse(row.area_ids || '[]');
    }
    return row;
  },

  findByIdWithUser(id: string): (Deliveryman & { user_id?: string }) | undefined {
    const row = db.prepare(
      'SELECT d.*, u.id as user_id FROM deliverymen d LEFT JOIN users u ON d.user_id = u.id WHERE d.id = ?'
    ).get(id) as any;
    if (row) {
      row.area_ids = JSON.parse(row.area_ids || '[]');
    }
    return row;
  },

  findByPhone(phone: string): Deliveryman | undefined {
    const row = db.prepare('SELECT * FROM deliverymen WHERE phone = ?').get(phone) as any;
    if (row) {
      row.area_ids = JSON.parse(row.area_ids || '[]');
    }
    return row;
  },

  findAll(page = 1, pageSize = 20): { data: (Deliveryman & { user_id?: string; areas?: string[] })[]; total: number } {
    const total = (db.prepare('SELECT COUNT(*) as count FROM deliverymen').get() as { count: number }).count;
    const rows = db.prepare(
      'SELECT d.*, u.id as user_id FROM deliverymen d LEFT JOIN users u ON d.user_id = u.id ORDER BY d.created_at DESC LIMIT ? OFFSET ?'
    ).all(pageSize, (page - 1) * pageSize) as any[];
    const data = rows.map(row => {
      const areaIds: string[] = JSON.parse(row.area_ids || '[]');
      // 解析区域名称
      let areas: string[] = [];
      if (areaIds.length > 0) {
        const placeholders = areaIds.map(() => '?').join(',');
        const areaRows = db.prepare(`SELECT name FROM areas WHERE id IN (${placeholders})`).all(...areaIds) as any[];
        areas = areaRows.map((a: any) => a.name);
      }
      return { ...row, area_ids: areaIds, areas };
    });
    return { data, total };
  },

  findActiveByAreaId(areaId: string): Deliveryman[] {
    const allActive = db.prepare("SELECT * FROM deliverymen WHERE status = 'active'").all() as any[];
    return allActive
      .map(row => ({ ...row, area_ids: JSON.parse(row.area_ids || '[]') }))
      .filter((d: Deliveryman) => d.area_ids.includes(areaId));
  },

  /** 按区（district）查找活跃派送员，用于按收货地址区级匹配 */
  findActiveByDistrict(district: string): Deliveryman[] {
    const rows = db.prepare(
      "SELECT * FROM deliverymen WHERE status = 'active' AND district = ?"
    ).all(district) as any[];
    return rows.map(row => ({ ...row, area_ids: JSON.parse(row.area_ids || '[]') }));
  },

  update(id: string, data: Partial<Deliveryman>): Deliveryman | undefined {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(key === 'area_ids' ? JSON.stringify(value) : value);
      }
    }
    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE deliverymen SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.findById(id);
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM deliverymen WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
