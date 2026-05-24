import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Droplets, ArrowRight, Eye, EyeOff, Phone, UserPlus } from 'lucide-react';
import api from '../../api/client';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submitting = useRef(false);
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
          <h1 className="text-2xl font-bold text-white">好水到家</h1>
          <p className="text-white/70 text-sm mt-1">{isRegister ? '注册新账户' : '欢迎回来'}</p>
        </div>

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
      </div>
    </div>
  );
}
