import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, AlertCircle, Package, FileText, BarChart3 } from 'lucide-react';
import {
  getRechargeOrders,
  getRechargeStats,
  getRechargePackages,
  createRechargePackage,
  updateRechargePackage,
  updateRechargePackageStatus,
  deleteRechargePackage,
} from '../../api/admin.api';

interface RechargePackage {
  id: string;
  name: string;
  amount: number;
  bonus_amount: number;
  description: string;
  status: 'active' | 'inactive';
  sort_order: number;
  created_at: string;
}

interface RechargeOrder {
  id: string;
  user_name: string;
  user_phone: string;
  package_name: string;
  amount: number;
  bonus_amount: number;
  paid_amount: number;
  status: string;
  created_at: string;
  paid_at: string;
}

interface RechargeStats {
  totalRechargeAmount: number;
  totalBonusAmount: number;
  netRechargeIncome: number;
  totalConsumedBonus: number;
  bonusConsumptionRate: number;
}

const TABS = [
  { key: 'packages', label: '套餐管理', icon: Package },
  { key: 'orders', label: '充值订单', icon: FileText },
  { key: 'stats', label: '效益报表', icon: BarChart3 },
];

export default function RechargePackageManage() {
  const [activeTab, setActiveTab] = useState('packages');
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [rechargeOrders, setRechargeOrders] = useState<RechargeOrder[]>([]);
  const [stats, setStats] = useState<RechargeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<RechargePackage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    bonus_amount: '',
    description: '',
    sort_order: '0',
  });

  useEffect(() => {
    if (activeTab === 'packages') loadPackages();
    if (activeTab === 'orders') loadRechargeOrders();
    if (activeTab === 'stats') loadRechargeStats();
  }, [activeTab]);

  async function loadPackages() {
    setLoading(true);
    try {
      const res: any = await getRechargePackages();
      if (res && res.code === 200) {
        setPackages(res.data || []);
      }
    } catch (error) {
      console.error('加载充值套餐失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRechargeOrders(page = 1) {
    setLoading(true);
    try {
      const res: any = await getRechargeOrders({ page, pageSize: 20 });
      if (res.code === 200) {
        setRechargeOrders(res.data?.data || res.data || []);
        setOrdersTotal(res.pagination?.total || 0);
      }
    } catch (error) {
      console.error('加载充值订单失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRechargeStats() {
    setLoading(true);
    try {
      const res: any = await getRechargeStats();
      if (res.code === 200) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('加载充值统计失败:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    setEditingPackage(null);
    setFormData({
      name: '',
      amount: '',
      bonus_amount: '',
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
      bonus_amount: (pkg.bonus_amount || 0).toString(),
      description: pkg.description || '',
      sort_order: pkg.sort_order?.toString() || '0',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name || !formData.amount) {
      alert('请填写必填项');
      return;
    }

    try {
      if (editingPackage) {
        await updateRechargePackage(editingPackage.id, formData);
        alert('更新成功');
      } else {
        await createRechargePackage(formData);
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
      await updateRechargePackageStatus(pkg.id, newStatus);
      await loadPackages();
    } catch (error: any) {
      alert(error.message || '操作失败');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这个套餐吗？')) return;

    try {
      await deleteRechargePackage(id);
      await loadPackages();
      alert('删除成功');
    } catch (error: any) {
      alert(error.message || '删除失败');
    }
  }

  const getDiscountText = (rate: number) => {
    return `${(rate * 10).toFixed(1)}折`;
  };

  const getBonusText = (bonusAmount: number) => {
    if (!bonusAmount || bonusAmount <= 0) return null;
    return `送 ¥${bonusAmount.toFixed(0)}`;
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'active': return '已支付';
      case 'expired': return '已过期';
      case 'refunded': return '已退款';
      default: return '待支付';
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'expired': return 'bg-gray-100 text-gray-500';
      case 'refunded': return 'bg-red-100 text-red-600';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">充值管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理充值套餐、查看订单明细与活动效益</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-water shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: 套餐管理 */}
        {activeTab === 'packages' && (
          <>
        {/* 操作按钮 */}
        <div className="flex items-center justify-end">
          {!showModal && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-water text-white rounded-lg hover:bg-water/90 transition-colors"
            >
              <Plus className="w-4 h-4"/>
              新增套餐
            </button>
          )}
        </div>

        {/* 说明 */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5"/>
            <div className="text-sm text-blue-700">
              <p className="font-semibold mb-1">充值套餐说明：</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>用户充值后可获得本金 + 赠送金，赠送金优先抵扣消费</li>
                <li>每个档位可重复充值，均独立赠送，余额累加使用</li>
                <li>赠送金额可设为0，表示无赠送</li>
                <li>充值余额不可提现、不可转赠</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 套餐列表 */}
        {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-water-light/30 border-t-water rounded-full animate-spin"/>
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
                            <ToggleRight className="w-6 h-6"/>
                        ) : (
                            <ToggleLeft className="w-6 h-6"/>
                        )}
                      </button>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">充值金额</span>
                        <span className="font-bold text-water text-lg">¥{pkg.amount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">赠送金额</span>
                        <span className="font-bold text-orange-500">{getBonusText(pkg.bonus_amount) || '无'}</span>
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
                        <Edit2 className="w-4 h-4"/>
                        编辑
                      </button>
                      <button
                          onClick={() => handleDelete(pkg.id)}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
              ))}
            </div>
        )}
          </>
        )}

        {/* Tab: 充值订单 */}
        {activeTab === 'orders' && (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-3 border-water-light/30 border-t-water rounded-full animate-spin"/>
              </div>
            ) : rechargeOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                <p className="text-gray-400">暂无充值订单</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">用户</th>
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">套餐</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-medium">充值金额</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-medium">赠送金额</th>
                      <th className="text-center px-4 py-3 text-gray-500 font-medium">状态</th>
                      <th className="text-right px-4 py-3 text-gray-500 font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rechargeOrders.map((order, idx) => (
                      <tr key={order.id} className={`border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-800">{order.user_name || '--'}</span>
                          <span className="text-gray-400 ml-2">{order.user_phone}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{order.package_name}</td>
                        <td className="px-4 py-3 text-right font-medium">¥{order.amount?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-orange-500">¥{(order.bonus_amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(order.status)}`}>
                            {statusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ordersTotal > 20 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                    <span className="text-sm text-gray-500">共 {ordersTotal} 条</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setOrdersPage(Math.max(1, ordersPage - 1)); loadRechargeOrders(ordersPage - 1); }}
                        disabled={ordersPage <= 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                      >上一页</button>
                      <button
                        onClick={() => { setOrdersPage(ordersPage + 1); loadRechargeOrders(ordersPage + 1); }}
                        disabled={ordersPage * 20 >= ordersTotal}
                        className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
                      >下一页</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Tab: 效益报表 */}
        {activeTab === 'stats' && (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-3 border-water-light/30 border-t-water rounded-full animate-spin"/>
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">总充值金额</p>
                  <p className="text-3xl font-bold text-water">¥{stats.totalRechargeAmount.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">总赠送金额</p>
                  <p className="text-3xl font-bold text-orange-500">¥{stats.totalBonusAmount.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">净充值收入</p>
                  <p className="text-3xl font-bold text-green-600">¥{stats.netRechargeIncome.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">赠送金消耗总额</p>
                  <p className="text-3xl font-bold text-red-500">¥{stats.totalConsumedBonus.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">赠送金消耗率</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.bonusConsumptionRate}%</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                <p className="text-gray-400">暂无统计数据</p>
              </div>
            )}
          </>
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
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                          onChange={(e) => setFormData({...formData, amount: e.target.value})}
                          placeholder="200"
                          min="1"
                          step="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-water/30 focus:border-water outline-none"
                          required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        赠送金额
                      </label>
                      <input
                          type="number"
                          value={formData.bonus_amount}
                          onChange={(e) => setFormData({...formData, bonus_amount: e.target.value})}
                          placeholder="0 表示无赠送"
                          min="0"
                          step="1"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-water/30 focus:border-water outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.bonus_amount ? `用户充值 ¥${formData.amount || 0} 将获赠 ¥${formData.bonus_amount}` : '无赠送'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        套餐描述
                      </label>
                      <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                          onChange={(e) => setFormData({...formData, sort_order: e.target.value})}
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
