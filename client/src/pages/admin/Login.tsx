import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Droplets, ArrowRight, Eye, EyeOff, Phone } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('13800000000');
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
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (data.code === 200) {
        localStorage.setItem('admin_token', data.data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.data));
        navigate('/admin', { replace: true });
      } else {
        setErrorMsg(data.message || '登录失败');
      }
    } catch {
      setErrorMsg('网络错误，请重试');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-500/5 rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Droplets className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">好水到家</h1>
          <p className="text-gray-400 text-sm mt-2">管理后台登录</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="请输入管理员手机号"
              className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoFocus
              className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{errorMsg}</div>
          )}

          <button disabled={loading} type="submit"
            className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 py-3.5 rounded-xl font-semibold text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? '验证中...' : <>登录管理后台 <ArrowRight className="w-4 h-4" /></>}
          </button>

          <p className="text-center text-xs text-gray-600 mt-4">默认账号：13800000000 / admin123456</p>
        </form>
      </div>
    </div>
  );
}
