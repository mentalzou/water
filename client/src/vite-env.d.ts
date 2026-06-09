interface ImportMetaEnv {
  readonly VITE_WECHAT_APP_ID: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ΢�� JS-SDK ȫ����������
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