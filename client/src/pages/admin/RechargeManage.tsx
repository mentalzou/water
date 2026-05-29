import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import api from '../../api/client';

interface RechargePackage {
  id: string;
  name: string;
  amount: number;
  discount_rate: number;
  description: string;
  status: 'active' | 'inactive';
  sort_order: number;
  created_at: string;
}

export default function RechargePackageManage() {
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<RechargePackage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    discount_rate: '',
    description: '',
    sort_order: '0',
  });

  useEffect(() => {
    loadPackages();
  }, []);

  async function loadPackages() {
    try {
      const res = await api.get('/admin/recharge/packages');
      if (res && res.code === 200) {
        setPackages(res.data?.data || res.data || []);
      }
    } catch (error) {
      console.error('加载充值套餐失败:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    setEditingPackage(null);
    setFormData({
      name: '',
      amount: '',
      discount_rate: '',
      description: '',
      sort_order: '0',
    });
    setShowModal(true);
  }

  function handleEdit(pkg: RechargePackage) {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      amount: pkg.amount.toString(),
      discount_rate: pkg.discount_rate.toString(),
      description: pkg.description || '',
      sort_order: pkg.sort_order?.toString() || '0',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name || !formData.amount || !formData.discount_rate) {
      alert('请填写必填项');
      return;
    }

    try {
      if (editingPackage) {
        // 更新套餐
        await api.put(`/admin/recharge/packages/${editingPackage.id}`, formData);
        alert('更新成功');
      } else {
        // 创建套餐
        await api.post('/admin/recharge/packages', formData);
        alert('创建成功');
      }

      setShowModal(false);
      await loadPackages();
    } catch (error: any) {
      alert(error.message || '操作失败');
    }
  }

  async function handleToggleStatus(pkg: RechargePackage) {
    try {
      const newStatus = pkg.status === 'active' ? 'inactive' : 'active';
      await api.put(`/admin/recharge/packages/${pkg.id}/status`, { status: newStatus });
      await loadPackages();
    } catch (error: any) {
      alert(error.message || '操作失败');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这个套餐吗？')) return;

    try {
      await api.delete(`/admin/recharge/packages/${id}`);
      await loadPackages();
      alert('删除成功');
    } catch (error: any) {
      alert(error.message || '删除失败');
    }
  }

  const getDiscountText = (rate: number) => {
    return `${(rate * 10).toFixed(1)}折`;
  };

  return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">充值套餐管理</h1>
            <p className="text-sm text-gray-500 mt-1">管理用户充值套餐和折扣配置</p>
          </div>
          <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-water text-white rounded-lg hover:bg-water/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增套餐
          </button>
        </div>

        {/* 说明 */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold mb-1">充值套餐说明：</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>用户充值后可享受对应折扣，适用于所有订水订单</li>
                <li>折扣率范围：0.1-1.0（1.0表示无折扣）</li>
                <li>每个用户同时只能有一个生效的充值套餐</li>
                <li>新充值将覆盖旧的充值套餐</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 套餐列表 */}
        {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-water-light/30 border-t-water rounded-full animate-spin" />
            </div>
        ) : packages.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <p className="text-gray-400">暂无充值套餐</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                  <div key={pkg.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{pkg.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                      </div>
                      <button
                          onClick={() => handleToggleStatus(pkg)}
                          className={`p-1 rounded ${
                              pkg.status === 'active' ? 'text-green-500' : 'text-gray-400'
                          }`}
                      >
                        {pkg.status === 'active' ? (
                            <ToggleRight className="w-6 h-6" />
                        ) : (
                            <ToggleLeft className="w-6 h-6" />
                        )}
                      </button>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">充值金额</span>
                        <span className="font-bold text-water text-lg">¥{pkg.amount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">优惠折扣</span>
                        <span className="font-bold text-orange-500">{getDiscountText(pkg.discount_rate)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">排序</span>
                        <span className="text-gray-700">{pkg.sort_order}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <button
                          onClick={() => handleEdit(pkg)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        编辑
                      </button>
                      <button
                          onClick={() => handleDelete(pkg.id)}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
              ))}
            </div>
        )}

        {/* 编辑/新增弹窗 */}
        {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    {editingPackage ? '编辑套餐' : '新增套餐'}
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        套餐名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="例如：充值200元套餐"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-water/30 focus:border-water outline-none"
                          required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        充值金额 <span className="text-red-500">*</span>
                      </label>
                      <input
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="200"
                          min="1"
                          step="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-water/30 focus:border-water outline-none"
                          required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        折扣率 <span className="text-red-500">*</span>
                      </label>
                      <input
                          type="number"
                          value={formData.discount_rate}
                          onChange={(e) => setFormData({ ...formData, discount_rate: e.target.value })}
                          placeholder="0.8 表示8折"
                          min="0.1"
                          max="1"
                          step="0.01"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-water/30 focus:border-water outline-none"
                          required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        当前设置：{formData.discount_rate ? getDiscountText(parseFloat(formData.discount_rate)) : '-'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        套餐描述
                      </label>
                      <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="套餐说明..."
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-water/30 focus:border-water outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        排序
                      </label>
                      <input
                          type="number"
                          value={formData.sort_order}
                          onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                          placeholder="0"
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-water/30 focus:border-water outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">数字越小越靠前</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                          type="button"
                          onClick={() => setShowModal(false)}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        取消
                      </button>
                      <button
                          type="submit"
                          className="flex-1 px-4 py-2 bg-water text-white rounded-lg hover:bg-water/90 transition-colors"
                      >
                        保存
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}
