import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { customerApi } from '../api/customer.api';
import {
  isWechat,
  isMiniProgram,
  getWechatAppId,
  getStoredOpenId,
  setStoredOpenId,
  buildOAuthUrl,
  generateOAuthState,
  parseOAuthState,
} from '../utils/wechat';

/**
 * 微信 OAuth 授权 Hook
 *
 * 功能：
 * 1. 在微信环境中自动检测 code / wx_code 参数并换取 openId
 * 2. 如果没有 openId 且无 code，自动跳转微信 OAuth 授权页
 * 3. OAuth 回调后恢复用户原始访问路径
 *
 * 使用：在 App 顶层组件中调用一次即可
 *   useWechatOAuth();
 */
export function useWechatOAuth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    // 防止 React StrictMode 下重复执行
    if (processed.current) return;
    processed.current = true;

    // 只在微信环境中执行
    if (!isWechat()) {
      console.log('[OAuth] 非微信环境，跳过');
      return;
    }

    // ---------- Step 1: 检查 URL 中是否有微信回调的 code ----------
    const wxCode = searchParams.get('wx_code');    // 小程序 web-view 传递
    const oaCode = searchParams.get('code');        // 公众号 OAuth 回调
    const oaState = searchParams.get('state');      // 公众号 OAuth 回调 state
    const code = wxCode || oaCode;
    const codeType = wxCode ? 'miniprogram' : 'oa';

    if (code) {
      console.log(`[OAuth] 检测到微信 ${codeType} code，正在换取 openId...`);
      customerApi
        .getWechatOpenId(code, codeType)
        .then((res: any) => {
          if (res.code === 200 && (res.data?.openid || res.data?.open_id)) {
            const openId = res.data.openid || res.data.open_id;
            console.log('[OAuth] 获取到微信 openId:', openId);
            setStoredOpenId(openId);

            // 公众号 OAuth 回调：根据 state 恢复原始访问路径
            if (codeType === 'oa' && oaState) {
              const targetPath = parseOAuthState(oaState);
              console.log('[OAuth] 恢复原始路径:', targetPath);
              // 使用 replace 导航，清除 URL 中的 code/state 参数
              navigate(targetPath, { replace: true });
            } else {
              // 小程序场景：清除 URL 中的 wx_code 参数
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('wx_code');
              const newSearch = newParams.toString();
              const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
              navigate(newUrl, { replace: true });
            }
          } else {
            console.error('[OAuth] 换取 openId 失败:', res.message);
          }
        })
        .catch((err) => {
          console.error('[OAuth] 换取 openId 异常:', err);
        });
      return;
    }

    // ---------- Step 2: 没有 code，检查是否已有 openId ----------
    const storedOpenId = getStoredOpenId();
    if (storedOpenId) {
      console.log('[OAuth] 已有 openId，无需重新授权');
      return;
    }

    // ---------- Step 3: 无 openId 且无 code，发起 OAuth 重定向 ----------
    const appId = getWechatAppId();
    if (!appId) {
      console.warn('[OAuth] VITE_WECHAT_APP_ID 未配置，无法发起微信授权');
      return;
    }

    // 当前页面完整 URL 作为回调地址
    const redirectUri = window.location.href.split('?')[0]; // 去掉已有 query 参数
    const state = generateOAuthState(window.location.pathname + window.location.search);

    const oauthUrl = buildOAuthUrl(appId, redirectUri, state);

    console.log('[OAuth] 发起微信 OAuth 重定向');
    console.log('[OAuth] 回调地址:', redirectUri);
    console.log('[OAuth] state:', state);

    // 跳转到微信 OAuth 授权页面
    window.location.href = oauthUrl;
  }, []); // 只在组件挂载时执行一次

  // 该 hook 不返回任何 UI，只是一个副作用处理器
}
