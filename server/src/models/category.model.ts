
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { ProductCategory } from '../types';

const db = getDb();

export const categoryModel = {
  create(data: { name: string; code: string; description?: string; icon?: string; sort_order?: number }): ProductCategory {
    const id = `cat-${Date.now()}`;
    db.prepare(
        'INSERT INTO product_categories (id, name, code, description, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))'
    ).run(
        id,
        data.name || '',
        data.code || '',
        data.description || '',
        data.icon || '',
        data.sort_order ?? 0
    );
    return this.findById(id)!;
  },

  findById(id: string): ProductCategory | undefined {
    return db.prepare('SELECT * FROM product_categories WHERE id = ?').get(id) as ProductCategory | undefined;
  },

  findByCode(code: string): ProductCategory | undefined {
    return db.prepare('SELECT * FROM product_categories WHERE code = ?').get(code) as ProductCategory | undefined;
  },

  findAll(activeOnly = true, keyword?: string): ProductCategory[] {
    let sql = activeOnly
        ? 'SELECT * FROM product_categories WHERE status = ?'
        : 'SELECT * FROM product_categories WHERE 1=1';
    const params: any[] = activeOnly ? ['active'] : [];
    if (keyword) {
      sql += ' AND (name LIKE ? OR code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    sql += ' ORDER BY sort_order ASC';
    return db.prepare(sql).all(...params) as ProductCategory[];
  },

  findForSelect(): { id: string; name: string; code: string }[] {
    return db.prepare('SELECT id, name, code FROM product_categories WHERE status = ? ORDER BY sort_order ASC').all('active') as any[];
  },

  update(id: string, data: Partial<ProductCategory>): ProductCategory | undefined {
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
      db.prepare(`UPDATE product_categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.findById(id);
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM product_categories WHERE id = ?').run(id);
    return result.changes > 0;
  },
};