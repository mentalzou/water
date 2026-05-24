import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { customerApi } from '../../api/customer.api';

export default function PasswordPage() {
  const navigate = useNavigate();
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPwd.length < 6) { setMsg({ type: 'error', text: '新密码至少6位' }); return; }
    if (newPwd !== confirmPwd) { setMsg({ type: 'error', text: '两次输入的密码不一致' }); return; }

    setLoading(true);
    try {
      const res: any = await customerApi.changePassword(oldPwd, newPwd);
      if (res.code === 200) {
        setMsg({ type: 'success', text: res.message || '密码修改成功' });
        setOldPwd(''); setNewPwd(''); setConfirmPwd('');
      } else {
        setMsg({ type: 'error', text: res.message || '修改失败' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/profile')} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">修改密码</h1>
        </div>
      </header>

      <main className="px-4 py-6 pb-8">
        <form onSubmit={handleSubmit} className="max-w-sm mx-auto">
          <div className="space-y-4">
            <div className="relative">
              <input type={showOld ? 'text' : 'password'} value={oldPwd} onChange={e => setOldPwd(e.target.value)}
                placeholder="当前密码" required autoFocus
                className="w-full px-4 py-3 pr-11 bg-white rounded-xl border border-gray-200 outline-none focus:border-water transition-colors" />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="新密码（至少6位）" required
                className="w-full px-4 py-3 pr-11 bg-white rounded-xl border border-gray-200 outline-none focus:border-water transition-colors" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              placeholder="确认新密码" required
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 outline-none focus:border-water transition-colors" />

            {msg && (
              <div className={`rounded-xl px-4 py-3 text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                {msg.text}
              </div>
            )}

            <button disabled={loading} type="submit"
              className="w-full bg-gradient-to-r from-water-light to-water text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-water/20 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />处理中...</> : '确认修改'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
