import { Request, Response } from 'express';
import { success, error } from '../utils/response';
import { orderModel } from '../models/order.model';
import { createJsApiOrder, processPaymentNotify } from '../services/heliPay.service';
import { processPaymentSuccess } from '../services/order.service';
import { getSiteName } from '../utils/siteName';

/**
 * 创建支付订单（JSAPI）
 */
export async function createPayment(req: Request, res: Response): Promise<void> {
  try {
    const { orderId, openId } = req.body;

    if (!orderId) {
      error(res, '订单ID不能为空');
      return;
    }

    if (!openId) {
      error(res, '微信OpenID不能为空');
      return;
    }

    // 查询订单
    const order = orderModel.findById(orderId);
    if (!order) {
      error(res, '订单不存在', 404);
      return;
    }

    // 检查订单状态
    if (order.pay_status === 'paid') {
      error(res, '订单已支付');
      return;
    }

    console.log('创建支付订单:', {
      orderId: order.id,
      orderNo: order.order_no,
      amount: order.total_amount,
      openId,
    });

    // 调用支付服务
    const siteName = getSiteName();
    const payResult = await createJsApiOrder(
        order.id,
        order.order_no,
        order.total_amount,
        `${siteName}订单-${order.order_no}`,
        openId
    );

    success(res, payResult, '支付订单创建成功');
  } catch (err: any) {
    console.error('创建支付订单失败:', err);
    error(res, err.message || '创建支付订单失败');
  }
}

/**
 * 支付回调通知
 */
export async function paymentNotify(req: Request, res: Response): Promise<void> {
  try {
    const { body, sign } = req.body;

    if (!body || !sign) {
      res.status(400).json({ code: 'FAIL', message: '参数不完整' });
      return;
    }

    // 处理支付回调
    const success = processPaymentNotify(body, sign);

    if (success) {
      // 解析回调数据获取订单信息
      const decryptedContent = JSON.parse(
          require('../services/wechatPay.service').processPaymentNotify.toString()
      );

      // TODO: 根据实际回调数据结构更新订单状态
      // const order = orderModel.findByOrderNo(orderNo);
      // if (order) {
      //   processPaymentSuccess(order.id, transactionId);
      // }

      res.status(200).json({ code: 'SUCCESS', message: '处理成功' });
    } else {
      res.status(400).json({ code: 'FAIL', message: '签名验证失败' });
    }
  } catch (err: any) {
    console.error('支付回调处理失败:', err);
    res.status(500).json({ code: 'FAIL', message: '处理失败' });
  }
}

/**
 * 支付订单（兼容旧的mock接口）
 */
export function payForOrder(req: Request, res: Response): void {
  const id = String(req.params.id);
  const order = orderModel.findById(id);
  if (!order) { error(res, '订单不存在', 404); return; }

  // In production: call WeChat Pay API
  // For dev mode: simulate payment success
  const updated = processPaymentSuccess(id, `MOCK_TXN_${Date.now()}`);

  success(res, {
    ...updated,
    paymentUrl: null,
    mockMode: true,
  }, '支付成功（模拟模式）');
}