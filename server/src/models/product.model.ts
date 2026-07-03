
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { Product } from '../types';

const db = getDb();

export const productModel = {
  create(data: Partial<Product>): Product {
    const id = `prod-${Date.now()}`;
    db.prepare(
      'INSERT INTO products (id, name, description, price, unit, image, stock, frozen_stock, min_order_quantity, brand_id, category_id, status, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))'
    ).run(
      id,
      data.name || '',
      data.description || '',
      data.price || 0,
      data.unit || '瓶',
      data.image || '',
      data.stock ?? 99999,
      data.frozen_stock ?? 0,
      data.min_order_quantity ?? 1,
      data.brand_id || '',
      data.category_id || '',
      data.status || 'active',
      data.sort_order ?? 0
    );
    return this.findById(id)!;
  },

  findById(id: string): Product | undefined {
    const row = db.prepare(
        'SELECT p.*, b.name as brand_name, c.name as category_name FROM products p LEFT JOIN brands b ON p.brand_id = b.id LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.id = ?'
    ).get(id) as any;
    return row || undefined;
  },

  findAll(activeOnly = true, options?: { brandId?: string; categoryId?: string; keyword?: string }): Product[] {
    let sql = activeOnly
      ? 'SELECT p.*, b.name as brand_name, c.name as category_name FROM products p LEFT JOIN brands b ON p.brand_id = b.id LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.status = ?'
      : 'SELECT p.*, b.name as brand_name, c.name as category_name FROM products p LEFT JOIN brands b ON p.brand_id = b.id LEFT JOIN product_categories c ON p.category_id = c.id WHERE 1=1';
    const params: any[] = [];
    if (activeOnly) {
      params.push('active');
    }
    if (options?.brandId) {
      sql += ' AND p.brand_id = ?';
      params.push(options.brandId);
    }
    if (options?.categoryId) {
      sql += ' AND p.category_id = ?';
      params.push(options.categoryId);
    }
    if (options?.keyword) {
      sql += ' AND p.name LIKE ?';
      params.push(`%${options.keyword}%`);
    }
    sql += ' ORDER BY p.sort_order ASC';
    return db.prepare(sql).all(...params) as Product[];
  },

  findPaginated(page = 1, pageSize = 20, activeOnly = true, options?: { brandId?: string; categoryId?: string; keyword?: string }): { data: Product[]; total: number } {
    let sql = activeOnly
      ? 'FROM products p LEFT JOIN brands b ON p.brand_id = b.id LEFT JOIN product_categories c ON p.category_id = c.id WHERE p.status = ?'
      : 'FROM products p LEFT JOIN brands b ON p.brand_id = b.id LEFT JOIN product_categories c ON p.category_id = c.id WHERE 1=1';
    const params: any[] = [];
    if (activeOnly) {
      params.push('active');
    }
    if (options?.brandId) {
      sql += ' AND p.brand_id = ?';
      params.push(options.brandId);
    }
    if (options?.categoryId) {
      sql += ' AND p.category_id = ?';
      params.push(options.categoryId);
    }
    if (options?.keyword) {
      sql += ' AND p.name LIKE ?';
      params.push(`%${options.keyword}%`);
    }
    const countSql = 'SELECT COUNT(*) as count ' + sql;
    const dataSql = 'SELECT p.*, b.name as brand_name, c.name as category_name ' + sql + ' ORDER BY p.sort_order ASC LIMIT ? OFFSET ?';
    const total = (db.prepare(countSql).get(...params) as { count: number }).count;
    const data = db.prepare(dataSql).all(...params, pageSize, (page - 1) * pageSize) as Product[];
    return { data, total };
  },

  update(id: string, data: Partial<Product>): Product | undefined {
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
      db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.findById(id);
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /** 冻结库存（下单时调用） */
  freezeStock(productId: string, quantity: number): void {
    db.prepare('UPDATE products SET frozen_stock = frozen_stock + ? WHERE id = ?').run(quantity, productId);
  },

  /** 扣减库存 + 释放冻结（派送完成时调用） */
  deductFrozenStock(productId: string, quantity: number): void {
    db.prepare('UPDATE products SET stock = stock - ?, frozen_stock = frozen_stock - ? WHERE id = ?').run(quantity, quantity, productId);
  },

  /** 释放冻结库存（取消/退款时调用） */
  releaseFrozenStock(productId: string, quantity: number): void {
    db.prepare('UPDATE products SET frozen_stock = frozen_stock - ? WHERE id = ?').run(quantity, productId);
  },
};
