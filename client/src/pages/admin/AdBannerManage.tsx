import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Upload, Image, Video, ExternalLink } from 'lucide-react';
import adminApi from '../../api/admin.api';

interface AdBannerItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'image' | 'video';
  src: string;
  link_url: string;
  bg_color: string;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
}

const PRESET_COLORS = [
  { label: '蓝色', value: 'from-sky-400 via-blue-500 to-indigo-600' },
  { label: '橙红', value: 'from-orange-400 via-red-500 to-pink-500' },
  { label: '翠绿', value: 'from-emerald-400 via-green-500 to-teal-600' },
  { label: '紫色', value: 'from-purple-400 via-violet-500 to-indigo-600' },
  { label: '青色', value: 'from-cyan-400 via-teal-500 to-emerald-500' },
  { label: '粉色', value: 'from-pink-400 via-rose-500 to-red-500' },
];

export default function AdBannerManage() {
  const [banners, setBanners] = useState<AdBannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AdBannerItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    type: 'image' as 'image' | 'video',
    src: '',
    link_url: '',
    bg_color: PRESET_COLORS[0].value,
    sort_order: '0',
  });

  useEffect(() => { loadBanners(); }, []);

  async function loadBanners() {
    try {
      const res: any = await adminApi.get('/banners');
      if (res && res.code === 200) {
        setBanners(res.data || []);
      }
    } catch (err) {
      console.error('加载广告栏失败:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    setEditingBanner(null);
    setFormData({
      title: '', subtitle: '', type: 'image', src: '',
      link_url: '', bg_color: PRESET_COLORS[0].value, sort_order: '0',
    });
    setShowModal(true);
  }

  function handleEdit(b: AdBannerItem) {
    setEditingBanner(b);
    setFormData({
      title: b.title,
      subtitle: b.subtitle || '',
      type: b.type,
      src: b.src || '',
      link_url: b.link_url || '',
      bg_color: b.bg_color || PRESET_COLORS[0].value,
      sort_order: String(b.sort_order || 0),
    });
    setShowModal(true);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件大小（50MB）
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`文件大小不能超过 50MB，当前文件大小：${(file.size / 1024 / 1024).toFixed(1)}MB`);
      e.target.value = '';
      return;
    }

    // 检查视频格式
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
    if (!allowedExts.includes(ext)) {
      alert(`不支持的文件格式 ".${ext}"，支持的格式：${allowedExts.join(', ')}`);
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const token = localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/banners/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      }).then(r => r.json());
      if (res.code === 200) {
        setFormData(prev => ({ ...prev, src: res.data.url }));
      } else {
        alert(res.message || '上传失败，请检查文件格式或重试');
      }
    } catch (err: any) {
      alert(err.message || '上传失败，请检查网络连接');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title) { alert('请填写广告标题'); return; }

    try {
      if (editingBanner) {
        await adminApi.put(`/banners/${editingBanner.id}`, formData);
      } else {
        await adminApi.post('/banners', formData);
      }
      setShowModal(false);
      await loadBanners();
      alert(editingBanner ? '更新成功' : '创建成功');
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  }

  async function handleToggleStatus(b: AdBannerItem) {
    try {
      const newStatus = b.status === 'active' ? 'inactive' : 'active';
      await adminApi.put(`/banners/${b.id}`, { status: newStatus });
      await loadBanners();
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除此广告栏？')) return;
    try {
      await adminApi.delete(`/banners/${id}`);
      await loadBanners();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  }

  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">广告栏管理</h1>
            <p className="text-sm text-gray-500 mt-1">管理首页跑马灯广告栏，支持图片/视频和跳转链接</p>
          </div>
          <button onClick={handleAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-water text-white rounded-lg hover:bg-water/90 transition-colors">
            <Plus className="w-4 h-4" />新增广告
          </button>
        </div>

        {/* 简易预览：展示当前启用的广告 */}
        {banners.filter(b => b.status === 'active').length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">前台预览（当前启用 {banners.filter(b => b.status === 'active').length} 个）</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {banners.filter(b => b.status === 'active').sort((a, b) => a.sort_order - b.sort_order).map((b, i) => (
                    <div key={b.id} className="flex-shrink-0 w-64 rounded-lg overflow-hidden border border-gray-200">
                      {b.src ? (
                          b.type === 'video'
                              ? <video src={b.src} className="w-full h-32 object-cover" muted playsInline preload="metadata" crossOrigin="anonymous" />
                              : <img src={b.src} className="w-full h-32 object-cover" alt={b.title} />
                      ) : (
                          <div className={`w-full h-32 bg-gradient-to-br ${b.bg_color || 'from-water-light via-water to-teal-400'} flex items-center justify-center`}>
                            <span className="text-white font-bold text-sm">{b.title}</span>
                          </div>
                      )}
                      <div className="p-2 bg-white">
                        <p className="text-xs font-medium text-gray-700 truncate">{b.title}</p>
                        <p className="text-xs text-gray-400">#{i + 1} {b.link_url ? '🔗有链接' : ''}</p>
                      </div>
                    </div>
                ))}
              </div>
            </div>
        )}

        {/* 列表 */}
        {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-water-light/30 border-t-water rounded-full animate-spin" />
            </div>
        ) : banners.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <Image className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400">暂无广告栏，点击上方按钮创建</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {banners.map((b) => (
                  <div key={b.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* 预览图 */}
                    <div className="h-36 relative bg-gray-100">
                      {b.src ? (
                          b.type === 'video'
                              ? <video src={b.src} className="w-full h-full object-cover" muted playsInline preload="metadata" crossOrigin="anonymous" />
                              : <img src={b.src} className="w-full h-full object-cover" alt={b.title} />
                      ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${b.bg_color || 'from-gray-300 to-gray-400'} flex items-center justify-center`}>
                            <span className="text-white/80 text-lg font-bold">{b.title}</span>
                          </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {b.type === 'video' && <span className="px-2 py-0.5 bg-black/50 text-white text-xs rounded">视频</span>}
                        {b.link_url && <ExternalLink className="w-3 h-3 text-white drop-shadow" />}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 mr-2">
                          <h3 className="font-semibold text-gray-800 truncate">{b.title}</h3>
                          {b.subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{b.subtitle}</p>}
                        </div>
                        <button onClick={() => handleToggleStatus(b)}
                                className={`shrink-0 ${b.status === 'active' ? 'text-green-500' : 'text-gray-400'}`}>
                          {b.status === 'active' ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                      </div>

                      <div className="space-y-1 mb-3 text-xs text-gray-500">
                        <div className="flex justify-between"><span>类型</span><span className="font-medium">{b.type === 'video' ? '视频' : '图片'}</span></div>
                        <div className="flex justify-between"><span>排序</span><span>{b.sort_order}</span></div>
                        {b.link_url && <div className="truncate text-blue-500">{b.link_url}</div>}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button onClick={() => handleEdit(b)}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm">
                          <Edit2 className="w-3.5 h-3.5" />编辑
                        </button>
                        <button onClick={() => handleDelete(b.id)}
                                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
        )}

        {/* 编辑/新增弹窗 */}
        {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    {editingBanner ? '编辑广告' : '新增广告'}
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">标题 <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.title}
                             onChange={e => setFormData({ ...formData, title: e.target.value })}
                             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-water/30 focus:border-water outline-none" required />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">副标题</label>
                      <input type="text" value={formData.subtitle}
                             onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-water/30 focus:border-water outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                        <select value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as 'image' | 'video' })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-water/30 focus:border-water outline-none bg-white">
                          <option value="image">图片</option>
                          <option value="video">视频</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                        <input type="number" value={formData.sort_order}
                               onChange={e => setFormData({ ...formData, sort_order: e.target.value })}
                               min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-water/30 focus:border-water outline-none" />
                      </div>
                    </div>

                    {/* 文件上传 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">上传图片/视频</label>
                      <label className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-water transition-colors">
                        <Upload className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">{uploading ? '上传中...' : '点击选择文件（≤50MB）'}</span>
                        <input type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" disabled={uploading} />
                      </label>
                      {formData.src && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-gray-500 truncate flex-1">{formData.src}</span>
                            <button type="button" onClick={() => setFormData({ ...formData, src: '' })}
                                    className="text-xs text-red-500 hover:underline shrink-0">清除</button>
                          </div>
                      )}
                    </div>

                    {/* 跳转链接 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">跳转链接</label>
                      <input type="text" value={formData.link_url} placeholder="如 /recharge 或 https://..."
                             onChange={e => setFormData({ ...formData, link_url: e.target.value })}
                             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-water/30 focus:border-water outline-none" />
                      <p className="text-xs text-gray-500 mt-1">用户点击广告时跳转的目标地址</p>
                    </div>

                    {/* 占位背景色（无图片时使用） */}
                    {!formData.src && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">占位背景色</label>
                          <div className="grid grid-cols-3 gap-2">
                            {PRESET_COLORS.map(c => (
                                <button key={c.value} type="button"
                                        onClick={() => setFormData({ ...formData, bg_color: c.value })}
                                        className={`h-10 rounded-lg bg-gradient-to-br ${c.value} border-2 transition-all ${formData.bg_color === c.value ? 'border-water ring-2 ring-water/30' : 'border-transparent'}`}>
                                  <span className="text-white text-xs font-medium drop-shadow">{c.label}</span>
                                </button>
                            ))}
                          </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button type="button" onClick={() => setShowModal(false)}
                              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">取消</button>
                      <button type="submit"
                              className="flex-1 px-4 py-2 bg-water text-white rounded-lg hover:bg-water/90">保存</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}
