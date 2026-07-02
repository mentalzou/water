import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, X, ShoppingBag, AlertCircle, RotateCcw, Upload, ImageIcon } from 'lucide-react';

const API_BASE = '/api';

function getToken(): string {
  return localStorage.getItem('admin_token') || '';
}

interface CategoryOption {
  id: string;
  name: string;
  code: string;
}

interface BrandOption {
  id: string;
  name: string;
  category_id?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  image?: string;
  stock?: number;
  frozen_stock?: number;
  min_order_quantity?: number;
  status: string;
  sort_order: number;
  brand_id?: string;
  brand_name?: string;
  category_id?: string;
  category_name?: string;
}

export default function ProductManage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', unit: '瓶', category_id: '', brand_id: '', image: '', stock: '99999', min_order_quantity: '1' });
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => { loadCategories(); loadBrands(); loadProducts(); }, [page, pageSize]);
  useEffect(() => { setPage(1); loadProducts(); }, [categoryFilter, brandFilter, keyword]);
  useEffect(() => {
    if (form.category_id) {
      loadBrands(form.category_id);
    }
  }, [form.category_id]);

  async function loadCategories() {
    try {
      const token = getToken();
      const res: any = await fetch(`${API_BASE}/admin/categories/select`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); } catch { return null; }
      });
      if (res && res.code === 200) {
        setCategories(res.data || []);
      }
    } catch { /* ignore */ }
  }

  async function loadBrands(categoryId?: string) {
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (categoryId) params.set('category_id', categoryId);
      const qs = params.toString();
      const res: any = await fetch(`${API_BASE}/admin/brands/select${qs ? '?' + qs : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); } catch { return null; }
      });
      if (res && res.code === 200) {
        setBrands(res.data || []);
      }
    } catch { /* ignore */ }
  }

  async function loadProducts() {
    try {
      setLoading(true);
      setError('');
      const token = getToken();
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (categoryFilter) params.set('category_id', categoryFilter);
      if (brandFilter) params.set('brand_id', brandFilter);
      if (keyword) params.set('keyword', keyword);
      const res: any = await fetch(`${API_BASE}/admin/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); }
        catch { return null; }
      });
      if (res && res.code === 200) {
        setProducts(res.data?.data || res.data || []);
        setTotal(res.pagination?.total || 0);
      } else {
        setError(res?.message || '加载产品失败');
      }
    } catch (e: any) {
      setError(e.message || '网络异常');
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append('file', file);
      const res: any = await fetch(`${API_BASE}/admin/products/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); } catch { return null; }
      });
      if (res && res.code === 200) {
        setForm(prev => ({ ...prev, image: res.data.url }));
      } else {
        alert(res?.message || '图片上传失败');
      }
    } catch (e: any) {
      alert(e.message || '图片上传失败');
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExts.includes(ext)) {
      alert(`仅支持图片格式：${allowedExts.join(', ')}`);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('图片大小不能超过 50MB');
      return;
    }

    handleImageUpload(file);
    // 重置 input，允许重复选择同一文件
    e.target.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = getToken();
      const data: any = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        unit: form.unit,
        stock: form.stock.trim() === '' ? 99999 : parseInt(form.stock),
        min_order_quantity: parseInt(form.min_order_quantity) || 1,
        category_id: form.category_id || undefined,
        brand_id: form.brand_id || undefined
      };
      if (form.image) data.image = form.image;
      const url = editId ? `${API_BASE}/admin/products/${editId}` : `${API_BASE}/admin/products`;
      const method = editId ? 'PUT' : 'POST';
      const res: any = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); }
        catch { return null; }
      });
      if (res && res.code === 200) {
        setShowForm(false);
        loadProducts();
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
    if (!confirm('确认删除该产品？')) return;
    try {
      const token = getToken();
      const res: any = await fetch(`${API_BASE}/admin/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); }
        catch { return null; }
      });
      if (res && res.code === 200) {
        loadProducts();
      } else {
        alert(res?.message || '删除失败');
      }
    } catch (e: any) {
      alert(e.message || '删除失败');
    }
  }

  function openCreate() {
    setForm({ name: '', description: '', price: '', unit: '瓶', category_id: '', brand_id: '', image: '', stock: '99999', min_order_quantity: '1' });
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      unit: p.unit,
      category_id: p.category_id || '',
      brand_id: p.brand_id || '',
      image: p.image || '',
      stock: String(p.stock ?? 99999),
      min_order_quantity: String(p.min_order_quantity ?? 1),
    });
    setShowForm(true);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-water" /> 产品管理
          </h1>
          <p className="text-gray-500 mt-1">管理水产品及定价</p>
        </div>
        <div className="flex items-center gap-3">
          <input value={keyword} onChange={e => setKeyword(e.target.value)}
                 placeholder="搜索产品名称..."
                 className="px-3 py-2.5 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 ring-water/30 text-sm text-gray-600 w-[180px]" />
          {categories.length > 0 && (
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                      className="px-3 py-2.5 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 ring-water/30 text-sm text-gray-600 min-w-[140px]">
                <option value="">全部分类</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
          )}
          {brands.length > 0 && (
            <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
              className="px-3 py-2.5 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 ring-water/30 text-sm text-gray-600 min-w-[140px]">
              <option value="">全部品牌</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button onClick={() => { setKeyword(''); setCategoryFilter(''); setBrandFilter(''); }}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 text-sm">
            <RotateCcw className="w-3.5 h-3.5" /> 重置
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-water text-white rounded-xl hover:bg-water-dark shadow-md">
            <Plus className="w-4 h-4" /> 添加产品
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
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">暂无产品数据</div>
      ) : (
        <>
        <div className="grid grid-cols-3 gap-5">
          {products.map((p, idx) => (
            <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg bg-white shadow-sm hover:bg-blue-50 text-blue-500">
                  <Edit2 className="w-3.5 h-3.5"/>
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg bg-white shadow-sm hover:bg-red-50 text-red-500">
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              </div>

              <div className={`w-full aspect-[4/3] rounded-xl mb-4 flex items-center justify-center overflow-hidden ${['from-cyan-400/10 to-blue-500/10','from-emerald-400/10 to-teal-500/10','from-purple-400/10 to-pink-500/10'][idx % 3]} bg-gradient-to-br`}>
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-gray-300" />
                )}
              </div>


              <h3 className="font-semibold text-gray-800">{p.name}</h3>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2 min-h-[28px]">{p.description || '暂无描述'}</p>

              {/* 库存 + 起送量 */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">
                  库存: {p.stock != null ? (p.stock - (p.frozen_stock ?? 0)) : '∞'}
                </span>
                {(p.frozen_stock ?? 0) > 0 && (
                  <span className="text-xs text-orange-500">(冻结{p.frozen_stock})</span>
                )}
                {(p.min_order_quantity ?? 1) > 1 && (
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-medium">{p.min_order_quantity}件起送</span>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-dashed border-gray-100 flex justify-between items-end">
                <div>
                  <span className="text-xs text-gray-400">单价</span>
                  <p className="text-xl font-bold gradient-text">¥{p.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {p.category_name && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs font-medium">{p.category_name}</span>}
                  {p.brand_name && <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs font-medium">{p.brand_name}</span>}
                  <span className="px-2.5 py-1 bg-water/10 text-water rounded-lg text-xs font-medium">/{p.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {!loading && (
          <div className="mt-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">共 {total} 条记录</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white outline-none">
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}条/页</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">上一页</button>
              <span className="text-sm text-gray-500">{page}/{Math.max(totalPages, 1)}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">下一页</button>
            </div>
          </div>
        )}
        </>
    )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl my-auto" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">{editId ? '编辑产品' : '添加产品'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500"/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">产品分类 *</label>
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value, brand_id: '' })} required
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30 text-sm">
                  <option value="">请选择分类</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">品牌</label>
                <select value={form.brand_id} onChange={e => setForm({ ...form, brand_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30 text-sm">
                  <option value="">不选择品牌</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {!form.category_id && (
                    <p className="text-xs text-orange-500 mt-1">请先选择分类以筛选品牌</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">产品名称 *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                       className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30 text-sm"
                       placeholder="如：纯天然矿泉水"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30 resize-none text-sm"
                          placeholder="产品描述..."/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">产品图片</label>
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.svg" onChange={handleFileChange}
                       className="hidden" />
                {form.image ? (
                  <div className="relative group">
                    <img src={form.image} alt="产品图片预览" className="w-full h-28 object-cover rounded-xl border border-gray-200" />
                    <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                              className="px-2 py-1 bg-white text-gray-700 rounded-lg text-xs hover:bg-gray-100">
                        <Upload className="w-3 h-3 inline mr-1" />更换
                      </button>
                      <button type="button" onClick={() => setForm({ ...form, image: '' })}
                              className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600">
                        <Trash2 className="w-3 h-3 inline mr-1" />删除
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                          className="w-full h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-water hover:text-water transition-colors disabled:opacity-50">
                    {uploading ? (
                      <span className="text-sm">上传中...</span>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span className="text-xs">点击上传产品图片</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">价格 (¥)</label>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required
                         className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30 text-sm"
                         placeholder="0.00"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                  <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                         className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30 text-sm"
                         placeholder="瓶/桶"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">库存数量</label>
                  <input type="number" step="1" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                         className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30 text-sm"
                         placeholder="留空默认99999，0表示已售罄"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">起送量（件）</label>
                  <input type="number" step="1" min="1" value={form.min_order_quantity} onChange={e => setForm({ ...form, min_order_quantity: e.target.value })}
                         className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30 text-sm"
                         placeholder="1"/>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm">
                  取消
                </button>
                <button type="submit" disabled={submitting}
                        className="flex-1 py-2.5 bg-water text-white rounded-xl hover:bg-water-dark shadow-md disabled:opacity-50 text-sm">
                  {submitting ? '提交中...' : (editId ? '保存修改' : '添加产品')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
