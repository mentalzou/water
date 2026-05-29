import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Droplets, CreditCard, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import BottomNav from '../../components/BottomNav';

interface RechargePackage {
  id: string;
  name: string;
  amount: number;
  discount_rate: number;
  description: string;
  sort_order: number;
}

interface UserRecharge {
  id: string;
  amount: number;
  discount_rate: number;
  paid_amount: number;
  remaining_balance: number;
  status: string;
  created_at: string;
  paid_at: string;
  package: RechargePackage;
}

export default function RechargePage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [activeRecharge, setActiveRecharge] = useState<UserRecharge | null>(null);
  const [rechargeHistory, setRechargeHistory] = useState<UserRecharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [packagesRes, activeRes, historyRes] = await Promise.all([
        api.get('/customers/recharge/packages'),
        api.get('/customers/recharge/active'),
        api.get('/customers/recharge/my-recharges?page=1&pageSize=10'),
      ]) as [any, any, any];

      if ((packagesRes as any).code === 200) {
        setPackages(packagesRes.data || []);
      }

      if ((activeRes as any).code === 200 && activeRes.data) {
        setActiveRecharge(activeRes.data);
      }

      if ((historyRes as any).code === 200) {
        setRechargeHistory(historyRes.data?.data || []);
      }
    } catch (error) {
      console.error('加载充值数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecharge() {
    if (!selectedPackage) {
      alert('请选择充值套餐');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/customers/recharge', {
        package_id: selectedPackage,
      }) as any;

      if (res.code === 200) {
        alert('充值成功！');
        await loadData();
        setSelectedPackage('');
      } else {
        alert(res.message || '充值失败');
      }
    } catch (error: any) {
      alert(error.message || '充值失败');
    } finally {
      setSubmitting(false);
    }
  }

  const getDiscountText = (rate: number) => {
    return `${(rate * 10).toFixed(1)}折`;
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-water-light/30 border-t-water rounded-full animate-spin" />
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">充值中心</h1>
          </div>
        </header>

        <main className="px-4 py-4 space-y-4">
          {/* 当前有效充值 */}
          {activeRecharge && (
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    当前套餐
                  </h3>
                  <span className="px-3 py-1 bg-white/20 rounded-full text-xs">生效中</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">套餐名称</span>
                    <span className="font-medium">{activeRecharge.package.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">充值金额</span>
                    <span className="font-medium">¥{activeRecharge.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">优惠折扣</span>
                    <span className="font-bold text-yellow-300">{getDiscountText(activeRecharge.discount_rate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">剩余余额</span>
                    <span className="font-bold text-xl">¥{activeRecharge.remaining_balance.toFixed(2)}</span>
                  </div>
                </div>
              </div>
          )}

          {/* 充值套餐列表 */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-water" />
              选择充值套餐
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {packages.map((pkg) => (
                  <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg.id)}
                      className={`relative bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${
                          selectedPackage === pkg.id
                              ? 'border-water shadow-md'
                              : 'border-gray-200 hover:border-water/50'
                      }`}
                  >
                    {selectedPackage === pkg.id && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle2 className="w-6 h-6 text-water" />
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{pkg.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-water">
                          ¥{pkg.amount}
                        </div>
                        <div className="text-sm font-semibold text-orange-500 mt-1">
                          享{getDiscountText(pkg.discount_rate)}
                        </div>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>

          {/* 充值按钮 */}
          {selectedPackage && (
              <button
                  onClick={handleRecharge}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-water-light to-water text-white py-4 rounded-2xl font-semibold text-lg shadow-lg shadow-water/30 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '充值中...' : '立即充值'}
              </button>
          )}

          {/* 充值记录 */}
          {rechargeHistory.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-water" />
                  充值记录
                </h2>
                <div className="space-y-2">
                  {rechargeHistory.map((record) => (
                      <div key={record.id} className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-800">{record.package.name}</span>
                          <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                  record.status === 'active'
                                      ? 'bg-green-100 text-green-600'
                                      : record.status === 'expired'
                                          ? 'bg-gray-100 text-gray-500'
                                          : 'bg-red-100 text-red-600'
                              }`}
                          >
                      {record.status === 'active' ? '生效中' : record.status === 'expired' ? '已过期' : '已退款'}
                    </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>充值 ¥{record.amount.toFixed(2)}</span>
                          <span>{new Date(record.created_at!).toLocaleDateString()}</span>
                        </div>
                      </div>
                  ))}
                </div>
              </div>
          )}

          {/* 说明 */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              充值说明
            </h3>
            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>充值后立即可享受对应折扣优惠</li>
              <li>折扣适用于所有订水订单</li>
              <li>充值余额不可提现，仅用于消费抵扣</li>
              <li>每个用户同时只能有一个生效的充值套餐</li>
              <li>新充值将覆盖旧的充值套餐</li>
            </ul>
          </div>
        </main>

        <BottomNav />
      </div>
  );
}
