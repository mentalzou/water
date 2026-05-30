import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Edit3, Trash2, Search, Key, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('admin_token') || '';
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  distributor: 'bg-green-100 text-green-700',
  deliveryman: 'bg-orange-100 text-orange-700',
  customer: 'bg-blue-100 text-blue-700',
};

interface RoleItem {
  id: string;
  name: string;
  code: string;
  description: string;
  permissions: string[];
  created_at: string;
}

export default function RoleManage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const ALL_PERMISSIONS = [
    { key: '*', label: '全部权限' },
    { key: 'dashboard:view', label: '查看仪表盘' },
    { key: 'user:create', label: '创建用户' },
    { key: 'user:view', label: '查看用户' },
    { key: 'user:edit', label: '编辑用户' },
    { key: 'user:delete', label: '删除用户' },
    { key: 'role:create', label: '创建角色' },
    { key: 'role:view', label: '查看角色' },
    { key: 'role:edit', label: '编辑角色' },
    { key: 'role:delete', label: '删除角色' },
    { key: 'distributor:manage', label: '分销商管理' },
    { key: 'deliveryman:manage', label: '派送员管理' },
    { key: 'area:manage', label: '区域管理' },
    { key: 'order:view', label: '查看订单' },
    { key: 'product:manage', label: '产品管理' },
    { key: 'config:manage', label: '系统配置' },
  ];
  const [formPermissions, setFormPermissions] = useState<string[]>([]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/roles`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.code === 200) {
        setRoles(data.data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  function openCreate() {
    setEditingRole(null);
    setFormName(''); setFormCode(''); setFormDesc(''); setFormPermissions([]);
    setShowForm(true);
  }

  function openEdit(role: RoleItem) {
    setEditingRole(role);
    setFormName(role.name); setFormCode(role.code); setFormDesc(role.description);
    setFormPermissions(role.permissions);
    setShowForm(true);
  }

  async function handleSave() {
    if (!formName || !formCode) return;
    setSaving(true);
    try {
      const body = { name: formName, code: formCode, description: formDesc, permissions: formPermissions };
      const url = editingRole ? `${API_BASE}/admin/roles/${editingRole.id}` : `${API_BASE}/admin/roles`;
      const method = editingRole ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.code === 200) {
        setShowForm(false);
        fetchRoles();
      }
    } catch {}
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除该角色？')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/roles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.code === 200) fetchRoles();
    } catch {}
  }

  function togglePerm(key: string) {
    if (key === '*') {
      setFormPermissions(formPermissions.includes('*') ? [] : ['*']);
      return;
    }
    setFormPermissions(prev => prev.filter(p => p !== '*'));
    setFormPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  }

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-7 h-7 text-cyan-500" /> 角色管理
          </h1>
          <p className="text-gray-500 mt-1 text-sm">管理系统角色和权限配置</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors shadow-md shadow-cyan-500/25"
        >
          <Plus className="w-4 h-4" /> 新增角色
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜索角色名称或编码..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">角色名称</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">编码</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">描述</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">权限数</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">暂无角色数据</td></tr>
              )}
              {filtered.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${ROLE_COLORS[role.code] || 'bg-gray-100 text-gray-700'}`}>
                      {role.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{role.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{role.description || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center gap-1 text-cyan-600 font-medium">
                      <Key className="w-3.5 h-3.5" /> {role.permissions.length}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(role)} className="p-2 text-gray-400 hover:text-cyan-500 hover:bg-cyan-50 rounded-lg transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {(role.code === 'admin' || role.code === 'customer') ? (
                        <span className="p-2 text-gray-300 cursor-not-allowed" title="内置角色不可删除"><Trash2 className="w-4 h-4" /></span>
                      ) : (
                        <button onClick={() => handleDelete(role.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">{editingRole ? '编辑角色' : '新增角色'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">角色名称 *</label>
                <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="如：运营主管"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400" disabled={!!editingRole?.code && editingRole.code === 'admin'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">角色编码 *</label>
                <input value={formCode} onChange={e => setFormCode(e.target.value.replace(/[^a-z0-9_]/g, ''))} placeholder="如：operator"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400"
                  disabled={!!editingRole} />
                {editingRole && <p className="mt-1 text-xs text-gray-400">编码不可修改</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">描述</label>
                <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="角色描述信息"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400" />
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">权限配置</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map(perm => (
                    <label key={perm.key} className={
                      'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all '
                      + (formPermissions.includes(perm.key)
                        ? 'border-cyan-400 bg-cyan-50 text-cyan-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300')
                    }>
                      <input type="checkbox" checked={formPermissions.includes(perm.key)} onChange={() => togglePerm(perm.key)} className="rounded" />
                      {perm.label}
                    </label>
                  ))}
                </div>
                {formPermissions.includes('*') && (
                  <div className="mt-2 flex items-center gap-2 text-amber-600 text-xs bg-amber-50 px-3 py-2 rounded-lg">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    已勾选「全部权限」，该角色将拥有所有操作权限
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors">取消</button>
              <button disabled={saving || !formName || !formCode} onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" /> {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
