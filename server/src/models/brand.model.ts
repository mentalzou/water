import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { Brand } from '../types';

const db = getDb();

export const brandModel = {
  create(data: { name: string; description?: string; logo?: string; status?: string; sort_order?: number }): Brand {
    const id = `brand-${Date.now()}`;
    db.prepare(
      'INSERT INTO brands (id, name, logo, description, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      id,
      data.name || '',
      data.logo || '',
      data.description || '',
      data.status || 'active',
      data.sort_order ?? 0
    );
    return this.findById(id)!;
  },

  findById(id: string): Brand | undefined {
    return db.prepare('SELECT * FROM brands WHERE id = ?').get(id) as Brand | undefined;
  },

  findAll(activeOnly = true, keyword?: string): Brand[] {
    let sql = activeOnly
      ? 'SELECT * FROM brands WHERE status = ?'
      : 'SELECT * FROM brands WHERE 1=1';
    const params: any[] = activeOnly ? ['active'] : [];
    if (keyword) {
      sql += ' AND name LIKE ?';
      params.push(`%${keyword}%`);
    }
    sql += ' ORDER BY sort_order ASC';
    return db.prepare(sql).all(...params) as Brand[];
  },

  findForSelect(): { id: string; name: string }[] {
    return db.prepare('SELECT id, name FROM brands WHERE status = ? ORDER BY sort_order ASC').all('active') as any[];
  },

  update(id: string, data: Partial<Brand>): Brand | undefined {
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
      db.prepare(`UPDATE brands SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.findById(id);
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM brands WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
