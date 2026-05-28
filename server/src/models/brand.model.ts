import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { Brand } from '../types';

const db = getDb();

export const brandModel = {
  create(data: { name: string; description?: string; logo?: string; category_id?: string; status?: string; sort_order?: number }): Brand {
    const id = `brand-${Date.now()}`;
    db.prepare(
      'INSERT INTO brands (id, name, logo, description, category_id, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id,
      data.name || '',
      data.logo || '',
      data.description || '',
      data.category_id || '',
      data.status || 'active',
      data.sort_order ?? 0
    );
    return this.findById(id)!;
  },

  findById(id: string): Brand | undefined {
    const row = db.prepare('SELECT b.*, c.name as category_name FROM brands b LEFT JOIN product_categories c ON b.category_id = c.id WHERE b.id = ?').get(id) as any;
    return row || undefined;
  },

  findAll(activeOnly = true, keyword?: string, categoryId?: string): Brand[] {
    let sql = activeOnly
        ? 'SELECT b.*, c.name as category_name FROM brands b LEFT JOIN product_categories c ON b.category_id = c.id WHERE b.status = ?'
        : 'SELECT b.*, c.name as category_name FROM brands b LEFT JOIN product_categories c ON b.category_id = c.id WHERE 1=1';
    const params: any[] = activeOnly ? ['active'] : [];
    if (keyword) {
      sql += ' AND b.name LIKE ?';
      params.push(`%${keyword}%`);
    }
    if (categoryId) {
      sql += ' AND b.category_id = ?';
      params.push(categoryId);
    }
    sql += ' ORDER BY b.sort_order ASC';
    return db.prepare(sql).all(...params) as Brand[];
  },

  findForSelect(categoryId?: string): { id: string; name: string; category_id?: string }[] {
    let sql = 'SELECT id, name, category_id FROM brands WHERE status = ?';
    const params: any[] = ['active'];
    if (categoryId) {
      sql += ' AND category_id = ?';
      params.push(categoryId);
    }
    sql += ' ORDER BY sort_order ASC';
    return db.prepare(sql).all(...params) as any[];
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
