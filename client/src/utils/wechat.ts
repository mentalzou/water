/**
 * 微信环境检测 & OAuth 工具函数
 */

/** 获取微信 AppID */
export function getWechatAppId(): string {
  return import.meta.env.VITE_WECHAT_APP_ID || '';
}

/** 是否在微信环境中 */
export function isWechat(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('micromessenger');
}

/** 是否在小程序 web-view 中 */
export function isMiniProgram(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('miniprogram') ||
    // 小程序 web-view 中 window.__wxjs_environment === 'miniprogram'
    (typeof (window as any).__wxjs_environment !== 'undefined' &&
      (window as any).__wxjs_environment === 'miniprogram');
}

/** 从 localStorage 获取已存储的 openId（自动过滤 dev_ 模拟值） */
export function getStoredOpenId(): string {
  try {
    const user = JSON.parse(localStorage.getItem('customer_user') || '{}');
    const raw = user.open_id || user.openId || '';
    // 开发环境遗留的 mock openId，视为无效，触发重新 OAuth
    if (raw && raw.startsWith('dev_')) {
      console.log('[OAuth] 检测到旧的 dev_ 模拟 openId，已清除:', raw);
      clearStoredOpenId();
      return '';
    }
    return raw;
  } catch {
    return '';
  }
}

/** 将 openId 存储到 localStorage 的 customer_user 中 */
export function setStoredOpenId(openId: string): void {
  try {
    const user = JSON.parse(localStorage.getItem('customer_user') || '{}');
    user.open_id = openId;
    user.openId = openId;
    localStorage.setItem('customer_user', JSON.stringify(user));
  } catch {
    // ignore
  }
}

/** 清除 localStorage 中的 openId */
export function clearStoredOpenId(): void {
  try {
    const user = JSON.parse(localStorage.getItem('customer_user') || '{}');
    delete user.open_id;
    delete user.openId;
    localStorage.setItem('customer_user', JSON.stringify(user));
  } catch {
    // ignore
  }
}

/**
 * 构建微信公众号 OAuth 授权 URL
 *
 * 静默授权 scope=snsapi_base：只获取 openId，无需用户确认
 * 显式授权 scope=snsapi_userinfo：获取用户昵称头像等，需要用户确认
 *
 * @param appId      微信公众号 AppID
 * @param redirectUri 回调地址（后端接收 code 的页面 URL）
 * @param state       防 CSRF 的随机字符串（顺便携带原始路由路径）
 * @returns 完整的微信 OAuth 跳转 URL
 */
export function buildOAuthUrl(
  appId: string,
  redirectUri: string,
  state: string,
  scope: 'snsapi_base' | 'snsapi_userinfo' = 'snsapi_base',
): string {
  const encodedRedirect = encodeURIComponent(redirectUri);
  return `https://open.weixin.qq.com/connect/oauth2/authorize` +
    `?appid=${appId}` +
    `&redirect_uri=${encodedRedirect}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&state=${encodeURIComponent(state)}#wechat_redirect`;
}

/**
 * 生成 OAuth state 参数
 * 格式: base64url(随机数).原始路径
 */
export function generateOAuthState(currentPath: string): string {
  const random = Math.random().toString(36).substring(2, 15);
  // 用 | 分隔随机数和原始路径
  return `${random}|${currentPath}`;
}

/**
 * 解析 OAuth state 参数，提取原始路径
 */
export function parseOAuthState(state: string): string {
  const parts = state.split('|');
  return parts[1] || '/';
}
