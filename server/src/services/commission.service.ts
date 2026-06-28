import { getDb } from '../utils/db';
import { commissionModel } from '../models/commission.model';
import type { Order } from '../types';

interface CommissionConfig {
  type: 'percentage' | 'fixed';
  rate: number;
}

/** 获取全局默认返佣配置（兜底，分销商无个性化配置时使用） */
export function getCommissionConfig(): CommissionConfig {
  const db = getDb();
  const typeRow = (db.prepare("SELECT value FROM system_config WHERE key = 'commission_type'").get() as { value: string })?.value || 'percentage';
  const rateRow = (db.prepare("SELECT value FROM system_config WHERE key = 'commission_rate'").get() as { value: string })?.value || '5';
  return {
    type: (typeRow as CommissionConfig['type']) || 'percentage',
    rate: parseFloat(rateRow) || 5,
  };
}

/** 获取指定分销商的返佣配置（优先个性化配置，无则使用全局默认） */
export function getDistributorCommissionConfig(distributorId: string): CommissionConfig {
  const db = getDb();
  const dist = db.prepare('SELECT commission_type, commission_rate FROM distributors WHERE id = ?').get(distributorId) as { commission_type: string; commission_rate: number } | undefined;
  if (dist && dist.commission_type) {
    return {
      type: dist.commission_type as CommissionConfig['type'],
      rate: dist.commission_rate ?? 5,
    };
  }
  return getCommissionConfig();
}

export function calculateCommission(orderAmount: number, config?: CommissionConfig): number {
  const cfg = config || getCommissionConfig();
  if (cfg.type === 'percentage') {
    return Math.round(orderAmount * (cfg.rate / 100) * 100) / 100;
  }
  return cfg.rate; // Fixed amount per order
}

export function createCommissionRecord(order: Order): void {
  if (!order.distributor_id) return;
  
  // 优先使用该分销商的个性化返佣配置
  const config = getDistributorCommissionConfig(order.distributor_id);
  const amount = calculateCommission(order.total_amount, config);
  
  if (amount <= 0) return;

  commissionModel.create({
    order_id: order.id,
    distributor_id: order.distributor_id,
    order_amount: order.total_amount,
    commission_rate: config.rate,
    commission_type: config.type,
    commission_amount: amount,
  });
}
