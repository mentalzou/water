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
    orderRefund: '/trx/brand/order/refund',
    orderRefundQuery: '/trx/brand/order/refundQuery',
};

/** 终端信息（生成终端接口返回） */
export interface TerminalInfo {
    snNo: string;
    userName: string;
    merchantNo: string;
    merchantName: string;
}

/** 终端通信密钥（获取密钥接口返回并解密后） */
export interface MerchantKeys {
    snNo: string;
    secretKey: string;
    signKey: string;
    updatedAt: number;
}

/** 完整的终端配置（终端信息 + 通信密钥） */
export interface TerminalConfig {
    terminal: TerminalInfo;
    keys: MerchantKeys;
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

/**
 * 从数据库 system_config 加载持久化的终端配置
 * 返回 null 表示无持久化数据，需要重新获取
 */
export function loadTerminalConfig(): TerminalConfig | null {
    try {
        const { getDb } = require('../utils/db');
        const db = getDb();
        const row = db.prepare(
            "SELECT value FROM system_config WHERE key = 'helipay_terminal' AND group_key = 'helipay'"
        ).get() as { value: string } | undefined;

        if (!row || !row.value) {
            console.log('[Helipay] 数据库无终端配置缓存');
            return null;
        }

        const config: TerminalConfig = JSON.parse(row.value);

        // 校验关键字段
        if (!config.terminal?.snNo || !config.keys?.secretKey || !config.keys?.signKey) {
            console.log('[Helipay] 终端配置不完整（snNo/secretKey/signKey 缺失），将重新获取');
            return null;
        }

        console.log('[Helipay] 从数据库加载终端配置成功, snNo:', config.terminal.snNo);
        // 同时更新内存缓存
        merchantKeys = config.keys;
        return config;
    } catch (e: any) {
        console.error('[Helipay] 加载终端配置失败:', e.message);
        return null;
    }
}

/**
 * 将终端配置持久化到数据库 system_config
 */
export function saveTerminalConfig(config: TerminalConfig): void {
    try {
        const { getDb } = require('../utils/db');
        const db = getDb();
        const json = JSON.stringify(config);

        db.prepare(
            "INSERT OR REPLACE INTO system_config (key, value, type, description, group_key) VALUES (?, ?, 'json', ?, 'helipay')"
        ).run('helipay_terminal', json, '合利宝终端信息及通信密钥缓存');

        console.log('[Helipay] 终端配置已持久化到数据库, snNo:', config.terminal.snNo);
    } catch (e: any) {
        console.error('[Helipay] 保存终端配置失败:', e.message);
    }
}

/**
 * 清除持久化的终端配置（终端失效时调用）
 */
export function clearTerminalConfig(): void {
    try {
        const { getDb } = require('../utils/db');
        const db = getDb();
        db.prepare(
            "DELETE FROM system_config WHERE key = 'helipay_terminal' AND group_key = 'helipay'"
        ).run();
        console.log('[Helipay] 已清除数据库终端配置缓存');
    } catch (e: any) {
        console.error('[Helipay] 清除终端配置失败:', e.message);
    }
    clearMerchantKeys();
}