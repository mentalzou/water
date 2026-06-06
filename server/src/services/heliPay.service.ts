import { orderModel } from '../models/order.model';
import {
  helipayConfig,
  API_ENDPOINTS,
  setMerchantKeys,
  getMerchantKeys,
} from '../config/helipay';
import {
  aesDecrypt,
  desedeEncrypt,
  desedeDecrypt,
  generateMd5Sign,
  verifyMd5Sign,
} from '../utils/crypto';
import { sendPostRequest } from '../utils/http';
import type { Order } from '../types';

export interface WxPayResult {
  payData: any;
  orderNo: string;
  transactionId?: string;
  orderId: string;
}

/**
 * 检查支付配置是否有效
 */
function validateConfig(): void {
  const placeholders = ['你的授权码', '你的AES密钥', '你的商户编号', '你的微信小程序AppID'];
  const errors: string[] = [];
  console.log('HELIPAY_BASE_URL:', helipayConfig.baseUrl);
  if (!helipayConfig.authCode || placeholders.some(p => helipayConfig.authCode.includes(p))) {
    errors.push('HELIPAY_AUTH_CODE 未配置（.env 文件中仍是占位符）');
  }

  console.log('HELIPAY_AES_KEY:', helipayConfig.aesKey);
  if (!helipayConfig.aesKey || placeholders.some(p => helipayConfig.aesKey.includes(p))) {
    errors.push('HELIPAY_AES_KEY 未配置（.env 文件中仍是占位符）');
  }
  if (!helipayConfig.merchantNo || placeholders.some(p => helipayConfig.merchantNo.includes(p))) {
    errors.push('HELIPAY_MERCHANT_NO 未配置（.env 文件中仍是占位符）');
  }
  if (!helipayConfig.appId || placeholders.some(p => helipayConfig.appId.includes(p))) {
    errors.push('WECHAT_APP_ID 未配置（.env 文件中仍是占位符）');
  }
  
  if (errors.length > 0) {
    throw new Error(`合利宝支付配置无效，请检查 server/.env 文件:\n${errors.join('\n')}`);
  }
}

/**
 * 步骤1：生成终端
 */
async function generateTerminal(): Promise<string> {
  const requestBody = JSON.stringify({
    merchantNo: helipayConfig.merchantNo,
  });

  console.log('生成终端请求参数:', requestBody);

  const fullUrl = `${helipayConfig.baseUrl.replace(/\/+$/, '')}${API_ENDPOINTS.terminalGenerate}`;
  console.log('生成终端请求URL:', fullUrl);
  console.log('helipayConfig.authCode :', helipayConfig.authCode);
  const response = await sendPostRequest(fullUrl, requestBody, helipayConfig.authCode);

  console.log('生成终端响应:', JSON.stringify(response));

  if (response.responseCode === '0000') {
    // snNo 可能在顶层或 data 下，做兼容
    const snNo = (response as any).snNo || (response as any).sn || response.data?.snNo || response.data?.sn;
    console.log('终端序列号:', snNo);
    return snNo;
  } else {
    throw new Error(`终端生成失败: ${response.responseMessage}`);
  }
}

/**
 * 步骤2：获取密钥
 */
async function requestKeys(snNo: string): Promise<void> {
  const requestBody = JSON.stringify({
    snNo,
  });

  console.log('获取密钥请求参数:', requestBody);

  const fullUrl = `${helipayConfig.baseUrl.replace(/\/+$/, '')}${API_ENDPOINTS.keyRequest}`;
  const response = await sendPostRequest(fullUrl, requestBody, helipayConfig.authCode);

  console.log('获取密钥响应:', JSON.stringify(response));

  if (response.responseCode !== '0000') {
    throw new Error(`密钥获取失败: ${response.responseMessage}`);
  }

  // 解密密钥（secretKey/signKey 在响应顶层，不在 data 下）
  const encryptedSecretKey = (response as any).secretKey;
  const encryptedSignKey = (response as any).signKey;

  if (!encryptedSecretKey || !encryptedSignKey) {
    throw new Error('密钥数据缺失');
  }

  const secretKey = aesDecrypt(encryptedSecretKey, helipayConfig.aesKey);
  const signKey = aesDecrypt(encryptedSignKey, helipayConfig.aesKey);

  console.log('解密后的SECRET_KEY:', secretKey);
  console.log('解密后的SIGN_KEY:', signKey);

  setMerchantKeys({
    snNo,
    secretKey,
    signKey,
    updatedAt: Date.now(),
  });
}

/**
 * 初始化支付（获取终端和密钥）
 */
async function initPayment(): Promise<void> {
  // 先验证配置
  validateConfig();
  
  const keys = getMerchantKeys();

  // 如果密钥不存在或超过24小时，重新获取
  if (!keys || Date.now() - keys.updatedAt > 24 * 60 * 60 * 1000) {
    console.log('初始化支付配置...');
    const snNo = await generateTerminal();
    await requestKeys(snNo);
  }
}

/**
 * 创建JSAPI支付订单
 */
