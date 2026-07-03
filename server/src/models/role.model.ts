import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { Role } from '../types';

const db = getDb();

export const roleModel = {
  create(data: Partial<Role>): Role {
    const id = uuidv4();
    db.prepare(
      'INSERT INTO roles (id, name, code, description, permissions, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))'
    ).run(id, data.name || '', data.code || '', data.description || '', data.permissions || '[]');
    return this.findById(id)!;
  },

  findById(id: string): Role | undefined {
    return db.prepare('SELECT * FROM roles WHERE id = ?').get(id) as Role | undefined;
  },

  findByCode(code: string): Role | undefined {
    return db.prepare('SELECT * FROM roles WHERE code = ?').get(code) as Role | undefined;
  },

  findAll(): Role[] {
    return db.prepare('SELECT * FROM roles ORDER BY created_at ASC').all() as Role[];
  },

  update(id: string, data: Partial<Role>): Role | undefined {
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
      db.prepare(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.findById(id);
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM roles WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
