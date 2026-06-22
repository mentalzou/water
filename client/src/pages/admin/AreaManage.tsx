import { useState, useEffect } from 'react';
import {
  MapPin, Plus, Edit2, Trash2, X, ChevronRight, ChevronDown,
  MapPinned, Building2, Home
} from 'lucide-react';
import {
  getRegions, createRegion, updateRegion, deleteRegion,
} from '../../api/admin.api';

interface RegionNode {
  id: string;
  name: string;
  parent_id: string | null;
  level: number; // 1=省 2=市 3=区
  sort_order: number;
  status: 'active' | 'inactive';
  children: RegionNode[];
  created_at: string;
}

const levelLabels = { 1: '省/直辖市', 2: '市', 3: '区/县' };
const levelIcons: Record<number, React.ReactNode> = {
  1: <MapPinned className="w-4 h-4" />,
  2: <Building2 className="w-4 h-4" />,
  3: <Home className="w-4 h-4" />,
};
const levelColors: Record<number, string> = {
  1: 'bg-rose-100 text-rose-700 border-rose-200',
  2: 'bg-blue-100 text-blue-700 border-blue-200',
  3: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export default function AreaManage() {
  const [tree, setTree] = useState<RegionNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Expand state: set of node IDs that are expanded
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [parentName, setParentName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<RegionNode | null>(null);

  useEffect(() => { loadTree(); }, []);

  async function loadTree() {
    setLoading(true);
    setError('');
    try {
      const res: any = await getRegions();
      if (res.code === 200) {
        setTree(res.data || []);
      } else {
        setError(res.message || '加载区域数据失败');
      }
    } catch (e: any) {
      setError(e.message || '网络异常');
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAddForm(pId?: string, pName?: string) {
    setFormMode('add');
    setEditId(null);
    setFormName('');
    setParentId(pId || '');
    setParentName(pName || '');
    setShowForm(true);
  }

  function openEditForm(node: RegionNode) {
    setFormMode('edit');
    setEditId(node.id);
    setFormName(node.name);
    setParentId(node.parent_id || '');
    setParentName('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setSubmitting(true);
    try {
      let res: any;
      if (formMode === 'add') {
        res = await createRegion({
          name: formName.trim(),
          parent_id: parentId || undefined,
        });
      } else {
        res = await updateRegion(editId!, { name: formName.trim() });
      }
      if (res.code === 200) {
        setShowForm(false);
        loadTree();
      } else {
        alert(res.message || '操作失败');
      }
    } catch (e: any) {
      alert(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete(node: RegionNode) {
    setDeleteTarget(node);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res: any = await deleteRegion(deleteTarget.id);
      if (res.code === 200) {
        setDeleteTarget(null);
        loadTree();
      } else {
        alert(res.message || '删除失败');
      }
    } catch (e: any) {
      alert(e.message || '删除失败');
    }
  }

  // Recursive tree node render
  function renderNode(node: RegionNode, depth: number) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isProvince = node.level === 1;
    const childCount = node.children?.length || 0;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 group transition-colors cursor-pointer ${
            !isProvince ? 'ml-6' : ''
          }`}
        >
          {/* Expand toggle */}
          <button
            onClick={() => hasChildren && toggleExpand(node.id)}
            className={`w-5 h-5 flex items-center justify-center rounded flex-shrink-0 ${
              hasChildren ? 'text-gray-400 hover:text-gray-600' : 'invisible'
            }`}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Icon by level */}
          <span className="flex-shrink-0">{levelIcons[node.level]}</span>

          {/* Name + badge */}
          <span className="font-medium text-gray-800 flex-1">{node.name}</span>
          {node.status === 'inactive' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">已停用</span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${levelColors[node.level]}`}>
            {levelLabels[node.level]}
          </span>
          {childCount > 0 && (
            <span className="text-xs text-gray-400">{childCount}</span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Add child (only if level < 3) */}
            {node.level < 3 && (
              <button
                onClick={(e) => { e.stopPropagation(); openAddForm(node.id, node.name); }}
                className="p-1 rounded hover:bg-green-50 text-green-500 transition-colors"
                title={`添加${levelLabels[node.level + 1]}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); openEditForm(node); }}
              className="p-1 rounded hover:bg-blue-50 text-blue-500 transition-colors"
              title="编辑"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); confirmDelete(node); }}
              className="p-1 rounded hover:bg-red-50 text-red-400 transition-colors"
              title="删除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Children (expanded) */}
        {hasChildren && isExpanded && (
          <div className="border-l-2 border-gray-100 ml-[12px]">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  // Count totals
  const provinceCount = tree.length;
  const cityCount = tree.reduce((s, p) => s + (p.children?.length || 0), 0);
  const districtCount = tree.reduce(
    (s, p) => s + (p.children || []).reduce((sc, c) => sc + (c.children?.length || 0), 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-7 h-7 text-water" /> 区域管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            管理省/市/区数据，配置后前端收货地址可级联选择
          </p>
        </div>
        <button
          onClick={() => openAddForm()}
          className="flex items-center gap-2 px-5 py-2.5 bg-water text-white rounded-xl hover:bg-water-dark shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" /> 添加省份
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-rose-600">{provinceCount}</p>
          <p className="text-xs text-gray-500">省/直辖市</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-600">{cityCount}</p>
          <p className="text-xs text-gray-500">市</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-emerald-600">{districtCount}</p>
          <p className="text-xs text-gray-500">区/县</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>
      )}

      {/* Tree */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-400">
            <div className="w-6 h-6 border-2 border-cyan-200 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : tree.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-4">暂未配置省市区数据</p>
            <button
              onClick={() => openAddForm()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-water text-white rounded-lg text-sm hover:bg-water-dark transition-colors"
            >
              <Plus className="w-4 h-4" /> 添加第一个省份
            </button>
          </div>
        ) : (
          <div className="py-2">
            {tree.map(node => renderNode(node, 0))}
          </div>
        )}
      </div>

      {/* Hint */}
      {tree.length > 0 && (
        <div className="mt-4 text-xs text-gray-400 flex items-center gap-4">
          <span>💡 点击展开箭头查看下级区域</span>
          <span>🖱 悬停节点显示操作按钮</span>
          <span>➕ 可逐级添加省/市/区</span>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-800">
                {formMode === 'add'
                  ? (parentId ? `添加${levelLabels[2]}下级` : '添加省份')
                  : '编辑区域'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {parentId && parentName && (
              <div className="mb-4 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                父级区域：<span className="font-medium text-gray-800">{parentName}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {formMode === 'add'
                    ? (parentId ? '市/区名称' : '省份名称')
                    : '区域名称'}
                </label>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ring-water/30"
                  placeholder={parentId ? '如：朝阳区' : '如：北京市'}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                  取消
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 bg-water text-white rounded-xl hover:bg-water-dark shadow-md disabled:opacity-50 transition-colors">
                  {submitting ? '提交中...' : (formMode === 'add' ? '添加' : '保存')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-2">确认删除</h2>
            <p className="text-sm text-gray-600 mb-1">
              确定要删除 <span className="font-medium text-gray-800">"{deleteTarget.name}"</span> 吗？
            </p>
            {deleteTarget.children && deleteTarget.children.length > 0 && (
              <p className="text-xs text-red-500 mt-1">
                ⚠️ 该节点下有 {deleteTarget.children.length} 个子区域，将一并删除。
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
