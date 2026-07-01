import { orderModel } from '../models/order.model';
import { productModel } from '../models/product.model';
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
  stockError?: string;   // 库存不足时的错误信息
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

    // 校验起送量
    const minQty = product.min_order_quantity ?? 1;
    if (item.quantity < minQty) {
      return { order: null as any, stockError: `"${product.name}" ${minQty}件起送，当前选择了${item.quantity}件` };
    }

    // 校验可售库存（stock - frozen_stock）
    const frozen = product.frozen_stock ?? 0;
    const availableStock = (product.stock ?? 99999) - frozen;
    if (availableStock < item.quantity) {
      return { order: null as any, stockError: `"${product.name}" 库存不足（可售${availableStock}件，需要${item.quantity}件）` };
    }

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

  // 冻结库存
  for (const item of processedItems) {
    productModel.freezeStock(item.product_id, item.quantity);
  }

  return { order };
}

export function processPaymentSuccess(orderId: string, transactionId: string): Order | null {
  // 第一步：标记为"待派送"状态（自动派单已禁用，由管理员手工派单）
  const order = orderModel.markPendingDelivery(orderId, transactionId);
  if (!order) return null;

  // 第二步：创建佣金记录
  createCommissionRecord(order);

  console.log(`[支付] 订单 ${order.order_no} 支付成功，已进入待派送状态，等待管理员手工派单`);

  return orderModel.findById(orderId)!;
}

export function updateOrderStatus(orderId: string, status: Order['status']): Order | undefined {
  const orderBefore = orderModel.findById(orderId);

  const order = orderModel.updateStatus(orderId, status);

  if (!order) return undefined;

  // 库存操作
  if (status === 'completed') {
    // 派送完成 → 扣减库存
    stockOperationOnStatus(orderId, 'deduct');
  } else if (status === 'cancelled' || status === 'refunded') {
    // 取消/退款 → 释放冻结库存
    stockOperationOnStatus(orderId, 'release');
  }

  // 订单完成时发放积分
  if (status === 'completed') {
    rewardPointsForOrder(orderId, order.total_amount, order.customer_phone);
  }

  return order;
}

/** 对订单中的每个商品执行库存操作：deduct（扣减） / release（释放冻结） */
function stockOperationOnStatus(orderId: string, action: 'deduct' | 'release'): void {
  const items = orderModel.getOrderItems(orderId);
  for (const item of items) {
    if (action === 'deduct') {
      productModel.deductFrozenStock(item.product_id, item.quantity);
    } else if (action === 'release') {
      productModel.releaseFrozenStock(item.product_id, item.quantity);
    }
  }
}

/** 关闭未支付订单：取消订单并释放冻结库存 */
export function closePendingOrder(orderId: string): { success: boolean; message: string } {
  const order = orderModel.findById(orderId);
  if (!order) {
    return { success: false, message: '订单不存在' };
  }
  if (order.status !== 'pending') {
    return { success: false, message: `订单状态为"${order.status}"，只能关闭待支付订单` };
  }

  // 1. 更新状态为 cancelled
  orderModel.cancelOrder(orderId);

  // 2. 释放冻结库存
  stockOperationOnStatus(orderId, 'release');

  console.log(`[订单关闭] 订单 ${order.order_no} 已关闭，冻结库存已释放`);
  return { success: true, message: `订单 ${order.order_no} 已关闭` };
}

/** 自动关闭超过指定小时数未支付的订单，返回关闭数量 */
export function autoCloseExpiredOrders(hours: number = 24): number {
  const expiredOrders = orderModel.findPendingOlderThan(hours);
  let closedCount = 0;

  for (const o of expiredOrders) {
    try {
      const result = closePendingOrder(o.id);
      if (result.success) closedCount++;
    } catch (err: any) {
      console.error(`[自动关闭] 订单 ${o.order_no} 关闭失败:`, err.message);
    }
  }

  if (closedCount > 0) {
    console.log(`[自动关闭] 共扫描 ${expiredOrders.length} 个超时订单，已自动关闭 ${closedCount} 个`);
  }
  return closedCount;
}


