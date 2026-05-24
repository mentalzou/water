import { getDb } from '../utils/db';
import { commissionModel } from '../models/commission.model';
import type { Order } from '../types';

interface CommissionConfig {
  type: 'percentage' | 'fixed';
  rate: number;
}

export function getCommissionConfig(): CommissionConfig {
  const db = getDb();
  const typeRow = (db.prepare("SELECT value FROM system_config WHERE key = 'commission_type'").get() as { value: string })?.value || 'percentage';
  const rateRow = (db.prepare("SELECT value FROM system_config WHERE key = 'commission_rate'").get() as { value: string })?.value || '5';
  return {
    type: (typeRow as CommissionConfig['type']) || 'percentage',
    rate: parseFloat(rateRow) || 5,
  };
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
  
  const config = getCommissionConfig();
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
