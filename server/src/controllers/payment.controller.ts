import { Request, Response } from 'express';
import { success, error } from '../utils/response';
import { orderModel } from '../models/order.model';
import { userRechargeModel } from '../models/userRecharge.model';
import { rechargePackageModel } from '../models/rechargePackage.model';
import { balanceTransactionModel } from '../models/balanceTransaction.model';
import { createJsApiOrder, parsePaymentNotify } from '../services/heliPay.service';
import { processPaymentSuccess } from '../services/order.service';

/**
 * 从请求中获取客户端真实IP
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    if (first && first !== '::1') return first;
  }
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  return ip === '::1' ? '127.0.0.1' : ip;
}

/**
 * 创建支付订单（JSAPI）- 订单支付
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

    // 拒绝开发环境的模拟 openId，防止缓存残留导致合利宝报错
    if (String(openId).startsWith('dev_')) {
      console.error('[支付] 拒绝模拟 openId:', openId);
      error(res, '检测到模拟openId，请在微信中重新打开页面完成授权');
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
    const clientIp = getClientIp(req);
    const payResult = await createJsApiOrder(
        order.id,
        order.order_no,
        order.total_amount,
        `武夷屿都山水订单-${order.order_no}`,
        openId,
        clientIp
    );

    success(res, payResult, '支付订单创建成功');
  } catch (err: any) {
    console.error('创建支付订单失败:', err);
    error(res, err.message || '创建支付订单失败');
  }
}

/**
 * 创建充值支付订单（JSAPI）
 */
export async function createRechargePayment(req: Request, res: Response): Promise<void> {
  try {
    const { rechargeId, openId } = req.body;

    if (!rechargeId) {
      error(res, '充值记录ID不能为空');
      return;
    }

    if (!openId) {
      error(res, '微信OpenID不能为空');
      return;
    }

    // 拒绝开发环境的模拟 openId
    if (String(openId).startsWith('dev_')) {
      console.error('[充值支付] 拒绝模拟 openId:', openId);
      error(res, '检测到模拟openId，请在微信中重新打开页面完成授权');
      return;
    }

    // 查询充值记录
    const recharge = userRechargeModel.findById(rechargeId);
    if (!recharge) {
      error(res, '充值记录不存在', 404);
      return;
    }

    // 检查充值状态
    if (recharge.status === 'active') {
      error(res, '该充值已支付');
      return;
    }

    const pkg = rechargePackageModel.findById(recharge.package_id);
    const description = pkg ? `充值套餐-${pkg.name}` : '充值套餐';

    console.log('创建充值支付订单:', {
      rechargeId: recharge.id,
      orderNo: recharge.transaction_id,
      amount: recharge.amount,
      openId,
    });

    // 调用支付服务
    const clientIp = getClientIp(req);
    const payResult = await createJsApiOrder(
        recharge.id,
        recharge.transaction_id || `RECHARGE_${Date.now()}`,
        recharge.amount,
        description,
        openId,
        clientIp
    );

    success(res, payResult, '充值支付订单创建成功');
  } catch (err: any) {
    console.error('创建充值支付订单失败:', err);
    error(res, err.message || '创建充值支付订单失败');
  }
}

/**
 * 合利宝商户交易通知（被动接收，POST 推送）
 *
 * 报文格式：{ "data": "3DES加密数据", "agentNo": "", "sign": "RSA签名", "merchantNo": "" }
 * 解密后得到 NotifyData，包含 orderNo / orderType / orderStatus 等字段
 *
 * 业务处理：
 *   FORWARD（收单）+ SUCCESS → 订单标记为已支付
 *   REVERSE（退款）+ SUCCESS → 订单标记为已退款
 *
 * 注意：必须返回纯文本 "success"，合利宝要求在收到后停止重试（共5次）
 */
