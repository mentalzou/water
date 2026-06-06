export interface Helipay {
    baseUrl: string;
    authCode: string;
    aesKey: string;
    merchantNo: string;
    appId: string;
    notifyUrl: string;
    nofiyAesKey: string;
    publicKey: string;
}

export const helipayConfig: Helipay = {
    baseUrl: process.env.HELIPAY_BASE_URL || 'https://wechat-applet-test.helipay.com',
    authCode: process.env.HELIPAY_AUTH_CODE || '',
    aesKey: process.env.HELIPAY_AES_KEY || '',
    merchantNo: process.env.HELIPAY_MERCHANT_NO || '',
    appId: process.env.WECHAT_APP_ID || '',
    notifyUrl: process.env.HELIPAY_NOTIFY_URL || 'http://yjhmall.com/api/payment/notify',
    nofiyAesKey: process.env.HELIPAY_NOTIFY_AES_KEY || '',
    publicKey: process.env.HELIPAY_NOTIFY_PUBLIC_KEY || '',
};

// API端点
export const API_ENDPOINTS = {
    terminalGenerate: '/trx/brand/terminal/generate',
    keyRequest: '/trx/brand/key/get',
    orderSubmit: '/trx/brand/order/passive',
    orderJsapi: '/trx/brand/order/jsapi',
    orderQuery: '/trx/brand/order/query',
};

// 密钥存储（实际项目中应该使用Redis或数据库）
export interface MerchantKeys {
    snNo: string;
    secretKey: string;
    signKey: string;
    updatedAt: number;
}

let merchantKeys: MerchantKeys | null = null;

export function setMerchantKeys(keys: MerchantKeys) {
    merchantKeys = keys;
}

export function getMerchantKeys(): MerchantKeys | null {
    return merchantKeys;
}

export function clearMerchantKeys() {
    merchantKeys = null;
}