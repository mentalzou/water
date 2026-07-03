import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';

export interface Region {
  id: string;
  name: string;
  parent_id: string | null; // NULL=省, 省id=市, 市id=区
  level: number; // 1=省 2=市 3=区
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface RegionTreeNode extends Region {
  children: RegionTreeNode[];
}

const db = getDb();

export const regionModel = {
  create(data: { name: string; parent_id?: string | null }): Region {
    const id = uuidv4();
    let level = 1;
    if (data.parent_id) {
      const parent = this.findById(data.parent_id);
      if (parent) level = parent.level + 1;
    }
    const maxSort = (db.prepare(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM regions WHERE parent_id IS ?'
    ).get(data.parent_id ?? null) as { next: number }).next;

    db.prepare(
      'INSERT INTO regions (id, name, parent_id, level, sort_order, status, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))'
    ).run(id, data.name, data.parent_id || null, level, maxSort, 'active');

    return this.findById(id)!;
  },

  findById(id: string): Region | undefined {
    return db.prepare('SELECT * FROM regions WHERE id = ?').get(id) as Region | undefined;
  },

  /** 获取所有省份 */
  findProvinces(): Region[] {
    return db.prepare(
      "SELECT * FROM regions WHERE parent_id IS NULL AND status = 'active' ORDER BY sort_order ASC"
    ).all() as Region[];
  },

  /** 获取某父节点下的子节点 */
  findByParentId(parentId: string): Region[] {
    return db.prepare(
      "SELECT * FROM regions WHERE parent_id = ? AND status = 'active' ORDER BY sort_order ASC"
    ).all(parentId) as Region[];
  },

  /** 获取完整树结构（含停用节点，给管理后台用） */
  getTree(includeInactive = false): RegionTreeNode[] {
    const statusClause = includeInactive ? '' : " AND status = 'active'";
    const all = db.prepare(
      `SELECT * FROM regions WHERE 1=1${statusClause} ORDER BY level ASC, sort_order ASC`
    ).all() as Region[];

    return buildTree(all, null);
  },

  /** 获取所有节点（扁平列表） */
  findAll(): Region[] {
    return db.prepare(
      'SELECT * FROM regions ORDER BY level ASC, sort_order ASC'
    ).all() as Region[];
  },

  update(id: string, data: Partial<Pick<Region, 'name' | 'sort_order' | 'status'>>): Region | undefined {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    db.prepare(`UPDATE regions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  },

  /** 删除节点及其所有子孙节点 */
  delete(id: string): { deleted: number } {
    const region = this.findById(id);
    if (!region) return { deleted: 0 };
    // 收集所有子孙节点 id
    const idsToDelete: string[] = [];
    const collect = (pid: string) => {
      const children = db.prepare(
        'SELECT id FROM regions WHERE parent_id = ?'
      ).all(pid) as { id: string }[];
      for (const c of children) {
        idsToDelete.push(c.id);
        collect(c.id);
      }
    };
    idsToDelete.push(id);
    collect(id);

    const deleteStmt = db.prepare('DELETE FROM regions WHERE id = ?');
    let count = 0;
    for (const delId of idsToDelete) {
      const r = deleteStmt.run(delId);
      count += r.changes;
    }
    return { deleted: count };
  },
};

function buildTree(list: Region[], parentId: string | null): RegionTreeNode[] {
  const children = list.filter(r => r.parent_id === parentId);
  return children.map(r => ({
    ...r,
    children: buildTree(list, r.id),
  }));
}

export default regionModel;
