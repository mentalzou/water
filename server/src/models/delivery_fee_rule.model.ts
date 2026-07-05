import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../utils/db';

export interface DeliveryFeeRule {
  id: string;
  building_type: 'stairs' | 'elevator';
  floor_from: number;
  floor_to: number;
  fee: number;
  created_at: string;
  updated_at: string;
}

const deliveryFeeRuleModel = {
  /** 获取所有配送费规则 */
  findAll(): DeliveryFeeRule[] {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM delivery_fee_rules ORDER BY building_type, floor_from'
    ).all() as DeliveryFeeRule[];
  },

  /** 按楼房类型获取规则列表 */
  findByBuildingType(buildingType: 'stairs' | 'elevator'): DeliveryFeeRule[] {
    const db = getDb();
    return db.prepare(
      'SELECT * FROM delivery_fee_rules WHERE building_type = ? ORDER BY floor_from'
    ).all(buildingType) as DeliveryFeeRule[];
  },

  /** 根据楼房类型和楼层计算配送费，未匹配到则返回 0 */
  calculateFee(buildingType: string, floor: number): number {
    const db = getDb();
    const rule = db.prepare(
      'SELECT fee FROM delivery_fee_rules WHERE building_type = ? AND floor_from <= ? AND floor_to >= ? LIMIT 1'
    ).get(buildingType, floor, floor) as { fee: number } | undefined;
    return rule?.fee ?? 0;
  },

  /** 获取指定楼房类型的默认配送费描述（用于前端展示） */
  getFeeByBuildingType(buildingType: string): Record<number, number> {
    const db = getDb();
    const rules = db.prepare(
      'SELECT floor_from, fee FROM delivery_fee_rules WHERE building_type = ? ORDER BY floor_from'
    ).all(buildingType) as { floor_from: number; fee: number }[];
    const map: Record<number, number> = {};
    for (const r of rules) {
      map[r.floor_from] = r.fee;
    }
    return map;
  },

  /** 创建规则 */
  create(data: {
    building_type: 'stairs' | 'elevator';
    floor_from: number;
    floor_to: number;
    fee: number;
  }): DeliveryFeeRule {
    const db = getDb();
    const id = uuidv4();
    db.prepare(
      `INSERT INTO delivery_fee_rules (id, building_type, floor_from, floor_to, fee, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))`
    ).run(id, data.building_type, data.floor_from, data.floor_to, data.fee);
    return deliveryFeeRuleModel.findById(id)!;
  },

  /** 更新规则 */
  update(id: string, data: {
    building_type?: 'stairs' | 'elevator';
    floor_from?: number;
    floor_to?: number;
    fee?: number;
  }): DeliveryFeeRule | undefined {
    const db = getDb();
    const sets: string[] = [];
    const values: any[] = [];
    for (const [k, v] of Object.entries(data)) {
      sets.push(`${k} = ?`);
      values.push(v);
    }
    if (sets.length === 0) return deliveryFeeRuleModel.findById(id);
    values.push(id);
    db.prepare(
      `UPDATE delivery_fee_rules SET ${sets.join(', ')}, updated_at = datetime('now', 'localtime') WHERE id = ?`
    ).run(...values);
    return deliveryFeeRuleModel.findById(id);
  },

  /** 删除规则 */
  delete(id: string): boolean {
    const db = getDb();
    const r = db.prepare('DELETE FROM delivery_fee_rules WHERE id = ?').run(id);
    return r.changes > 0;
  },

  findById(id: string): DeliveryFeeRule | undefined {
    return getDb().prepare('SELECT * FROM delivery_fee_rules WHERE id = ?').get(id) as DeliveryFeeRule | undefined;
  },
};

export default deliveryFeeRuleModel;
