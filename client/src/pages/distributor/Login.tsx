import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Droplets, ArrowRight, Eye, EyeOff, Phone, UserCheck } from 'lucide-react';
import { useSiteConfig } from '../../context/SiteConfigContext';

const API_BASE = '/api';

export default function DistributorLogin() {
  const { siteName } = useSiteConfig();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !password) {
      setErrorMsg('请输入手机号和密码');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/distributors/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (data.code === 200) {
        localStorage.setItem('distributor_token', data.data.token);
        localStorage.setItem('distributor_user', JSON.stringify(data.data));
        navigate('/distributor', { replace: true });
      } else {
        setErrorMsg(data.message || '登录失败');
      }
    } catch {
      setErrorMsg('网络错误，请重试');
    }
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
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-white mx-auto mb-4 flex items-center justify-center shadow-lg">
            <Droplets className="w-8 h-8 text-water" />
          </div>
          <h1 className="text-2xl font-bold text-white">{siteName}</h1>
          <p className="text-white/70 text-sm mt-2">分销商中心登录</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="请输入手机号"
              autoComplete="tel"
              className="w-full pl-12 pr-4 py-3.5 bg-white rounded-xl text-gray-800 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-lg"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
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
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />验证中...</span>
            ) : (<>登录分销商中心 <ArrowRight className="w-4 h-4" /></>)}
          </button>

          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-white/20" />
            <span className="text-white/50 text-xs flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" />分销商专属</span>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          <button type="button" onClick={() => navigate('/admin/login')}
            className="w-full py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            管理后台入口 &rarr;
          </button>
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
