import { orderModel } from '../models/order.model';
import { productModel } from '../models/product.model';
import { matchDeliverymanForOrder } from './matching.service';
import { createCommissionRecord } from './commission.service';
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

  // 计算佣金（基于总金额）
  let distributorCommission = 0;
  if (data.distributor_id) {
    const { calculateCommission, getCommissionConfig } = require('./commission.service');
    const config = getCommissionConfig();
    distributorCommission = calculateCommission(totalAmount, config);
  }

  const order = orderModel.create({
    customer_phone: data.customer_phone,
    customer_name: data.customer_name,
    address: data.address,
    total_amount: totalAmount,
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
  return orderModel.updateStatus(orderId, status);
}