export async function paymentNotify(req: Request, res: Response): Promise<void> {
  console.log('[合利宝通知] 收到通知报文:', JSON.stringify(req.body));

  try {
    const rawBody = req.body;

    // 前置校验
    if (!rawBody || !rawBody.data || !rawBody.sign) {
      console.warn('[合利宝通知] 报文缺少 data / sign 字段');
      res.status(400).send('fail');
      return;
    }

    // 解密 + 验签
    const notifyData = parsePaymentNotify(rawBody);
    if (!notifyData) {
      console.error('[合利宝通知] 解密或验签失败，拒绝处理');
      res.status(400).send('fail');
      return;
    }

    const {
      orderNo,
      orderType,
      orderStatus,
      refundOrderNo,
      channelOrderId,
      orderAmount,
      finishDate,
    } = notifyData;

    console.log('[合利宝通知] 解析成功:', {
      orderNo,
      orderType,
      orderStatus,
      refundOrderNo,
      channelOrderId,
      orderAmount,
      finishDate,
    });

    // ========== 收单通知（正向交易） ==========
    if (orderType === 'FORWARD') {
      const order = orderModel.findByOrderNo(orderNo);

      if (!order) {
        console.warn(`[合利宝通知] FORWARD: 未找到订单 orderNo=${orderNo}，忽略`);
        res.send('success');
        return;
      }

      if (orderStatus === 'SUCCESS') {
        // 幂等：已经是 paid/refunding/refunded 状态则不再重复处理
        if (order.status === 'paid' || order.status === 'refunding' || order.status === 'refunded') {
          console.log(`[合利宝通知] FORWARD SUCCESS: 订单 ${orderNo} 已是 ${order.status} 状态，跳过`);
          res.send('success');
          return;
        }

        const txnId = channelOrderId || `HLB_${Date.now()}`;
        processPaymentSuccess(order.id, txnId);
        console.log(`[合利宝通知] ✅ 订单 ${orderNo} 已标记为已支付, channelOrderId: ${txnId}`);
        res.send('success');
        return;
      }

      if (orderStatus === 'FAILED' || orderStatus === 'CLOSE' || orderStatus === 'CANCELLED') {
        console.log(`[合利宝通知] FORWARD ${orderStatus}: 订单 ${orderNo} 交易未成功，不改状态`);
        res.send('success');
        return;
      }

      // INIT / DOING 等中间状态，不处理
      console.log(`[合利宝通知] FORWARD ${orderStatus}: 中间状态，等待后续通知`);
      res.send('success');
      return;
    }

    // ========== 退款通知（反向交易） ==========
    if (orderType === 'REVERSE') {
      // 先尝试用 orderNo 查找原订单
      let order = orderModel.findByOrderNo(orderNo);

      // 如果找不到，尝试通过 remark 中的退款订单号查找
      if (!order && refundOrderNo) {
        const db = require('../utils/db').getDb();
        const row = db.prepare(
          "SELECT * FROM orders WHERE remark LIKE ? ORDER BY updated_at DESC LIMIT 1"
        ).get(`%退款订单号:${refundOrderNo}%`) as any;
        if (row) {
          order = orderModel.findById(row.id);
          console.log(`[合利宝通知] 通过退款订单号 ${refundOrderNo} 匹配到订单 ${row.order_no}`);
        }
      }

      if (!order) {
        console.warn(`[合利宝通知] REVERSE: 未找到订单 orderNo=${orderNo}, refundOrderNo=${refundOrderNo}，忽略`);
        res.send('success');
        return;
      }

      if (orderStatus === 'SUCCESS') {
        // 幂等：已经是 refunded 则跳过
        if (order.status === 'refunded') {
          console.log(`[合利宝通知] REVERSE SUCCESS: 订单 ${order.order_no} 已是已退款状态，跳过`);
          res.send('success');
          return;
        }

        orderModel.markRefunded(order.id);
        console.log(`[合利宝通知] ✅ 订单 ${order.order_no} 退款成功，已标记为已退款`);
        res.send('success');
        return;
      }

      if (orderStatus === 'FAILED') {
        console.log(`[合利宝通知] REVERSE FAILED: 订单 ${order.order_no} 退款失败，请注意处理`);
        res.send('success');
        return;
      }

      // RECEIVE / DOING 等处理中状态
      console.log(`[合利宝通知] REVERSE ${orderStatus}: 退款处理中，等待后续通知`);
      res.send('success');
      return;
    }

    // 未知 orderType
    console.warn(`[合利宝通知] 未知 orderType: ${orderType}`);
    res.send('success');
  } catch (err: any) {
    console.error('[合利宝通知] 处理异常:', err);
    // 即使异常也返回 success，避免合利宝无意义重试
    res.send('success');
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
