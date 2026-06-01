import { orderModel } from '../models/order.model';
import { productModel } from '../models/product.model';
import { matchDeliverymanForOrder } from './matching.service';
import { createCommissionRecord } from './commission.service';
import { rewardPointsForOrder } from './points.service';
import { userRechargeModel } from '../models/userRecharge.model';
import { balanceTransactionModel } from '../models/balanceTransaction.model';
import type { Order } from '../types';

export interface OrderItemInput {
  product_id: string;
  quantity: number;
}

export interface CreateOrderResult {
  order: Order;
  balanceError?: string; // 余额支付时的错误信息
}

/** 创建客户订单（支持多商品，支持 pay_method） */
export function createCustomerOrder(data: {
  customer_phone: string;
  customer_name: string;
  address: string;
  items: OrderItemInput[];
  distributor_id?: string;
  user_id?: string;
  pay_method?: 'online' | 'balance';
}): CreateOrderResult | null {
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
      unit: item.unit || '瓶',
    });
  }

  totalAmount = Math.round(totalAmount * 100) / 100;

  const payMethod = data.pay_method || 'online';
  let finalAmount = totalAmount;
  let fromBalance = 0;
  let fromBonus = 0;

  if (payMethod === 'balance' && data.user_id) {
    const activeRecharge = userRechargeModel.findActiveByUserId(data.user_id);
    if (!activeRecharge) {
      return { order: null as any, balanceError: '您暂无生效的充值余额，请先充值或选择在线支付' };
    }

    const totalBalance = (activeRecharge.remaining_balance || 0) + (activeRecharge.bonus_balance || 0);

    if (totalBalance < totalAmount) {
      return {
        order: null as any,
        balanceError: `账户余额不足（余额 ¥${totalBalance.toFixed(2)}，订单 ¥${totalAmount.toFixed(2)}），请充值后重试`,
      };
    }

    // 优先从赠送金抵扣
    let remainingToPay = totalAmount;
    if (activeRecharge.bonus_balance && activeRecharge.bonus_balance > 0) {
      fromBonus = Math.min(activeRecharge.bonus_balance, remainingToPay);
      userRechargeModel.updateBonusBalance(activeRecharge.id, fromBonus);
      remainingToPay = Math.round((remainingToPay - fromBonus) * 100) / 100;
    }

    // 剩余从本金余额抵扣
    if (remainingToPay > 0 && activeRecharge.remaining_balance > 0) {
      fromBalance = Math.min(activeRecharge.remaining_balance, remainingToPay);
      userRechargeModel.updateRemainingBalance(activeRecharge.id, fromBalance);
      remainingToPay = Math.round((remainingToPay - fromBalance) * 100) / 100;
    }

    finalAmount = remainingToPay;

    // 记录流水
    if (fromBonus > 0) {
      balanceTransactionModel.create({
        user_id: data.user_id,
        recharge_id: activeRecharge.id,
        tx_type: 'consume_bonus',
        amount: fromBonus,
        principal_after: activeRecharge.remaining_balance - fromBalance,
        bonus_after: activeRecharge.bonus_balance - fromBonus,
        description: `消费抵扣 - 赠送金 - ¥${fromBonus.toFixed(2)}`,
      });
    }
    if (fromBalance > 0) {
      balanceTransactionModel.create({
        user_id: data.user_id,
        recharge_id: activeRecharge.id,
        tx_type: 'consume_principal',
        amount: fromBalance,
        principal_after: activeRecharge.remaining_balance - fromBalance,
        bonus_after: activeRecharge.bonus_balance - fromBonus,
        description: `消费抵扣 - 本金 - ¥${fromBalance.toFixed(2)}`,
      });
    }

    // 如果余额全部用完，标记为过期
    const remainingTotal = (activeRecharge.remaining_balance - fromBalance) + (activeRecharge.bonus_balance - fromBonus);
    if (remainingTotal <= 0) {
      userRechargeModel.expireRecharge(activeRecharge.id);
      balanceTransactionModel.create({
        user_id: data.user_id,
        recharge_id: activeRecharge.id,
        tx_type: 'expire',
        amount: 0,
        principal_after: 0,
        bonus_after: 0,
        description: '余额用尽，充值套餐自动过期',
      });
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
    total_amount: totalAmount,
    distributor_id: data.distributor_id,
    distributor_commission: distributorCommission,
    items: processedItems,
    pay_method: payMethod,
    from_balance: fromBalance,
    from_bonus: fromBonus,
  });

  return { order };
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


