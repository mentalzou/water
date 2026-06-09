/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WECHAT_APP_ID: string;
  readonly VITE_API_URL: string;
  readonly VITE_API_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 微信 JS-SDK 全局类型声明
interface WeixinJSBridgeInvokeResult {
    err_msg: string;
    [key: string]: any;
}

interface WeixinJSBridge {
    invoke(
        method: string,
        params: Record<string, any>,
        callback: (res: WeixinJSBridgeInvokeResult) => void
    ): void;
    on(event: string, callback: Function): void;
    call(method: string, params?: any): void;
}

declare const WeixinJSBridge: WeixinJSBridge;

// qrcode 模块类型声明
declare module 'qrcode';