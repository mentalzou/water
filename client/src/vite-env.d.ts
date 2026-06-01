/// <reference types="vite/client" />
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