import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Droplets, ArrowRight, Eye, EyeOff, Phone, UserPlus } from 'lucide-react';
import api from '../../api/client';
import { customerApi } from '../../api/customer.api';
import { useAppStore } from '../../stores/store';
import { useSiteConfig } from '../../context/SiteConfigContext';
import {
  isWechat,
  getWechatAppId,
  getStoredOpenId,
  setStoredOpenId,
  buildOAuthUrl,
  generateOAuthState,
} from '../../utils/wechat';

const WECHAT_LOGIN_KEY = 'wechat_login_pending';

export default function CustomerLogin() {
  const { siteName } = useSiteConfig();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submitting = useRef(false);
  const { distributorCode } = useAppStore();
  const oauthProcessed = useRef(false);
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inWechat = isWechat();

  // ---- 微信 OAuth 回调处理 ----
  useEffect(() => {
    if (!inWechat || oauthProcessed.current) return;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const isPending = sessionStorage.getItem(WECHAT_LOGIN_KEY);

    // 关键：立即同步清除 URL 中的 code/state，防止页面刷新导致 code 被重复使用（40029）
    if ((code || isPending) && (window.location.search.includes('code=') || window.location.search.includes('state='))) {
      const cleanSearch = window.location.search
        .replace(/[?&]code=[^&]*/, '')
        .replace(/[?&]state=[^&]*/, '')
        .replace(/^&/, '?') // 如果第一个参数被去掉，& 换成 ?
        .replace(/^\?&/, '?');
      const cleanUrl = window.location.pathname + cleanSearch;
      window.history.replaceState(null, '', cleanUrl);
    }

    // 场景1: 已有本地 openId + 登录标记 → 直接调用微信登录接口
    if (isPending) {
      const storedOpenId = getStoredOpenId();
      if (storedOpenId) {
        oauthProcessed.current = true;
        sessionStorage.removeItem(WECHAT_LOGIN_KEY);
        doWechatLogin(storedOpenId);
        return;
      }
    }

    // 场景2: 微信 OAuth 回调带回 code → 换取 openId 再登录
    if (code && isPending) {
      oauthProcessed.current = true;
      sessionStorage.removeItem(WECHAT_LOGIN_KEY);
      setWechatLoading(true);

      customerApi
        .getWechatOpenId(code, 'oa')
        .then((res: any) => {
          if (res.code === 200 && (res.data?.openid || res.data?.open_id)) {
            const openId = res.data.openid || res.data.open_id;
            setStoredOpenId(openId);
            doWechatLogin(openId);
          } else {
            setWechatLoading(false);
            setErrorMsg('微信授权失败，请重试');
          }
        })
        .catch((err) => {
          setWechatLoading(false);
          setErrorMsg(err.message || '微信授权失败，请重试');
        });
      return;
    }

    // 场景3: 只有 isPending 但还没拿到 openId/code → 清理标记，避免卡住
    if (isPending && !code) {
      sessionStorage.removeItem(WECHAT_LOGIN_KEY);
    }
  }, []);

  // ---- 微信一键登录核心 ----
  async function doWechatLogin(openId: string) {
    setWechatLoading(true);
    setErrorMsg('');
    try {
      const res: any = await customerApi.wechatLogin(openId, distributorCode || undefined);
      if (res.code === 200) {
        localStorage.setItem('customer_token', res.data.token);
        localStorage.setItem('customer_user', JSON.stringify(res.data));
        const from = searchParams.get('from') || '/';
        navigate(from, { replace: true });
        return;
      }
      setErrorMsg(res.message || '微信登录失败');
    } catch (err: any) {
      setErrorMsg(err.message || '微信登录失败，请重试');
    }
    setWechatLoading(false);
  }

  // ---- 微信一键登录按钮点击 ----
  function handleWechatLogin() {
    setErrorMsg('');
    const appId = getWechatAppId();
    if (!appId) {
      setErrorMsg('微信登录未配置，请联系管理员');
      return;
    }

    // 标记正在进行微信登录流程
    sessionStorage.setItem(WECHAT_LOGIN_KEY, '1');

    const redirectUri = window.location.href.split('?')[0];
    const currentPath = window.location.pathname + window.location.search;
    const state = generateOAuthState(currentPath);

    window.location.href = buildOAuthUrl(appId, redirectUri, state, 'snsapi_base');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;   // 防重复提交
    setErrorMsg('');

    if (!phone || !password) {
      setErrorMsg('请输入手机号和密码');
      return;
    }
    if (isRegister && password.length < 6) {
      setErrorMsg('密码至少6位');
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {
      const url = isRegister ? '/customers/register' : '/customers/login';
      const body: any = { phone, password };
      if (isRegister && name) body.name = name;
      if (isRegister && distributorCode) body.distributor_code = distributorCode;

      const res: any = await api.post(url, body);
      if (res.code === 200) {
        localStorage.setItem('customer_token', res.data.token);
        localStorage.setItem('customer_user', JSON.stringify(res.data));
        // 跳回来源页或首页
        const from = searchParams.get('from') || '/';
        navigate(from, { replace: true });
        return;  // 不执行 setLoading(false)，避免已卸载组件状态更新
      }
      setErrorMsg(res.message || (isRegister ? '注册失败' : '登录失败'));
    } catch (err: any) {
      setErrorMsg(err.message || '网络错误，请重试');
    }
    submitting.current = false;
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-water-light/90 via-teal-500 to-cyan-600 flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white mx-auto mb-4 flex items-center justify-center shadow-lg">
            <Droplets className="w-8 h-8 text-water" />
          </div>
          <h1 className="text-2xl font-bold text-white">{siteName}</h1>
          <p className="text-white/70 text-sm mt-1">{isRegister ? '注册新账户' : '欢迎回来'}</p>
        </div>

        {/* WeChat One-Click Login Button */}
        {inWechat && !isRegister && (
          <div className="mb-5">
            <button
              type="button"
              onClick={handleWechatLogin}
              disabled={wechatLoading}
              className="w-full bg-[#07C160] hover:bg-[#06AD56] py-3.5 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {wechatLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  微信登录中...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.026 2.098c-3.554 0-6.428 2.503-6.428 5.585 0 3.082 2.874 5.586 6.428 5.586.522 0 1.034-.066 1.535-.184a.675.675 0 0 1 .56.084l1.484.871a.23.23 0 0 0 .13.042.227.227 0 0 0 .226-.23c0-.055-.023-.11-.039-.165l-.305-1.16a.455.455 0 0 1 .166-.518C20.046 18.95 21 17.41 21 15.672c0-3.083-2.875-5.585-6.376-5.585zm-2.314 2.587a.87.87 0 0 1 .869.877.87.87 0 0 1-.869.878.872.872 0 0 1-.87-.878.87.87 0 0 1 .87-.877zm4.502 0a.87.87 0 0 1 .87.877.87.87 0 0 1-.87.878.872.872 0 0 1-.87-.878.87.87 0 0 1 .87-.877z"/>
                  </svg>
                  微信一键登录
                </>
              )}
            </button>

            <div className="flex items-center gap-3 mt-4 mb-1">
              <div className="h-px flex-1 bg-white/20" />
              <span className="text-white/50 text-xs">其他登录方式</span>
              <div className="h-px flex-1 bg-white/20" />
            </div>
          </div>
        )}

        {/* 微信登录加载中遮罩 */}
        {wechatLoading && (
          <div className="mb-5 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white/80 text-sm text-center">
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 align-middle" />
            正在通过微信授权登录，请稍候...
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name field only for register */}
          {isRegister && (
            <div className="relative">
              <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="您的姓名（选填）"
                className="w-full pl-12 pr-4 py-3.5 bg-white rounded-xl text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-lg"
              />
            </div>
          )}

          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="请输入手机号"
              maxLength={11}
              className="w-full pl-12 pr-4 py-3.5 bg-white rounded-xl text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-lg"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码（至少6位）"
              autoFocus
              className="w-full pl-12 pr-12 py-3.5 bg-white rounded-xl text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-lg"
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {errorMsg && (
            <div className="bg-red-500/20 border border-red-300/40 rounded-xl px-4 py-3 text-red-100 text-sm">{errorMsg}</div>
          )}

          <button disabled={loading} type="submit"
            className="w-full bg-gradient-to-r from-teal-400 to-cyan-500 py-3.5 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />处理中...</span>
            ) : (
              <>{isRegister ? '立即注册' : '登录'} <ArrowRight className="w-4 h-4" /></>
            )}
          </button>

          {/* Toggle login/register */}
          <div className="text-center pt-2">
            <span className="text-white/60 text-sm">
              {isRegister ? '已有账户？' : '还没有账户？'}
            </span>
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setErrorMsg(''); }}
              className="text-white font-medium text-sm ml-1 hover:underline"
            >
              {isRegister ? '去登录' : '立即注册'}
            </button>
          </div>
        </form>

        {/* 备案信息 */}
        <div className="text-center mt-10 pb-2">
          <p className="text-xs text-white/50">&copy;{new Date().getFullYear()} {siteName}</p>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer"
            className="text-xs text-white/50 hover:text-white/70 transition-colors"
          >闽ICP备2026019411号-1</a>
        </div>
      </div>
    </div>
  );
}