export async function createJsApiOrder(
    orderId: string,
    orderNo: string,
    totalAmount: number,
    description: string,
    openId: string,
    orderIp: string
): Promise<WxPayResult> {
  try {
    // 初始化支付配置
    await initPayment();

    const keys = getMerchantKeys();
    if (!keys) {
      throw new Error('支付密钥未初始化');
    }

    // 构建支付请求参数（JSAPI原生支付）
    const params: Record<string, any> = {
      snNo: keys.snNo,
      merchantNo: helipayConfig.merchantNo,
      orderNo: orderNo || `WD${Date.now()}`,
      appPayType: 'WXPAY',
      orderAmount: totalAmount.toFixed(2),
      openId,
      payRemarks: description || '好水到家订单',
      orderIp,
    };

    console.log('支付请求参数:', JSON.stringify(params));

    // 构建加密请求
    const requestBody = buildEncryptedRequest(params, keys.secretKey, keys.signKey, keys.snNo);
    console.log('加密请求体:', JSON.stringify(requestBody));

    // 发送请求（JSAPI原生支付）
    const fullUrl = `${helipayConfig.baseUrl.replace(/\/+$/, '')}${API_ENDPOINTS.orderJsapi}`;
    const response = await sendPostRequest(
        fullUrl,
        JSON.stringify(requestBody),
        helipayConfig.authCode
    );

    console.log('支付原始响应:', JSON.stringify(response));

    // 处理加密响应
    const processedResponse = processEncryptedResponse(response, keys.secretKey, keys.signKey);

    console.log('支付解密响应:', JSON.stringify(processedResponse));

    if (processedResponse.responseCode !== '0000') {
      throw new Error(`支付请求失败: ${processedResponse.responseMessage}`);
    }

    // JSAPI返回的data中包含payData（用于WeixinJSBridge拉起支付）
    const payDataStr = processedResponse.payData;
    if (!payDataStr) {
      throw new Error('支付响应缺少payData');
    }
    const payData = typeof payDataStr === 'string' ? JSON.parse(payDataStr) : payDataStr;
    console.log('payData:', JSON.stringify(payData));

    return {
      payData,
      orderNo: processedResponse.orderNo || orderNo,
      transactionId: processedResponse.transactionId,
      orderId,
    };
  } catch (error: any) {
    console.error('创建支付订单失败:', error);
    throw new Error(`创建支付订单失败: ${error.message}`);
  }
}

/**
 * 构建加密的请求体
 */
function buildEncryptedRequest(
    params: Record<string, any>,
    secretKey: string,
    signKey: string,
    snNo: string
): Record<string, any> {
  // 转换为JSON字符串
  const jsonBody = JSON.stringify(params);
  console.log('请求参数JSON:', jsonBody);

  // 3DES加密请求体
  const encryptedBody = desedeEncrypt(jsonBody, secretKey);
  console.log('3DES加密结果:', encryptedBody);

  // 生成MD5签名
  const sign = generateMd5Sign(encryptedBody, signKey);
  console.log('MD5签名:', sign);

  // 构建请求体
  return {
    body: encryptedBody,
    sign,
    encryptionType: 'AES',
    sn: snNo,
  };
}

/**
 * 处理加密的响应
 */
function processEncryptedResponse(
    response: any,
    secretKey: string,
    signKey: string
): any {
  console.log('=== 开始处理响应 ===');

  if (!response) {
    throw new Error('响应内容为空');
  }

  // 获取sign
  const receivedSign = response.sign;

  // 如果没有sign，直接返回响应
  if (!receivedSign) {
    console.log('响应参数中没有sign，直接返回原始响应');
    return response;
  }

  // 获取加密的内容
  const receivedEncodeContent = response.body;

  // 验证签名
  if (!verifyMd5Sign(receivedEncodeContent, signKey, receivedSign)) {
    throw new Error('签名验证失败');
  }

  // 解密内容
  const decryptedContent = desedeDecrypt(receivedEncodeContent, secretKey);
  console.log('解密后的内容:', decryptedContent);

  // 解析解密后的内容
  const decryptedJson = JSON.parse(decryptedContent);

  // 合并外层响应
  return {
    responseCode: response.responseCode,
    responseMessage: response.responseMessage,
    ...decryptedJson,
  };
}

/**
 * 处理支付回调通知
 */
export function processPaymentNotify(
    body: string,
    sign: string
): boolean {
  const keys = getMerchantKeys();
  if (!keys) {
    console.error('支付密钥未初始化');
    return false;
  }

  try {
    // 验证签名
    if (!verifyMd5Sign(body, keys.signKey, sign)) {
      console.error('支付回调签名验证失败');
      return false;
    }

    // 解密内容
    const decryptedContent = desedeDecrypt(body, keys.secretKey);
    console.log('支付回调解密内容:', decryptedContent);

    const notifyData = JSON.parse(decryptedContent);

    // 更新订单状态
    if (notifyData.orderNo && notifyData.responseCode === '0000') {
      console.log('支付成功，订单号:', notifyData.orderNo);
      // 这里可以根据orderNo更新订单状态
      // 实际项目中需要实现订单状态更新逻辑
    }

    return true;
  } catch (error: any) {
    console.error('处理支付回调失败:', error);
    return false;
  }
}
