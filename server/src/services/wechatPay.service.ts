// WeChat Pay H5 Service - Simplified implementation
// In production, this would integrate with the actual WeChat Pay API v3

import crypto from 'crypto';

interface WxPayConfig {
  appId: string;
  mchId: string;
  apiKey: string;
  notifyUrl: string;
}

function getWxPayConfig(): WxPayConfig {
  const db = require('../utils/db').getDb();
  const appId = (db.prepare("SELECT value FROM system_config WHERE key = 'wx_app_id'").get() as { value: string })?.value || '';
  const mchId = (db.prepare("SELECT value FROM system_config WHERE key = 'wx_mch_id'").get() as { value: string })?.value || '';
  const apiKey = (db.prepare("SELECT value FROM system_config WHERE key = 'wx_api_key'").get() as { value: string })?.value || '';
  return {
    appId,
    mchId,
    apiKey,
    notifyUrl: process.env.WX_NOTIFY_URL || 'https://yourdomain.com/api/payment/notify',
  };
}

export function createH5Order(orderNo: string, totalAmount: number, description: string): string {
  // In production, this calls the WeChat Unified Order API
  // For now, return a mock URL for development
  console.log(`[WeChatPay] Creating H5 order: ${orderNo}, amount: ${totalAmount}`);
  
  // Mock h5_url - in production this comes from WeChat API response
  const mockH5Url = `weixinpay://pay?order_no=${orderNo}&amount=${totalAmount}`;
  return mockH5Url;
}

export function verifyNotify(body: string, signature: string, nonce: string, timestamp: string): boolean {
  const config = getWxPayConfig();
  // In production: verify using WeChat Pay V3 signature verification
  const expectedSign = crypto
    .createHash('sha256')
    .update(config.apiKey + timestamp + nonce + body)
    .digest('hex');
  
  // For dev mode, always pass
  if (process.env.NODE_ENV !== 'production') {
    console.log('[WeChatPay] Dev mode: skipping signature verification');
    return true;
  }
  
  return expectedSign === signature;
}
