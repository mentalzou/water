import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';

export interface Address {
  id: string;
  user_id: string;
  contact_name: string;
  contact_phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  building_type: string;
  floor: number;
  is_default: number;
  created_at: string;
  updated_at: string;
}

const addressModel = {
  create(data: {
    user_id: string;
    contact_name: string;
    contact_phone: string;
    province?: string;
    city?: string;
    district?: string;
    detail: string;
    building_type?: string;
    floor?: number;
    is_default?: number;
  }): Address {
    const db = getDb();
    const id = uuidv4();
    const isDefault = data.is_default || 0;

    // 如果设为默认，先取消该用户其他默认地址
    if (isDefault) {
      db.prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?").run(data.user_id);
    }

    db.prepare(
      'INSERT INTO addresses (id, user_id, contact_name, contact_phone, province, city, district, detail, building_type, floor, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'), datetime(\'now\', \'localtime\'))'
    ).run(id, data.user_id, data.contact_name, data.contact_phone, data.province || '', data.city || '', data.district || '', data.detail, data.building_type || 'stairs', data.floor ?? 1, isDefault);

    return addressModel.findById(id)!;
  },

  findById(id: string): Address | undefined {
    return getDb().prepare('SELECT * FROM addresses WHERE id = ?').get(id) as Address | undefined;
  },

  findByUserId(userId: string): Address[] {
    return getDb().prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC').all(userId) as Address[];
  },

  update(id: string, data: Partial<Omit<Address, 'id' | 'user_id' | 'created_at'>>): Address | undefined {
    const db = getDb();
    const existing = addressModel.findById(id);
    if (!existing) return undefined;

    // 如果设为默认，先取消该用户其他默认地址
    if (data.is_default === 1) {
      db.prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?").run(existing.user_id);
    }

    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(id);
    db.prepare(`UPDATE addresses SET ${fields.join(', ')}, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(...values);

    return addressModel.findById(id);
  },

  delete(id: string, userId: string): boolean {
    const db = getDb();
    const result = db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(id, userId);
    return result.changes > 0;
  },
};

export default addressModel;
