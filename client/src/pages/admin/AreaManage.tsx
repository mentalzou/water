import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, MapPin, AlertCircle } from 'lucide-react';

const API_BASE = '/api';

function getToken(): string {
  return localStorage.getItem('admin_token') || '';
}

interface Area {
  id: string;
  name: string;
  description: string;
}

export default function AreaManage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAreas(); }, []);

  async function loadAreas() {
    try {
      setLoading(true);
      setError('');
      const token = getToken();
      const res: any = await fetch(`${API_BASE}/admin/areas`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); }
        catch { return null; }
      });
      if (res && res.code === 200) {
        setAreas(res.data || []);
      } else {
        setError(res?.message || '加载区域失败');
      }
    } catch (e: any) {
      setError(e.message || '网络异常');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSubmitting(true);
    try {
      const token = getToken();
      const data = { name: form.name, description: form.description };
      let res: any;
      if (editId) {
        res = await fetch(`${API_BASE}/admin/areas/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        }).then(r => r.text()).then(text => {
          try { return JSON.parse(text); } catch { return null; }
        });
      } else {
        res = await fetch(`${API_BASE}/admin/areas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        }).then(r => r.text()).then(text => {
          try { return JSON.parse(text); } catch { return null; }
        });
      }
      if (res && res.code === 200) {
        setShowForm(false);
        loadAreas();
      } else {
        alert(res?.message || '操作失败');
      }
    } catch (e: any) {
      alert(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除该区域？')) return;
    try {
      const token = getToken();
      const res: any = await fetch(`${API_BASE}/admin/areas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); } catch { return null; }
      });
      if (res && res.code === 200) {
        loadAreas();
      } else {
        alert(res?.message || '删除失败');
      }
    } catch (e: any) {
      alert(e.message || '删除失败');
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-7 h-7 text-water" /> 区域管理
          </h1>
          <p className="text-gray-500 mt-1">管理配送区域及关联的派送员</p>
        </div>
        <button onClick={() => { setForm({ name: '', description: '' }); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-water text-white rounded-xl hover:bg-water-dark shadow-md">
          <Plus className="w-4 h-4" /> 添加区域
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : areas.length === 0 ? (
        <div className="text-center py-20 text-gray-400">暂无区域数据</div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {areas.map(area => (
            <div key={area.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">{area.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{area.description || '暂无描述'}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditId(area.id); setForm({ name: area.name, description: area.description || '' }); setShowForm(true); }}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                    <Edit2 className="w-3.5 h-3.5"/>
                  </button>
                  <button onClick={() => handleDelete(area.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">{editId ? '编辑区域' : '添加区域'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500"/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">区域名称</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30"
                  placeholder="如：朝阳区" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">描述（可选）</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30 resize-none"
                  placeholder="区域边界描述..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
                  取消
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 bg-water text-white rounded-xl hover:bg-water-dark shadow-md disabled:opacity-50">
                  {submitting ? '提交中...' : (editId ? '保存' : '添加')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
