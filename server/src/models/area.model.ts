import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { Area } from '../types';

const db = getDb();

export const areaModel = {
  create(data: Partial<Area>): Area {
    const id = uuidv4();
    db.prepare(
      'INSERT INTO areas (id, name, description, deliveryman_ids) VALUES (?, ?, ?, ?)'
    ).run(id, data.name || '', data.description || '', JSON.stringify(data.deliveryman_ids || []));
    return this.findById(id)!;
  },

  findById(id: string): Area | undefined {
    const row = db.prepare('SELECT * FROM areas WHERE id = ?').get(id) as any;
    if (row) {
      row.deliveryman_ids = JSON.parse(row.deliveryman_ids || '[]');
    }
    return row;
  },

  findAll(): Area[] {
    const rows = db.prepare('SELECT * FROM areas ORDER BY created_at ASC').all() as any[];
    return rows.map(row => ({ ...row, deliveryman_ids: JSON.parse(row.deliveryman_ids || '[]') }));
  },

  findPaginated(page = 1, pageSize = 20): { data: Area[]; total: number } {
    const total = (db.prepare('SELECT COUNT(*) as count FROM areas').get() as { count: number }).count;
    const rows = db.prepare('SELECT * FROM areas ORDER BY created_at ASC LIMIT ? OFFSET ?').all(pageSize, (page - 1) * pageSize) as any[];
    const data = rows.map(row => ({ ...row, deliveryman_ids: JSON.parse(row.deliveryman_ids || '[]') }));
    return { data, total };
  },

  findByName(name: string): Area | undefined {
    return this.findAll().find(a => a.name === name);
  },

  matchByAddress(address: string): Area | null {
    const areas = this.findAll();
    // Simple keyword matching - can be enhanced with more sophisticated geo-matching
    for (const area of areas) {
      if (address.includes(area.name)) {
        return area;
      }
    }
    // Fallback to first area if exists
    return areas.length > 0 ? areas[0] : null;
  },

  update(id: string, data: Partial<Area>): Area | undefined {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(key === 'deliveryman_ids' ? JSON.stringify(value) : value);
      }
    }
    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE areas SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.findById(id);
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM areas WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
