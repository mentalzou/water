import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Tag, AlertCircle, RotateCcw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

function getToken(): string {
  return localStorage.getItem('admin_token') || '';
}

interface Brand {
  id: string;
  name: string;
  logo?: string;
  description: string;
  status: string;
}

export default function BrandManage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', logo: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [keyword, setKeyword] = useState('');

  useEffect(() => { loadBrands(); }, []);
  useEffect(() => { loadBrands(); }, [keyword]);

  async function loadBrands() {
    try {
      setLoading(true);
      setError('');
      const token = getToken();
      const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
      const res: any = await fetch(`${API_BASE}/admin/brands${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); }
        catch { return null; }
      });
      if (res && res.code === 200) {
        setBrands(res.data || []);
      } else {
        setError(res?.message || '加载品牌失败');
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
      const data = { name: form.name, description: form.description, logo: form.logo };
      let res: any;
      if (editId) {
        res = await fetch(`${API_BASE}/admin/brands/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        }).then(r => r.text()).then(text => {
          try { return JSON.parse(text); } catch { return null; }
        });
      } else {
        res = await fetch(`${API_BASE}/admin/brands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        }).then(r => r.text()).then(text => {
          try { return JSON.parse(text); } catch { return null; }
        });
      }
      if (res && res.code === 200) {
        setShowForm(false);
        loadBrands();
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
    if (!confirm('确认删除该品牌？删除后关联的产品将失去品牌关联。')) return;
    try {
      const token = getToken();
      const res: any = await fetch(`${API_BASE}/admin/brands/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); } catch { return null; }
      });
      if (res && res.code === 200) {
        loadBrands();
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
            <Tag className="w-7 h-7 text-water" /> 品牌管理
          </h1>
          <p className="text-gray-500 mt-1">管理产品品牌</p>
        </div>
        <div className="flex items-center gap-3">
          <input value={keyword} onChange={e => setKeyword(e.target.value)}
            placeholder="搜索品牌名称..."
            className="px-3 py-2.5 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 ring-water/30 text-sm text-gray-600 w-[180px]" />
          <button onClick={() => setKeyword('')}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm">
            <RotateCcw className="w-3.5 h-3.5" /> 重置
          </button>
          <button onClick={() => { setForm({ name: '', description: '', logo: '' }); setEditId(null); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-water text-white rounded-xl hover:bg-water-dark shadow-md">
            <Plus className="w-4 h-4" /> 添加品牌
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : brands.length === 0 ? (
        <div className="text-center py-20 text-gray-400">暂无品牌数据，点击"添加品牌"创建第一个品牌</div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {brands.map(brand => (
            <div key={brand.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-water/10 to-water/20 flex items-center justify-center text-lg font-bold text-water">
                    {brand.logo ? (
                      <img src={brand.logo} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      brand.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">{brand.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{brand.description || '暂无描述'}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditId(brand.id); setForm({ name: brand.name, description: brand.description || '', logo: brand.logo || '' }); setShowForm(true); }}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                    <Edit2 className="w-3.5 h-3.5"/>
                  </button>
                  <button onClick={() => handleDelete(brand.id)}
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
              <h2 className="text-lg font-bold text-gray-800">{editId ? '编辑品牌' : '添加品牌'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500"/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">品牌名称 *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30"
                  placeholder="如：怡宝、农夫山泉" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo URL（可选）</label>
                <input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30"
                  placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">描述（可选）</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30 resize-none"
                  placeholder="品牌简介..." />
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
