import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';
import type { AdBanner } from '../types';

const db = getDb();

export const adBannerModel = {
  /** 前台：获取所有启用的广告栏，按排序排列 */
  findActive(): AdBanner[] {
    return db.prepare(
        "SELECT * FROM ad_banners WHERE status = 'active' ORDER BY sort_order ASC"
    ).all() as AdBanner[];
  },

  /** 后台：获取全部（含禁用） */
  findAll(): AdBanner[] {
    return db.prepare(
        'SELECT * FROM ad_banners ORDER BY sort_order ASC, created_at DESC'
    ).all() as AdBanner[];
  },

  findById(id: string): AdBanner | undefined {
    return db.prepare('SELECT * FROM ad_banners WHERE id = ?').get(id) as AdBanner | undefined;
  },

  create(data: {
    title: string;
    subtitle?: string;
    type: 'image' | 'video';
    src: string;
    link_url?: string;
    bg_color?: string;
    sort_order?: number;
  }): AdBanner {
    const id = uuidv4();
    db.prepare(
        `INSERT INTO ad_banners (id, title, subtitle, type, src, link_url, bg_color, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
        id, data.title, data.subtitle || '', data.type, data.src,
        data.link_url || '', data.bg_color || '', data.sort_order || 0
    );
    return this.findById(id)!;
  },

  update(id: string, data: Partial<{
    title: string;
    subtitle: string;
    type: 'image' | 'video';
    src: string;
    link_url: string;
    bg_color: string;
    sort_order: number;
    status: 'active' | 'inactive';
  }>): AdBanner | undefined {
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return this.findById(id);
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE ad_banners SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM ad_banners WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
