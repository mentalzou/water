import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Edit3, Trash2, Search, Key, Save, X, UserCheck, UserX, Lock, Gift, FileText } from 'lucide-react';

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('admin_token') || '';
}

interface RoleItem {
  id: string;
  name: string;
  code: string;
}

// 角色列表从后端API动态获取
let cachedRoles: RoleItem[] = [];
export function getRoleName(code: string): string {
  const r = cachedRoles.find(r => r.code === code);
  return r ? r.name : code;
}
export function getRoleBadgeCls(code: string): string {
  const clsMap: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    distributor: 'bg-green-100 text-green-700',
    deliveryman: 'bg-orange-100 text-orange-700',
    customer: 'bg-blue-100 text-blue-700',
    consumer: 'bg-blue-100 text-blue-700',
  };
  return clsMap[code] || 'bg-gray-100 text-gray-700';
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active: { label: '正常', cls: 'bg-emerald-100 text-emerald-700' },
  inactive: { label: '停用', cls: 'bg-gray-100 text-gray-600' },
  locked: { label: '锁定', cls: 'bg-red-100 text-red-700' },
};

interface UserInfo {
  id: string; phone: string; name: string; role: string;
  avatar?: string; status: string; created_at: string; updated_at: string;
  points?: number;
}

interface PointsRecord {
  id: string;
  user_id: string;
  change_type: 'earn' | 'spend' | 'refund' | 'adjust' | 'expire';
  change_amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

const POINTS_TYPE_MAP: Record<string, { label: string; cls: string }> = {
  earn: { label: '获得积分', cls: 'text-emerald-600' },
  spend: { label: '消费积分', cls: 'text-rose-600' },
  refund: { label: '退款返还', cls: 'text-blue-600' },
  adjust: { label: '管理员调整', cls: 'text-amber-600' },
  expire: { label: '积分过期', cls: 'text-gray-500' },
};

export default function UserManage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetPwdFor, setResetPwdFor] = useState<UserInfo | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [adjustPointsFor, setAdjustPointsFor] = useState<UserInfo | null>(null);
  const [adjustPointsAmount, setAdjustPointsAmount] = useState('');
  const [adjustPointsDesc, setAdjustPointsDesc] = useState('');

  // 积分明细
  const [pointsHistoryUser, setPointsHistoryUser] = useState<UserInfo | null>(null);
  const [pointsRecords, setPointsRecords] = useState<PointsRecord[]>([]);
  const [pointsRecordsLoading, setPointsRecordsLoading] = useState(false);
  const [pointsRecordsPage, setPointsRecordsPage] = useState(1);
  const [pointsRecordsTotal, setPointsRecordsTotal] = useState(0);
  const [pointsRecordsPageSize] = useState(10);
  const [pointsDateFrom, setPointsDateFrom] = useState('');
  const [pointsDateTo, setPointsDateTo] = useState('');
  const [pointsAmountMin, setPointsAmountMin] = useState('');
  const [pointsAmountMax, setPointsAmountMax] = useState('');

  // 角色列表（从后端API动态获取）
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  // Form
  const [fPhone, setFPhone] = useState('');
  const [fName, setFName] = useState('');
  const [fRole, setFRole] = useState('customer');
  const [fStatus, setFStatus] = useState('active');
  const [fPassword, setFPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (filterRole) params.set('role', filterRole);
      if (searchTerm) params.set('keyword', searchTerm);
      const res = await fetch(`${API_BASE}/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.code === 200) {
        setUsers(data.pagination?.data || data.data || []);
        setTotal(data.pagination?.total || data.total || 0);
      }
    } catch {}
    setLoading(false);
  }, [page, filterRole, searchTerm]);

  useEffect(() => { fetchUsers(); loadRoles(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [pageSize]);

  async function loadRoles() {
    try {
      setRolesLoading(true);
      const res = await fetch(`${API_BASE}/admin/roles`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); } catch { return null; }
      });
      if (res && res.code === 200 && Array.isArray(res.data)) {
        const roleList = res.data.map((r: any) => ({ id: r.id, name: r.name, code: r.code }));
        setRoles(roleList);
        cachedRoles = roleList;
      }
    } catch { /* ignore */ } finally {
      setRolesLoading(false);
    }
  }

  function openCreate() {
    setEditingUser(null);
    setFPhone(''); setFName(''); setFRole('customer'); setFStatus('active'); setFPassword('');
    setShowForm(true);
  }

  function openEdit(u: UserInfo) {
    setEditingUser(u);
    setFPhone(u.phone); setFName(u.name); setFRole(u.role); setFStatus(u.status); setFPassword('');
    setShowForm(true);
  }

  async function handleSave() {
    if (!fPhone) return;
    setSaving(true);
    try {
      const body: any = { phone: fPhone, name: fName, role: fRole, status: fStatus };
      if (fPassword) body.password = fPassword;

      const isEdit = !!editingUser;
      const url = isEdit ? `${API_BASE}/admin/users/${editingUser!.id}` : `${API_BASE}/admin/users`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.code === 200) {
        setShowForm(false);
        fetchUsers();
      }
    } catch {}
    setSaving(false);
  }

  async function handleDelete(id: string, role: string) {
    if (!confirm('确认删除该用户？')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.code === 200) fetchUsers();
      else alert(data.message || '删除失败');
    } catch {}
  }

  async function handleResetPwd(u: UserInfo) {
    if (!newPassword || newPassword.length < 6) {
      alert('新密码长度不能少于6位');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admin/users/${u.id}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setResetPwdFor(null); setNewPassword('');
        alert('密码已重置');
      } else {
        alert(data.message || '操作失败');
      }
    } catch {}
  }
  async function handleAdjustPoints() {
    if (!adjustPointsFor || !adjustPointsAmount) return;

    const amount = parseInt(adjustPointsAmount);
    if (isNaN(amount)) {
      alert('请输入有效的积分数量');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/users/${adjustPointsFor.id}/points/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          amount,
          description: adjustPointsDesc || '管理员调整积分'
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setAdjustPointsFor(null);
        setAdjustPointsAmount('');
        setAdjustPointsDesc('');
        alert(data.message || '积分调整成功');
        fetchUsers();
      } else {
        alert(data.message || '操作失败');
      }
    } catch (error) {
      console.error('调整积分失败:', error);
      alert('操作失败');
    }
  }

  async function fetchPointsRecords(userId: string, pg: number, overrideFilters?: { startDate?: string; endDate?: string; minAmount?: string; maxAmount?: string }) {
    setPointsRecordsLoading(true);
    try {
      const startDate = overrideFilters?.startDate ?? pointsDateFrom;
      const endDate = overrideFilters?.endDate ?? pointsDateTo;
      const minAmount = overrideFilters?.minAmount ?? pointsAmountMin;
      const maxAmount = overrideFilters?.maxAmount ?? pointsAmountMax;
      const params = new URLSearchParams({ page: String(pg), pageSize: String(pointsRecordsPageSize) });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (minAmount) params.set('minAmount', minAmount);
      if (maxAmount) params.set('maxAmount', maxAmount);
      const res = await fetch(`${API_BASE}/admin/users/${userId}/points/records?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.code === 200) {
        const body = data.data;
        setPointsRecords(body.records || []);
        setPointsRecordsTotal(body.pagination?.total || 0);
      }
    } catch (e) {
      console.error('获取积分记录失败', e);
    }
    setPointsRecordsLoading(false);
  }

  function openPointsHistory(u: UserInfo) {
    setPointsHistoryUser(u);
    setPointsRecordsPage(1);
    setPointsDateFrom('');
    setPointsDateTo('');
    setPointsAmountMin('');
    setPointsAmountMax('');
    fetchPointsRecords(u.id, 1, { startDate: '', endDate: '', minAmount: '', maxAmount: '' });
  }

  function applyPointsFilter() {
    if (!pointsHistoryUser) return;
    setPointsRecordsPage(1);
    fetchPointsRecords(pointsHistoryUser.id, 1);
  }

  function closePointsHistory() {
    setPointsHistoryUser(null);
    setPointsRecords([]);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-7 h-7 text-cyan-500" /> 用户管理
            </h1>
            <p className="text-gray-500 mt-1 text-sm">管理系统用户、分配角色、重置密码</p>
          </div>
          <button onClick={openCreate}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors shadow-md shadow-cyan-500/25"
          >
            <Plus className="w-4 h-4" /> 添加用户
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="relative max-w-xs flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                   placeholder="搜索姓名或手机号..."
                   className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400"
            />
          </div>
          <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(1); }}
                  className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          >
            <option value="">全部角色</option>
            {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
          <span className="text-sm text-gray-400">共 {total} 条记录</span>
        </div>

        {/* Table */}
        {loading ? (
            <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">姓名</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">手机号</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">角色</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">积分</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">注册时间</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">操作</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {users.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">暂无用户数据</td></tr>
                )}
                {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {(u.name || u.phone).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800 text-sm">{u.name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-600 font-mono">{u.phone}</td>
                      <td className="px-6 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${getRoleBadgeCls(u.role)}`}>
                      {getRoleName(u.role)}
                    </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1">
                          <Gift className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-medium text-gray-800">{u.points || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_MAP[u.status]?.cls || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_MAP[u.status]?.label || u.status}
                    </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-500 whitespace-nowrap">{u.created_at?.slice(0, 10)}</td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(u)} title="编辑" className="p-2 text-gray-400 hover:text-cyan-500 hover:bg-cyan-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => { setResetPwdFor(u); setNewPassword(''); }} title="重置密码" className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"><Key className="w-4 h-4" /></button>
                          <button onClick={() => { setAdjustPointsFor(u); setAdjustPointsAmount(''); setAdjustPointsDesc(''); }} title="调整积分" className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"><Gift className="w-4 h-4" /></button>
                          <button onClick={() => openPointsHistory(u)} title="积分明细" className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><FileText className="w-4 h-4" /></button>
                          {u.role === 'admin' ? (
                              <span className="p-2 text-gray-300 cursor-not-allowed" title="不可删除管理员"><Trash2 className="w-4 h-4" /></span>
                          ) : (
                              <button onClick={() => handleDelete(u.id, u.role)} title="删除" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">第 {page}/{totalPages} 页，共 {total} 条</span>
                      <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                        className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white outline-none">
                        {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}条/页</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">上一页</button>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">下一页</button>
                    </div>
                  </div>
              )}
            </div>
        )}

        {/* Create/Edit Modal */}
        {showForm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800">{editingUser ? '编辑用户' : '添加用户'}</h2>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">手机号 *</label>
                    <input type="tel" value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="请输入手机号"
                           className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                           disabled={!!editingUser} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">姓名</label>
                    <input value={fName} onChange={e => setFName(e.target.value)} placeholder="请输入姓名"
                           className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">角色</label>
                      {rolesLoading ? (
                          <p className="text-sm text-gray-400 py-2.5 px-4 border border-gray-200 rounded-xl">加载角色中...</p>
                      ) : roles.length === 0 ? (
                          <p className="text-sm text-gray-400 py-2.5 px-4 border border-gray-200 rounded-xl">暂无角色，请先在角色管理中添加</p>
                      ) : (
                          <select value={fRole} onChange={e => setFRole(e.target.value)}
                                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 bg-white"
                          >
                            {roles.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                          </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">状态</label>
                      <select value={fStatus} onChange={e => setFStatus(e.target.value)}
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 bg-white"
                      >
                        <option value="active">正常</option>
                        <option value="inactive">停用</option>
                        <option value="locked">锁定</option>
                      </select>
                    </div>
                  </div>
                  {!editingUser && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">初始密码</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="password" value={fPassword} onChange={e => setFPassword(e.target.value)} placeholder="不填则无密码（需后续设置）"
                                 autoComplete="new-password"
                                 className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                        </div>
                      </div>
                  )}
                  {editingUser && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">修改密码</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="password" value={fPassword} onChange={e => setFPassword(e.target.value)} placeholder="留空表示不修改"
                                 autoComplete="new-password"
                                 className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                        </div>
                      </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
                  <button onClick={() => setShowForm(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">取消</button>
                  <button disabled={saving || !fPhone} onClick={handleSave}
                          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 disabled:opacity-50"
                  ><Save className="w-4 h-4" /> {saving ? '保存中...' : '保存'}</button>
                </div>
              </div>
            </div>
        )}

        {/* Reset Password Modal */}
        {resetPwdFor && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setResetPwdFor(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"><Key className="w-5 h-5 text-amber-600" /></div>
                    <div><h3 className="font-bold text-gray-800">重置密码</h3><p className="text-sm text-gray-500">{resetPwdFor.name} ({resetPwdFor.phone})</p></div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">新密码（至少6位）</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="请输入新密码"
                           autoComplete="new-password"
                           className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                           onKeyDown={e => e.key === 'Enter' && handleResetPwd(resetPwdFor)} autoFocus />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setResetPwdFor(null)} className="flex-1 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">取消</button>
                    <button onClick={() => handleResetPwd(resetPwdFor)} disabled={!newPassword || newPassword.length < 6}
                            className="flex-1 py-2.5 bg-yan-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-1"
                    ><Lock className="w-4 h-4" /> 确认重置</button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Adjust Points Modal */}
        {adjustPointsFor && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setAdjustPointsFor(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center"><Gift className="w-5 h-5 text-orange-600" /></div>
                    <div>
                      <h3 className="font-bold text-gray-800">调整积分</h3>
                      <p className="text-sm text-gray-500">{adjustPointsFor.name} ({adjustPointsFor.phone})</p>
                      <p className="text-xs text-gray-400 mt-1">当前积分: {adjustPointsFor.points || 0}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">积分数量（正数增加，负数减少）</label>
                    <input
                        type="number"
                        value={adjustPointsAmount}
                        onChange={e => setAdjustPointsAmount(e.target.value)}
                        placeholder="例如: 100 或 -50"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        onKeyDown={e => e.key === 'Enter' && handleAdjustPoints()}
                        autoFocus
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">备注说明</label>
                    <input
                        type="text"
                        value={adjustPointsDesc}
                        onChange={e => setAdjustPointsDesc(e.target.value)}
                        placeholder="可选，说明调整原因"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setAdjustPointsFor(null)} className="flex-1 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">取消</button>
                    <button onClick={handleAdjustPoints} disabled={!adjustPointsAmount}
                            className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-1"
                    ><Gift className="w-4 h-4" /> 确认调整</button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Points History Modal */}
        {pointsHistoryUser && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closePointsHistory}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div>
                    <div>
                      <h3 className="font-bold text-gray-800">积分明细</h3>
                      <p className="text-sm text-gray-500">
                        {pointsHistoryUser.name} ({pointsHistoryUser.phone})
                        <span className="ml-3 text-xs text-gray-400">
                          当前积分: <span className="font-semibold text-orange-600">{pointsHistoryUser.points || 0}</span>
                        </span>
                      </p>
                    </div>
                  </div>
                  <button onClick={closePointsHistory} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                {/* Filter row */}
                <div className="px-6 py-3 border-b border-gray-100 shrink-0 bg-gray-50/50">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-gray-500 whitespace-nowrap">日期</label>
                      <input type="date" value={pointsDateFrom} onChange={e => setPointsDateFrom(e.target.value)}
                             className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      <span className="text-xs text-gray-400">至</span>
                      <input type="date" value={pointsDateTo} onChange={e => setPointsDateTo(e.target.value)}
                             className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs text-gray-500 whitespace-nowrap">积分</label>
                      <input type="number" value={pointsAmountMin} onChange={e => setPointsAmountMin(e.target.value)}
                             placeholder="最低" className="w-18 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      <span className="text-xs text-gray-400">-</span>
                      <input type="number" value={pointsAmountMax} onChange={e => setPointsAmountMax(e.target.value)}
                             placeholder="最高" className="w-18 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <button onClick={applyPointsFilter}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      <Search className="w-3.5 h-3.5" /> 查询
                    </button>
                    <button onClick={() => { setPointsDateFrom(''); setPointsDateTo(''); setPointsAmountMin(''); setPointsAmountMax(''); if (pointsHistoryUser) fetchPointsRecords(pointsHistoryUser.id, 1, { startDate: '', endDate: '', minAmount: '', maxAmount: '' }); }}
                            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      重置
                    </button>
                  </div>
                </div>
                <div className="overflow-auto flex-1 p-6">
                  {pointsRecordsLoading ? (
                      <div className="text-center py-12 text-gray-400">加载中...</div>
                  ) : pointsRecords.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">暂无积分记录</div>
                  ) : (
                      <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2.5 px-2 text-xs font-semibold text-gray-500 uppercase">变更类型</th>
                          <th className="text-right py-2.5 px-2 text-xs font-semibold text-gray-500 uppercase">变更数量</th>
                          <th className="text-right py-2.5 px-2 text-xs font-semibold text-gray-500 uppercase">变更后余额</th>
                          <th className="text-left py-2.5 px-2 text-xs font-semibold text-gray-500 uppercase">说明</th>
                          <th className="text-right py-2.5 px-2 text-xs font-semibold text-gray-500 uppercase">时间</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                        {pointsRecords.map((rec) => (
                            <tr key={rec.id} className="hover:bg-gray-50/50">
                              <td className="py-2.5 px-2">
                                <span className={`text-xs font-medium ${POINTS_TYPE_MAP[rec.change_type]?.cls || 'text-gray-600'}`}>
                                  {POINTS_TYPE_MAP[rec.change_type]?.label || rec.change_type}
                                </span>
                              </td>
                              <td className={`py-2.5 px-2 text-right font-mono text-xs font-medium ${rec.change_amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {rec.change_amount >= 0 ? '+' : ''}{rec.change_amount}
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono text-xs text-gray-700">{rec.balance_after}</td>
                              <td className="py-2.5 px-2 text-xs text-gray-500 max-w-[180px] truncate" title={rec.description}>{rec.description}</td>
                              <td className="py-2.5 px-2 text-right text-xs text-gray-400 whitespace-nowrap">{rec.created_at?.slice(0, 19)}</td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                  )}
                </div>
                {/* Points history pagination - always visible */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 shrink-0">
                  <span className="text-xs text-gray-400">
                    共 {pointsRecordsTotal} 条{pointsRecordsTotal > pointsRecordsPageSize ? `，第 ${pointsRecordsPage}/${Math.ceil(pointsRecordsTotal / pointsRecordsPageSize)} 页` : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                        onClick={() => { const p = pointsRecordsPage - 1; setPointsRecordsPage(p); if (pointsHistoryUser) fetchPointsRecords(pointsHistoryUser.id, p); }}
                        disabled={pointsRecordsPage <= 1}
                        className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                    >上一页</button>
                    <button
                        onClick={() => { const p = pointsRecordsPage + 1; setPointsRecordsPage(p); if (pointsHistoryUser) fetchPointsRecords(pointsHistoryUser.id, p); }}
                        disabled={pointsRecordsPage >= Math.ceil(Math.max(pointsRecordsTotal, 1) / pointsRecordsPageSize)}
                        className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                    >下一页</button>
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
