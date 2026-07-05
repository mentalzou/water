import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Users, Lock, KeyRound, Eye, EyeOff, Power, PowerOff, RotateCcw } from 'lucide-react';

const API_BASE = '/api';

function getToken(): string {
  return localStorage.getItem('admin_token') || '';
}

export default function DistributorManage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '', commission_type: 'percentage', commission_rate: '5' });
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; userId: string; name: string } | null>(null);
  const [resetNewPwd, setResetNewPwd] = useState('');
  const [showResetPwdVisible, setShowResetPwdVisible] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => { loadData(); }, [page, pageSize, search, statusFilter]);

  async function loadData() {
    try {
      const token = getToken();
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set('keyword', search);
      if (statusFilter) params.set('status', statusFilter);
      const res: any = await fetch(`${API_BASE}/admin/distributors?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      if (res.code === 200) {
        setData(res.data?.data || res.data || []);
        setTotal(res.pagination?.total || 0);
      }
      else setData([]);
    } catch {
      setData([]);
    } finally { setLoading(false); }
  }

  function handleAdd() {
    setForm({ name: '', phone: '', password: '', commission_type: 'percentage', commission_rate: '5' });
    setPhoneError('');
    setEditId(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    if (!editId && !form.password) {
      alert('请设置登录密码');
      return;
    }
    if (form.password && form.password.length < 6) {
      alert('密码长度不能少于6位');
      return;
    }
    setSubmitting(true);
    try {
      const token = getToken();
      if (editId) {
        const body: any = { name: form.name, phone: form.phone, commission_type: form.commission_type, commission_rate: Number(form.commission_rate) };
        const editRes: any = await fetch(`${API_BASE}/admin/distributors/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        }).then(r => r.json());
        if (editRes.code === 200) {
          loadData();
        } else {
          alert(editRes?.message || '保存失败');
          setSubmitting(false);
          return;
        }
      } else {
        const res: any = await fetch(`${API_BASE}/admin/distributors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: form.name, phone: form.phone, password: form.password, commission_type: form.commission_type, commission_rate: Number(form.commission_rate) }),
        }).then(r => r.json());
        if (res.code === 200) {
          setPhoneError('');
          loadData();
        } else {
          alert(res?.message || '创建失败');
          setSubmitting(false);
          return;
        }
      }
      setShowForm(false);
    } catch { /* silent */ }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除该分销商？')) return;
    try {
      const token = getToken();
      await fetch(`${API_BASE}/admin/distributors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      setData(data.filter(d => d.id !== id));
    } catch { /* silent */ }
  }

  async function toggleStatus(d: any) {
    const newStatus = d.status === 'active' ? 'inactive' : 'active';
    if (!confirm(`确认${newStatus === 'active' ? '启用' : '停用'}分销商「${d.user_name || d.name}」？`)) return;
    setTogglingId(d.id);
    try {
      const token = getToken();
      const res: any = await fetch(`${API_BASE}/admin/distributors/${d.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      }).then(r => r.json());
      if (res.code === 200) {
        setData(data.map(item => item.id === d.id ? { ...item, status: newStatus } : item));
      }
    } catch { /* silent */ }
    setTogglingId(null);
  }

  function openResetPwd(d: any) {
    setResetTarget({ id: d.id, userId: d.user_id, name: d.user_name || d.name });
    setResetNewPwd('');
    setShowResetPwd(true);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetNewPwd || resetNewPwd.length < 6) {
      alert('密码长度不能少于6位');
      return;
    }
    setResetting(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/admin/distributors/${resetTarget!.id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword: resetNewPwd }),
      });
      const res = await response.json();
      if (res.code === 200) {
        alert(`${resetTarget?.name} 的登录密码已重置`);
        setShowResetPwd(false);
      } else {
        alert(res.message || '重置失败');
      }
    } catch (err: any) {
      console.error('[重置密码]', err);
      alert(err?.message || '网络错误，请检查服务是否正常');
    }
    setResetting(false);
  }

  const totalPages = Math.ceil(total / pageSize);

  // 筛选条件变化时回到第一页
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  return (
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users className="w-7 h-7 text-water" /> 分销商管理</h1>
            <p className="text-gray-500 mt-1">管理所有分销商账号信息</p>
          </div>
          <button onClick={handleAdd} className="flex items-center gap-2 px-5 py-2.5 bg-water text-white rounded-xl hover:bg-water-dark transition-colors shadow-md shadow-water/20">
            <Plus className="w-4 h-4" /> 添加分销商
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索姓名、手机号或推荐码..."
              className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-water/30 transition-all" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-3 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 ring-water/30 text-sm text-gray-600 min-w-[120px]">
            <option value="">全部状态</option>
            <option value="active">正常</option>
            <option value="inactive">停用</option>
          </select>
          <button onClick={() => { setSearch(''); setStatusFilter(''); }}
            className="flex items-center gap-1.5 px-3 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm">
            <RotateCcw className="w-3.5 h-3.5" /> 重置
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-gray-50/80 border-b border-gray-100">
              {['推荐码', '姓名', '手机号', '返佣规则', '累计佣金', '可提现', '状态', '操作'].map(h => (
                <th key={h} className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center"><div className="w-8 h-8 border-3 border-water/30 border-t-water rounded-full animate-spin mx-auto" /></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-gray-400">暂无数据</td></tr>
              ) : data.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4"><span className="font-mono text-sm bg-water/10 px-2 py-1 rounded-lg text-water font-semibold">{d.code}</span></td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{d.user_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{d.phone}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${(d.commission_type || 'percentage') === 'percentage' ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'}`}>
                      {(d.commission_type || 'percentage') === 'percentage' ? `${d.commission_rate ?? 5}%` : `¥${d.commission_rate ?? 5}`}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">¥{d.total_commission.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">¥{d.available_commission.toFixed(2)}</td>
                  <td className="px-6 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{d.status === 'active' ? '正常' : '停用'}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditId(d.id); setForm({ name: d.user_name, phone: d.phone, password: '', commission_type: d.commission_type || 'percentage', commission_rate: String(d.commission_rate ?? 5) }); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="编辑"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => openResetPwd(d)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors" title="重置密码"><KeyRound className="w-4 h-4" /></button>
                      <button onClick={() => toggleStatus(d)} disabled={togglingId === d.id}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${d.status === 'active' ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-500'}`}
                        title={d.status === 'active' ? '停用' : '启用'}>
                        {togglingId === d.id ? (
                          <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />
                        ) : d.status === 'active' ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </button>
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="删除"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 bg-gray-50/50 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">第 {page}/{totalPages} 页，共 {total} 条</span>
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white outline-none">
                  {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}条/页</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">上一页</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">下一页</button>
              </div>
            </div>
          )}
          {totalPages <= 1 && <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-400 flex justify-between items-center"><span>共 {total} 条记录</span><select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white outline-none">{[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}条/页</option>)}</select></div>}
        </div>

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800">{editId ? '编辑分销商' : '添加分销商'}</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">姓名</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30" placeholder="请输入分销商姓名" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">手机号</label><input value={form.phone} onChange={e => { setForm({...form, phone: e.target.value}); setPhoneError(''); }} required type="tel" maxLength={11} onBlur={async () => { if (!editId && form.phone.length === 11) { try { const token = getToken(); const checkRes: any = await fetch(`${API_BASE}/admin/distributors/check-phone`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ phone: form.phone }), }).then(r => r.json()); if (checkRes?.code === 200 && checkRes.data?.exists) { setPhoneError('该手机号已存在分销商'); } } catch { /* ignore */ } } }} className={`w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 ring-water/30 ${phoneError ? 'border-red-300' : 'border-gray-200'}`} placeholder="请输入手机号" />{phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}</div>
                {/* 返佣规则 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">返佣规则</label>
                  <div className="flex gap-2">
                    <select value={form.commission_type} onChange={e => setForm({...form, commission_type: e.target.value})}
                      className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 ring-water/30 bg-white">
                      <option value="percentage">按比例</option>
                      <option value="fixed">固定金额</option>
                    </select>
                    <div className="relative flex-1">
                      <input value={form.commission_rate} onChange={e => setForm({...form, commission_rate: e.target.value})}
                        type="number" min="0" step="0.1" required
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30 text-sm"
                        placeholder={form.commission_type === 'percentage' ? '如 5 表示 5%' : '如 10 表示 10元'} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {form.commission_type === 'percentage' ? '%' : '元/单'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {form.commission_type === 'percentage'
                      ? `示例：订单100元 → 分销商得 ${(100 * Number(form.commission_rate || 0) / 100).toFixed(2)} 元`
                      : `每笔订单固定返佣 ${form.commission_rate || 0} 元`}
                  </p>
                </div>
                {!editId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">登录密码</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input value={form.password} onChange={e => setForm({...form, password: e.target.value})} required type="password" minLength={6}
                        autoComplete="new-password"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30" placeholder="请设置登录密码（至少6位）" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">分销商将使用手机号 + 此密码登录后台</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} disabled={submitting} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">取消</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-water text-white rounded-xl hover:bg-water-dark transition-colors shadow-md shadow-water/20 disabled:opacity-50 flex items-center justify-center gap-1">
                    {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                    {editId ? '保存修改' : '确认添加'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {showResetPwd && resetTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><KeyRound className="w-5 h-5 text-amber-500" /> 重置密码</h2>
                <button onClick={() => setShowResetPwd(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <p className="text-sm text-gray-500 mb-4">为分销商 <span className="font-semibold text-gray-800">{resetTarget.name}</span> 设置新的登录密码</p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">新密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={resetNewPwd} onChange={e => setResetNewPwd(e.target.value)} required type={showResetPwdVisible ? 'text' : 'password'} minLength={6}
                      className="w-full pl-10 pr-11 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-30 transition-all" placeholder="请输入新密码（至少6位）" autoFocus
                    />
                    <button type="button" onClick={() => setShowResetPwdVisible(!showResetPwdVisible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showResetPwdVisible ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowResetPwd(false)} disabled={resetting} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">取消</button>
                  <button type="submit" disabled={resetting} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-1">
                    {resetting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                    确认重置
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
