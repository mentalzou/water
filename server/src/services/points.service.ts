import { getDb } from '../utils/db';
import { userModel } from '../models/user.model';
import type { PointsRecord } from '../types';

const db = getDb();

export interface PointsChangeParams {
  userId: string;
  orderId?: string;
  changeType: 'earn' | 'spend' | 'refund' | 'adjust' | 'expire';
  amount: number;
  description?: string;
}

/**
 * 获取积分配置
 */
export function getPointsConfig(): { earnRate: number; minOrderAmount: number } {
  const earnRateRow = db.prepare("SELECT value FROM system_config WHERE key = 'points_earn_rate'").get() as { value: string } | undefined;
  const minOrderRow = db.prepare("SELECT value FROM system_config WHERE key = 'points_min_order_amount'").get() as { value: string } | undefined;

  return {
    earnRate: earnRateRow ? parseFloat(earnRateRow.value) : 1, // 默认1元=1积分
    minOrderAmount: minOrderRow ? parseFloat(minOrderRow.value) : 0, // 默认无最低消费限制
  };
}

/**
 * 计算订单应得积分
 */
export function calculateOrderPoints(orderAmount: number): number {
  const config = getPointsConfig();
  if (orderAmount < config.minOrderAmount) {
    return 0;
  }
  return Math.floor(orderAmount * config.earnRate);
}

/**
 * 确保 users 表有 points 字段
 */
function ensurePointsColumn(): void {
  try {
    const userCols = db.prepare('PRAGMA table_info(users)').all() as any[];
    const hasPoints = userCols.some((c: any) => c.name === 'points');
    if (!hasPoints) {
      console.log('[Points] Adding points column to users table...');
      db.exec("ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0");
      console.log('[Points] Points column added successfully');
    }
  } catch (e) {
    console.error('[Points] Failed to add points column:', e);
  }
}

/**
 * 变更用户积分
 */
export function changePoints(params: PointsChangeParams): { newBalance: number; record: PointsRecord } {
  // 确保 points 字段存在
  ensurePointsColumn();

  const user = userModel.findById(params.userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  const currentPoints = user.points || 0;
  let newPoints: number;

  switch (params.changeType) {
    case 'earn':
      newPoints = currentPoints + params.amount;
      break;
    case 'adjust':
      newPoints = currentPoints + params.amount;
      if (newPoints < 0) {
        throw new Error('调整后的积分不能为负数，当前积分：' + currentPoints);
      }
      break;
    case 'spend':
    case 'refund':
    case 'expire':
      newPoints = currentPoints - params.amount;
      if (newPoints < 0) {
        throw new Error('积分不足');
      }
      break;
    default:
      throw new Error('无效的积分变更类型');
  }

  // 创建积分记录
  const recordId = require('uuid').v4();
  const description = params.description || getDefaultDescription(params.changeType, params.amount, params.orderId);

  db.prepare(
      'INSERT INTO points_records (id, user_id, order_id, change_type, change_amount, balance_after, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))'
  ).run(
      recordId,
      params.userId,
      params.orderId || null,
      params.changeType,
      params.amount,
      newPoints,
      description
  );

  // 更新用户积分 - 直接使用 SQL 而不是 userModel.update
  const updateResult = db.prepare('UPDATE users SET points = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(newPoints, params.userId);

  if (updateResult.changes === 0) {
    console.error('[Points] Failed to update user points for user:', params.userId);
    throw new Error('更新用户积分失败');
  }

  console.log(`[Points] User ${params.userId} points updated: ${currentPoints} -> ${newPoints}`);

  const record = db.prepare('SELECT * FROM points_records WHERE id = ?').get(recordId) as PointsRecord;

  return { newBalance: newPoints, record };
}

/**
 * 获取默认描述
 */
function getDefaultDescription(changeType: string, amount: number, orderId?: string): string {
  switch (changeType) {
    case 'earn':
      return orderId ? `订单消费获得${amount}积分` : `获得${amount}积分`;
    case 'spend':
      return `使用${amount}积分`;
    case 'refund':
      return `订单退款退回${amount}积分`;
    case 'adjust':
      return `管理员调整${amount > 0 ? '+' : ''}${amount}积分`;
    case 'expire':
      return `${amount}积分已过期`;
    default:
      return '';
  }
}

/**
 * 获取用户积分记录，支持按日期和积分范围筛选
 */
export function getUserPointsRecords(
    userId: string,
    page = 1,
    pageSize = 20,
    startDate?: string,
    endDate?: string,
    minAmount?: number,
    maxAmount?: number
): { data: PointsRecord[]; total: number } {
  let whereClauses: string[] = ['user_id = ?'];
  let params: any[] = [userId];

  if (startDate) {
    whereClauses.push("date(created_at) >= ?");
    params.push(startDate);
  }
  if (endDate) {
    whereClauses.push("date(created_at) <= ?");
    params.push(endDate);
  }
  if (minAmount !== undefined) {
    whereClauses.push('change_amount >= ?');
    params.push(minAmount);
  }
  if (maxAmount !== undefined) {
    whereClauses.push('change_amount <= ?');
    params.push(maxAmount);
  }

  const whereSQL = whereClauses.join(' AND ');
  const total = (db.prepare(`SELECT COUNT(*) as count FROM points_records WHERE ${whereSQL}`).get(...params) as { count: number }).count;

  const dataParams = [...params, pageSize, (page - 1) * pageSize];
  const data = db.prepare(
      `SELECT * FROM points_records WHERE ${whereSQL} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...dataParams) as PointsRecord[];

  return { data, total };
}

/**
 * 订单完成时奖励积分
 */
export function rewardPointsForOrder(orderId: string, orderAmount: number, customerPhone: string): PointsRecord | null {
  const user = userModel.findByPhone(customerPhone);
  if (!user) {
    return null;
  }

  const points = calculateOrderPoints(orderAmount);
  if (points <= 0) {
    return null;
  }

  const result = changePoints({
    userId: user.id,
    orderId,
    changeType: 'earn',
    amount: points,
    description: `订单完成获得${points}积分`,
  });

  return result.record;
}
