import { orderModel } from '../models/order.model';
import { productModel } from '../models/product.model';
import { matchDeliverymanForOrder } from './matching.service';
import { createCommissionRecord } from './commission.service';
import { rewardPointsForOrder } from './points.service';
import { userRechargeModel } from '../models/userRecharge.model';
import type { Order } from '../types';

export interface OrderItemInput {
  product_id: string;
  quantity: number;
}

/** 创建客户订单（支持多商品） */
export function createCustomerOrder(data: {
  customer_phone: string;
  customer_name: string;
  address: string;
  items: OrderItemInput[];
  distributor_id?: string;
  user_id?: string;
}): Order | null {
  // 验证所有商品并计算总金额
  let totalAmount = 0;
  const processedItems: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    unit?: string;
  }> = [];

  for (const item of data.items) {
    const product = productModel.findById(item.product_id);
    if (!product) return null;

    const itemTotal = Math.round(product.price * item.quantity * 100) / 100;
    totalAmount += itemTotal;

    processedItems.push({
      product_id: item.product_id,
      product_name: product.name,
      quantity: item.quantity,
      unit_price: product.price,
      unit: product.unit || '瓶',
    });
  }

  totalAmount = Math.round(totalAmount * 100) / 100;

  // 检查用户是否有有效的充值套餐，应用折扣
  let finalAmount = totalAmount;
  let appliedDiscount = 1;

  if (data.user_id) {
    const activeRecharge = userRechargeModel.findActiveByUserId(data.user_id);
    if (activeRecharge && activeRecharge.remaining_balance > 0) {
      appliedDiscount = activeRecharge.discount_rate;
      finalAmount = Math.round(totalAmount * appliedDiscount * 100) / 100;

      // 从充值余额中扣除使用的金额
      const usedAmount = Math.round((totalAmount - finalAmount) * 100) / 100;
      if (usedAmount > 0) {
        userRechargeModel.updateRemainingBalance(activeRecharge.id, usedAmount);

        // 如果余额用完，标记为过期
        if (activeRecharge.remaining_balance - usedAmount <= 0) {
          userRechargeModel.expireRecharge(activeRecharge.id);
        }
      }
    }
  }

  // 计算佣金（基于折后金额）
  let distributorCommission = 0;
  if (data.distributor_id) {
    const { calculateCommission, getCommissionConfig } = require('./commission.service');
    const config = getCommissionConfig();
    distributorCommission = calculateCommission(finalAmount, config);
  }

  const order = orderModel.create({
    customer_phone: data.customer_phone,
    customer_name: data.customer_name,
    address: data.address,
    total_amount: finalAmount,
    distributor_id: data.distributor_id,
    distributor_commission: distributorCommission,
    items: processedItems,
  });

  return order;
}

export function processPaymentSuccess(orderId: string, transactionId: string): Order | null {
  const order = orderModel.markPaid(orderId, transactionId);
  if (!order) return null;

  // Auto-match deliveryman
  const deliveryman = matchDeliverymanForOrder(order);
  if (deliveryman) {
    orderModel.assignDeliveryman(order.id, deliveryman.id);
  }

  // Create commission record
  createCommissionRecord(order);

  return orderModel.findById(orderId)!;
}

export function updateOrderStatus(orderId: string, status: Order['status']): Order | undefined {
  const order = orderModel.updateStatus(orderId, status);

  // 订单完成时发放积分
  if (status === 'completed' && order) {
    rewardPointsForOrder(orderId, order.total_amount, order.customer_phone);
  }

  return order;
}


