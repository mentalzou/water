import { Request, Response } from 'express';
import { success, error } from '../utils/response';
import { orderModel } from '../models/order.model';
import { userRechargeModel } from '../models/userRecharge.model';
import { rechargePackageModel } from '../models/rechargePackage.model';
import { balanceTransactionModel } from '../models/balanceTransaction.model';
import { createJsApiOrder, processPaymentNotify } from '../services/heliPay.service';
import { processPaymentSuccess } from '../services/order.service';
import { desedeDecrypt, verifyMd5Sign } from '../utils/crypto';
import { getMerchantKeys } from '../config/helipay';

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
 * 支付回调通知（统一处理订单支付和充值支付）
 */
export async function paymentNotify(req: Request, res: Response): Promise<void> {
  try {
    const { body, sign } = req.body;

    if (!body || !sign) {
      res.status(400).json({ code: 'FAIL', message: '参数不完整' });
      return;
    }

    const keys = getMerchantKeys();
    if (!keys) {
      console.error('支付密钥未初始化');
      res.status(500).json({ code: 'FAIL', message: '密钥未初始化' });
      return;
    }

    // 验证签名
    if (!verifyMd5Sign(body, keys.signKey, sign)) {
      console.error('支付回调签名验证失败');
      res.status(400).json({ code: 'FAIL', message: '签名验证失败' });
      return;
    }

    // 解密内容
    const decryptedContent = desedeDecrypt(body, keys.secretKey);
    console.log('支付回调解密内容:', decryptedContent);

    const notifyData = JSON.parse(decryptedContent);

    if (notifyData.responseCode === '0000') {
      const orderNo = notifyData.orderNo || '';
      const transactionId = notifyData.transactionId || notifyData.data?.transactionId || `TXN_${Date.now()}`;

      console.log('支付成功回调, orderNo:', orderNo, 'transactionId:', transactionId);

      // 判断是充值支付还是订单支付
      if (orderNo.startsWith('RECHARGE_')) {
        // 充值支付：通过 transaction_id 查找充值记录
        const allRecharges = require('../utils/db').getDb()
            .prepare("SELECT * FROM user_recharges WHERE transaction_id = ?")
            .all(orderNo) as any[];

        if (allRecharges.length > 0) {
          const rechargeRecord = allRecharges[0];

          // 幂等性检查
          if (balanceTransactionModel.hasRechargeTransaction(rechargeRecord.id)) {
            console.log('充值已入账，跳过重复处理:', rechargeRecord.id);
          } else {
            userRechargeModel.markPaid(rechargeRecord.id, transactionId);

            // 记录流水：本金
            balanceTransactionModel.create({
              user_id: rechargeRecord.user_id,
              recharge_id: rechargeRecord.id,
              tx_type: 'recharge_principal',
              amount: rechargeRecord.amount,
              principal_after: rechargeRecord.remaining_balance,
              bonus_after: rechargeRecord.bonus_balance,
              description: `充值本金到账（微信支付） - ¥${rechargeRecord.amount.toFixed(2)}`,
              operator_ip: (req as any).ip || '',
            });

            // 记录流水：赠送金
            if (rechargeRecord.bonus_amount > 0) {
              balanceTransactionModel.create({
                user_id: rechargeRecord.user_id,
                recharge_id: rechargeRecord.id,
                tx_type: 'recharge_bonus',
                amount: rechargeRecord.bonus_amount,
                principal_after: rechargeRecord.remaining_balance,
                bonus_after: rechargeRecord.bonus_balance + rechargeRecord.bonus_amount,
                description: `充值赠送金到账（微信支付） - ¥${rechargeRecord.bonus_amount.toFixed(2)}`,
                operator_ip: (req as any).ip || '',
              });
            }

            console.log('充值支付成功，充值记录已更新:', rechargeRecord.id);
          }
        } else {
          console.warn('未找到对应的充值记录, orderNo:', orderNo);
        }
      } else {
        // 订单支付
        const order = orderModel.findByOrderNo(orderNo);
        if (order) {
          processPaymentSuccess(order.id, transactionId);
          console.log('订单支付成功，订单已更新:', order.id);
        } else {
          console.warn('未找到对应的订单, orderNo:', orderNo);
        }
      }

      res.status(200).json({ code: 'SUCCESS', message: '处理成功' });
    } else {
      console.warn('支付回调失败:', notifyData.responseMessage);
      res.status(400).json({ code: 'FAIL', message: notifyData.responseMessage || '支付失败' });
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
