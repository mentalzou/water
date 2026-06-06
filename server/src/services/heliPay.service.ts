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
  rsaVerifySign,
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
 * 小利云交易通知解密后的数据结构
 */
export interface NotifyData {
  agentNo: string;
  agentName: string;
  merchantNo: string;
  merchantName: string;
  appPayType: string;
  finishDate: string;
  orderNo: string;
  refundOrderNo?: string;
  orderAmount: number;
  realIncome: number;
  orderStatus: string;   // INIT, SUCCESS, FAILED, DOING, CLOSE, CANCELLED
  orderTradeFee: number;
  phoneNoTemp: string;
  productId: number;
  productName: string;
  snNo: string;
  tuSn: string;
  orderType: string;     // FORWARD: 收单, REVERSE: 退款
  payRemarks?: string;
  cashierFields?: Array<{ htmlText?: string; htmlValue?: string }>;
  channelOrderId: string;
  cardType?: string;
  openId?: string;
}

/**
 * 小利云通知原始报文结构
 */
export interface NotifyRawBody {
  data: string;        // DES/3DES 加密的业务数据
  agentNo: string;
  sign: string;         // RSA 签名
  merchantNo: string;
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
      total_fee: Math.round(totalAmount * 100), // 合利宝JSAPI要求：金额，单位分
      openId,
      payRemarks: description || '武夷屿都山水订单',
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
    // 响应结构: { data: { orderNum, payData, merchantNo, status }, sn, responseCode, responseMessage }
    const bizData = processedResponse.data || processedResponse;
    const payDataStr = bizData.payData;
    if (!payDataStr) {
      throw new Error('支付响应缺少payData');
    }
    const payData = typeof payDataStr === 'string' ? JSON.parse(payDataStr) : payDataStr;

    // 规范化 WeChat JSAPI 参数：timeStamp 必须是字符串，补齐 signType
    const normalizedPayData = {
      appId: payData.appId,
      timeStamp: String(payData.timeStamp),
      nonceStr: payData.nonceStr,
      package: payData.package,
      signType: payData.signType || 'MD5',
      paySign: payData.paySign,
    };
    console.log('payData:', JSON.stringify(normalizedPayData));

    return {
      payData: normalizedPayData,
      orderNo: bizData.orderNum || processedResponse.orderNo || orderNo,
      transactionId: bizData.transactionId,
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
 * 解析小利云交易通知报文（3DES解密 + RSA验签）
 * 报文格式：{ data, agentNo, sign, merchantNo }
 * - data 用 secretKey 做 3DES ECB ZeroPadding 解密
 * - sign 用 合利宝公钥 做 RSA-SHA256 验签（验原文，即解密后的 JSON 字符串）
 */
export function parsePaymentNotify(rawBody: NotifyRawBody): NotifyData | null {
  const { data, sign, merchantNo } = rawBody;

  if (!data || !sign) {
    console.error('[通知] 参数不完整');
    return null;
  }

  // 校验商户号匹配（防止非本商户的通知）
  if (merchantNo && merchantNo !== helipayConfig.merchantNo) {
    console.warn(`[通知] 商户号不匹配，期望:${helipayConfig.merchantNo}, 收到:${merchantNo}`);
    return null;
  }

  const keys = getMerchantKeys();
  if (!keys) {
    console.error('[通知] 支付密钥未初始化');
    return null;
  }

  try {
    // 1. 3DES 解密 data 字段
    console.log('[通知] 密文(data):', data.substring(0, 100) + '...');
    const decryptedJson = desedeDecrypt(data, keys.secretKey);
    console.log('[通知] 解密后内容:', decryptedJson);

    // 2. RSA-SHA256 验签（对解密后的明文JSON做验签）
    console.log('[通知] 签名(sign):', sign.substring(0, 80) + '...');
    if (!rsaVerifySign(decryptedJson, helipayConfig.publicKey, sign)) {
      console.error('[通知] RSA签名验证失败');
      return null;
    }
    console.log('[通知] RSA签名验证通过');

    // 3. 解析业务数据
    const notifyData: NotifyData = JSON.parse(decryptedJson);
    console.log('[通知] 解析完成:', {
      orderNo: notifyData.orderNo,
      orderStatus: notifyData.orderStatus,
      orderType: notifyData.orderType,
      channelOrderId: notifyData.channelOrderId,
      orderAmount: notifyData.orderAmount,
    });

    return notifyData;
  } catch (error: any) {
    console.error('[通知] 解析失败:', error);
    return null;
  }
}


