import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, UserPlus, Lock, KeyRound, Eye, EyeOff, Power, PowerOff } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

function getToken(): string {
  return localStorage.getItem('admin_token') || '';
}

export default function DeliverymanManage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // 区域列表从后端API动态获取（含 id + name）
  const [allAreas, setAllAreas] = useState<{ id: string; name: string }[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '', areas: [] as string[] });
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset password modal state
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ id: string; userId: string; name: string } | null>(null);
  const [resetNewPwd, setResetNewPwd] = useState('');
  const [showResetPwdVisible, setShowResetPwdVisible] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Toggle status loading state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => { loadData(); loadAreas(); }, []);

  async function loadAreas() {
    try {
      setAreasLoading(true);
      const token = getToken();
      const res: any = await fetch(`${API_BASE}/admin/areas`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); } catch { return null; }
      });
      if (res && res.code === 200 && Array.isArray(res.data)) {
        setAllAreas(res.data.map((a: any) => ({ id: a.id, name: a.name })));
      }
    } catch { /* ignore */ } finally {
      setAreasLoading(false);
    }
  }

  async function loadData() {
    try {
      const token = getToken();
      const res: any = await fetch(`${API_BASE}/admin/deliverymen`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      if (res.code === 200) setData(res.data?.data || res.data || []);
      else setData([]);
    } catch {
      setData([
        { id: '1', name: '陈师傅', phone: '13900001111', area_ids: ['a1'], areas: ['朝阳区'], status: 'active', total_orders: 128, completed_orders: 125, rating: 4.9 },
        { id: '2', name: '刘师傅', phone: '13900002222', area_ids: ['a2'], areas: ['海淀区'], status: 'active', total_orders: 96, completed_orders: 94, rating: 4.8 },
        { id: '3', name: '王师傅', phone: '13900003333', area_ids: ['a1','a3'], areas: ['朝阳区','丰台区'], status: 'inactive', total_orders: 85, completed_orders: 83, rating: 4.7 },
      ]);
    } finally { setLoading(false); }
  }

  function handleAdd() {
    setForm({ name: '', phone: '', password: '', areas: [] });
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
        await fetch(`${API_BASE}/admin/deliverymen/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: form.name, phone: form.phone, area_ids: form.areas }),
        }).then(r => r.json());
        setData(data.map(d => d.id === editId ? { ...d, name: form.name, phone: form.phone, area_ids: form.areas } : d));
      } else {
        const res: any = await fetch(`${API_BASE}/admin/deliverymen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: form.name, phone: form.phone, password: form.password, area_ids: form.areas }),
        }).then(r => r.json());
        if (res.code === 200) loadData();
      }
      setShowForm(false);
    } catch (err: any) {
      console.error('[提交]', err);
      alert(err?.message || '操作失败');
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除该派送员？')) return;
    try {
      const token = getToken();
      await fetch(`${API_BASE}/admin/deliverymen/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());
      setData(data.filter(d => d.id !== id));
    } catch { /* silent */ }
  }

  async function toggleStatus(d: any) {
    const newStatus = d.status === 'active' ? 'inactive' : 'active';
    if (!confirm(`确认${newStatus === 'active' ? '启用' : '停用'}派送员「${d.name}」？`)) return;
    setTogglingId(d.id);
    try {
      const token = getToken();
      const res: any = await fetch(`${API_BASE}/admin/deliverymen/${d.id}`, {
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
    setResetTarget({ id: d.id, userId: d.user_id, name: d.name });
    setResetNewPwd('');
    setShowResetPwdVisible(false);
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
      const response = await fetch(`${API_BASE}/admin/deliverymen/${resetTarget!.id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword: resetNewPwd }),
      });
      const text = await response.text();
      let res: any = null;
      try { res = JSON.parse(text); } catch { res = { code: response.status, message: `服务返回异常(${response.status})` }; }
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

  const filtered = data.filter(d =>
    !search || d.name.includes(search) || d.phone.includes(search)
  );

  return (
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <UserPlus className="w-7 h-7 text-water" /> 派送员管理
            </h1>
            <p className="text-gray-500 mt-1">管理派送员信息及负责区域</p>
          </div>
          <button onClick={handleAdd} className="flex items-center gap-2 px-5 py-2.5 bg-water text-white rounded-xl hover:bg-water-dark transition-colors shadow-md shadow-water/20">
            <Plus className="w-4 h-4" /> 添加派送员
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索姓名或手机号..."
            className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-water/30 transition-all" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-gray-50/80 border-b border-gray-100">
              {['姓名', '手机号', '负责区域', '总订单', '完成率', '评分', '状态', '操作'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center"><div className="w-8 h-8 border-3 border-water/30 border-t-water rounded-full animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-gray-400">暂无数据</td></tr>
              ) : filtered.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-gray-800">{d.name}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">{d.phone}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(d.areas || []).map((a: string) => (
                        <span key={a} className="inline-block px-2 py-0.5 bg-cyan-50 text-cyan-600 rounded-md text-xs">{a}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{d.total_orders ?? 0}</td>
                  <td className="px-5 py-4 text-sm font-medium text-green-600">
                    {(d.total_orders ?? 0) > 0 ? Math.round((d.completed_orders ?? 0) / (d.total_orders ?? 1) * 100) : 0}%
                  </td>
                  <td className="px-5 py-4"><span className="text-sm font-semibold text-yellow-500">★{(d.rating ?? 0).toFixed(1)}</span></td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      d.status === 'active' ? 'bg-green-100 text-green-700' :
                      d.status === 'busy' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {d.status === 'active' ? '启用' : d.status === 'busy' ? '忙碌' : '停用'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1.5">
                      <button onClick={() => { setEditId(d.id); setForm({ name: d.name, phone: d.phone, password: '', areas: d.area_ids || [] }); setShowForm(true); }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="编辑">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => openResetPwd(d)}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors" title="重置密码">
                        <KeyRound className="w-4 h-4" />
                      </button>
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
                      <button onClick={() => handleDelete(d.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-400 text-right">共 {filtered.length} 条记录</div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800">{editId ? '编辑派送员' : '添加派送员'}</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">姓名</label>
                  <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30" placeholder="请输入姓名" />
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">手机号</label>
                  <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} required type="tel" maxLength={11}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30" placeholder="请输入手机号" />
                </div>
                {!editId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">登录密码</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input value={form.password} onChange={e => setForm({...form, password: e.target.value})} required type="password" minLength={6}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30" placeholder="请设置登录密码（至少6位）" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">派送员将使用手机号 + 此密码登录后台</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">负责区域（可多选）</label>
                  {areasLoading ? (
                    <p className="text-sm text-gray-400">加载区域中...</p>
                  ) : allAreas.length === 0 ? (
                    <p className="text-sm text-gray-400">暂无区域，请先在区域管理中添加</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allAreas.map(area => (
                        <label key={area.id}
                          className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${form.areas.includes(area.id) ? 'bg-water text-white border-water' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-water/30'}`}>
                          <input type="checkbox" hidden checked={form.areas.includes(area.id)}
                            onChange={e => setForm({...form, areas: e.target.checked ? [...form.areas, area.id] : form.areas.filter(a => a !== area.id)})} />
                          {area.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} disabled={submitting}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">取消</button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-2.5 bg-water text-white rounded-xl hover:bg-water-dark transition-colors shadow-md shadow-water/20 disabled:opacity-50 flex items-center justify-center gap-1">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowResetPwd(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><KeyRound className="w-5 h-5 text-amber-500" /> 重置密码</h2>
                <button onClick={() => setShowResetPwd(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <p className="text-sm text-gray-500 mb-4">为派送员 <span className="font-semibold text-gray-800">{resetTarget.name}</span> 设置新的登录密码</p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">新密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={resetNewPwd} onChange={e => setResetNewPwd(e.target.value)} required type={showResetPwdVisible ? 'text' : 'password'} minLength={6}
                      className="w-full pl-10 pr-11 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-30 transition-all" placeholder="请输入新密码（至少6位）" autoFocus
                    />
                    <button type="button" onClick={() => setShowResetPwdVisible(!showResetPwdVisible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showResetPwdVisible ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowResetPwd(false)} disabled={resetting}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">取消</button>
                  <button type="submit" disabled={resetting}
                    className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-1">
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
