import { Request, Response } from 'express';
import { success, error } from '../utils/response';
import { orderModel } from '../models/order.model';

export function createPayment(req: Request, res: Response): void {
  const { orderId } = req.body;
  if (!orderId) { error(res, '请提供订单ID'); return; }
  
  const order = orderModel.findById(orderId);
  if (!order) { error(res, '订单不存在', 404); return; }
  
  // In production: call WeChat Pay API and return h5_url
  // For dev mode: simulate payment
  success(res, {
    orderId: order.id,
    orderNo: order.order_no,
    amount: order.total_amount,
    h5Url: null, // Production: WeChat H5 pay URL
    mockMode: true,
    message: '开发模式：使用 /api/orders/:id/pay 完成模拟支付',
  });
}

// WeChat payment callback endpoint
export function handleNotify(req: Request, res: Response): void {
  // In production: verify signature and process payment result
  console.log('[Payment] Received payment notify:', req.body);
  res.json({ code: 'SUCCESS', message: '成功' });
}

export function queryPayment(req: Request, res: Response): void {
  const { id } = req.params;
  const order = orderModel.findById(id);
  if (!order) { error(res, '订单不存在', 404); return; }

  success(res, {
    orderId: order.id,
    status: order.pay_status,
    transactionId: order.transaction_id,
    paidAt: order.paid_at,
  });
}
