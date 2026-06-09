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
  unit?: string;
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
  delivery_date?: string;
  delivery_time?: string;
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
    // 获取所有有效充值记录（按创建时间升序，先充的先消费）
    const activeRecharges = userRechargeModel.findAllActiveByUserId(data.user_id);
    if (activeRecharges.length === 0) {
      return { order: null as any, balanceError: '您暂无生效的充值余额，请先充值或选择在线支付' };
    }

    // 计算总余额
    let totalBalance = 0;
    for (const r of activeRecharges) {
      totalBalance += (r.remaining_balance || 0) + (r.bonus_balance || 0);
    }

    if (totalBalance < totalAmount) {
      return {
        order: null as any,
        balanceError: `账户余额不足（余额 ¥${totalBalance.toFixed(2)}，订单 ¥${totalAmount.toFixed(2)}），请充值后重试`,
      };
    }

    // 优先消费赠送金（逐条充值、按时间顺序），再消费本金
    let remainingToPay = totalAmount;

    // 第一轮：优先从赠送金抵扣（按充值时间升序）
    for (const recharge of activeRecharges) {
      if (remainingToPay <= 0) break;
      if (recharge.bonus_balance && recharge.bonus_balance > 0) {
        const deduct = Math.min(recharge.bonus_balance, remainingToPay);
        userRechargeModel.updateBonusBalance(recharge.id, deduct);
        fromBonus += deduct;
        remainingToPay = Math.round((remainingToPay - deduct) * 100) / 100;

        balanceTransactionModel.create({
          user_id: data.user_id,
          recharge_id: recharge.id,
          tx_type: 'consume_bonus',
          amount: deduct,
          principal_after: recharge.remaining_balance,
          bonus_after: recharge.bonus_balance - deduct,
          description: `消费抵扣 - 赠送金 - ¥${deduct.toFixed(2)}`,
        });
      }
    }

    // 第二轮：剩余从本金抵扣（按充值时间升序）
    for (const recharge of activeRecharges) {
      if (remainingToPay <= 0) break;
      if (recharge.remaining_balance && recharge.remaining_balance > 0) {
        const deduct = Math.min(recharge.remaining_balance, remainingToPay);
        userRechargeModel.updateRemainingBalance(recharge.id, deduct);
        fromBalance += deduct;
        remainingToPay = Math.round((remainingToPay - deduct) * 100) / 100;

        balanceTransactionModel.create({
          user_id: data.user_id,
          recharge_id: recharge.id,
          tx_type: 'consume_principal',
          amount: deduct,
          principal_after: recharge.remaining_balance - deduct,
          bonus_after: recharge.bonus_balance,
          description: `消费抵扣 - 本金 - ¥${deduct.toFixed(2)}`,
        });
      }
    }

    // 每笔用完的充值标记为过期
    for (const recharge of activeRecharges) {
      const refetched = userRechargeModel.findById(recharge.id);
      if (refetched) {
        const remainingTotal = (refetched.remaining_balance || 0) + (refetched.bonus_balance || 0);
        if (remainingTotal <= 0) {
          userRechargeModel.expireRecharge(recharge.id);
          balanceTransactionModel.create({
            user_id: data.user_id,
            recharge_id: recharge.id,
            tx_type: 'expire',
            amount: 0,
            principal_after: 0,
            bonus_after: 0,
            description: '余额用尽，充值套餐自动过期',
          });
        }
      }
    }

    finalAmount = remainingToPay;
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
    delivery_date: data.delivery_date || '',
    delivery_time: data.delivery_time || '',
  });

  return { order };
}

export function processPaymentSuccess(orderId: string, transactionId: string): Order | null {
  // 第一步：标记为"待派送"状态
  const order = orderModel.markPendingDelivery(orderId, transactionId);
  if (!order) return null;

  // 第二步：根据订单地址的"区"匹配派送员（随机派单）
  const deliveryman = matchDeliverymanForOrder(order);
  if (deliveryman) {
    orderModel.assignDeliveryman(order.id, deliveryman.id);
    console.log(`[派单] 订单 ${order.order_no} 已分配给派送员 ${deliveryman.name} (${(deliveryman.districts || []).join('、') || deliveryman.city})`);
  } else {
    console.warn(`[派单] 订单 ${order.order_no} 暂无可用派送员，仍为待派送状态`);
  }

  // 第三步：创建佣金记录
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


