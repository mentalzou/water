import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, Clock, Sparkles } from 'lucide-react';
import { customerApi } from '../../api/customer.api';
import BottomNav from '../../components/BottomNav';

interface RechargePackage {
  id: string;
  name: string;
  amount: number;
  bonus_amount: number;
  description: string;
  sort_order: number;
}

interface UserRecharge {
  id: string;
  amount: number;
  bonus_amount: number;
  paid_amount: number;
  remaining_balance: number;
  bonus_balance: number;
  status: string;
  created_at: string;
  paid_at: string;
  package: RechargePackage;
}

interface UserBalance {
  total_principal: number;
  total_bonus: number;
  total_balance: number;
  recharge_count: number;
  active_recharges: UserRecharge[];
}

export default function RechargePage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<RechargePackage[]>([]);
  const [activeRecharge, setActiveRecharge] = useState<UserRecharge | null>(null);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [rechargeHistory, setRechargeHistory] = useState<UserRecharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const packagesRes: any = await customerApi.getRechargePackages();
      if (packagesRes.code === 200) {
        setPackages(packagesRes.data || []);
      }

      const token = localStorage.getItem('customer_token');
      if (token) {
        const [balanceRes, historyRes] = await Promise.all([
          customerApi.getUserBalance(),
          customerApi.getMyRecharges(),
        ]) as [any, any];

        if ((balanceRes as any).code === 200 && balanceRes.data) {
          setUserBalance(balanceRes.data);
          if (balanceRes.data.active_recharges?.length > 0) {
            setActiveRecharge(balanceRes.data.active_recharges[0]);
          }
        }

        if ((historyRes as any).code === 200) {
          setRechargeHistory(historyRes.data?.data || []);
        }
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

    const token = localStorage.getItem('customer_token');
    if (!token) {
      navigate(`/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true });
      return;
    }

    setSubmitting(true);
    try {
      const rechargeRes: any = await customerApi.recharge(selectedPackage);
      if (!rechargeRes.data?.id) {
        alert(rechargeRes.message || '创建充值订单失败');
        setSubmitting(false);
        return;
      }

      const rechargeId = rechargeRes.data.id;
      const user = JSON.parse(localStorage.getItem('customer_user') || '{}');
      const openId = user.open_id || user.openId || '';

      if (!openId) {
        const payRes: any = await customerApi.payForRecharge(rechargeId);
        if (payRes.code === 200) {
          alert('充值成功！（模拟模式）');
          await loadData();
          setSelectedPackage('');
        } else {
          alert(payRes.message || '支付失败');
        }
        setSubmitting(false);
        return;
      }

      const payRes: any = await customerApi.createRechargePayment({
        rechargeId,
        openId,
      });

      if (payRes.code !== 200 || !payRes.data?.jsApiParameters) {
        alert(payRes.message || '创建支付订单失败');
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      invokeWechatPay(payRes.data.jsApiParameters, rechargeId);
    } catch (error: any) {
      alert(error.message || '充值失败');
      setSubmitting(false);
    }
  }

  function invokeWechatPay(jsApiParameters: string, rechargeId: string) {
    const params = JSON.parse(jsApiParameters);

    function onReady() {
      WeixinJSBridge.invoke(
        'getBrandWCPayRequest',
        {
          appId: params.appId,
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType,
          paySign: params.paySign,
        },
        async (res: any) => {
          if (res.err_msg === 'get_brand_wcpay_request:ok') {
            alert('充值成功！');
            await loadData();
            setSelectedPackage('');
          } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
            alert('支付已取消');
          } else {
            alert('支付失败：' + res.err_msg);
          }
        }
      );
    }

    if (typeof WeixinJSBridge === 'undefined') {
      if (document.addEventListener) {
        document.addEventListener('WeixinJSBridgeReady', onReady, false);
      } else if ((document as any).attachEvent) {
        (document as any).attachEvent('WeixinJSBridgeReady', onReady);
        (document as any).attachEvent('onWeixinJSBridgeReady', onReady);
      }
    } else {
      onReady();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5" />
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-water-light/30 border-t-water rounded-full animate-spin" />
        </div>
        <BottomNav />
      </div>
    );
  }

  const selectedPkg = packages.find(p => p.id === selectedPackage);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">充值中心</h1>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">

        {/* 当前余额卡片 */}
        {userBalance && userBalance.total_balance > 0 && (
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white/70 text-xs">
                账户余额
                {userBalance.recharge_count > 1 && (
                  <span className="ml-1">（{userBalance.recharge_count}笔充值累加）</span>
                )}
              </span>
              <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-[11px]">生效中</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold">¥{userBalance.total_balance.toFixed(2)}</span>
              {userBalance.total_bonus > 0 && (
                <span className="text-yellow-200 text-xs">含赠送 ¥{userBalance.total_bonus.toFixed(2)}</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-white/60">
              <span>本金 ¥{userBalance.total_principal.toFixed(0)}</span>
              <span>赠送 ¥{userBalance.total_bonus.toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* 充值套餐 */}
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-water" />
            选择充值套餐
          </h2>

          <div className="grid grid-cols-2 gap-2.5">
            {packages.map((pkg) => {
              const isSelected = selectedPackage === pkg.id;
              const bonus = pkg.bonus_amount || 0;
              const totalAmount = pkg.amount + bonus;

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackage(isSelected ? '' : pkg.id)}
                  className={`relative bg-white rounded-xl p-3 border-2 cursor-pointer transition-all active:scale-[0.97] ${
                    isSelected
                      ? 'border-water shadow-md shadow-water/15'
                      : 'border-gray-100 hover:border-water/40'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-water rounded-full flex items-center justify-center shadow">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* 金额 */}
                  <div className="text-center mb-2">
                    <span className="text-2xl font-extrabold text-water">¥{pkg.amount}</span>
                    {bonus > 0 && (
                      <span className="ml-1 inline-block px-1.5 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded">
                        +{bonus}
                      </span>
                    )}
                  </div>

                  {/* 名称 */}
                  <div className="text-center text-xs font-medium text-gray-700 mb-1">
                    {pkg.name.replace('充值', '').replace('元套餐', '').replace('套餐', '')}
                  </div>

                  {/* 到账 */}
                  <div className="text-center text-[11px] text-gray-400">
                    到账 <span className="font-semibold text-gray-600">¥{totalAmount}</span>
                  </div>

                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-water/15 text-[10px] text-water text-center font-medium">
                      已选中
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 充值按钮 */}
        {selectedPkg && (
          <button
            onClick={handleRecharge}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-water-light to-water text-white py-3.5 rounded-2xl font-semibold text-base shadow-lg shadow-water/30 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              '支付中...'
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                立即充值 ¥{selectedPkg.amount}
              </>
            )}
          </button>
        )}

        {/* 充值记录 */}
        {rechargeHistory.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-water" />
              充值记录
            </h2>
            <div className="space-y-2">
              {rechargeHistory.slice(0, 5).map((record) => (
                <div key={record.id} className="bg-white rounded-xl px-4 py-3 border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700">{record.package?.name || '充值套餐'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(record.created_at!).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-800">¥{record.amount.toFixed(0)}</div>
                    <span className={`text-[11px] ${
                      record.status === 'active' ? 'text-green-500' : record.status === 'expired' ? 'text-gray-400' : 'text-red-500'
                    }`}>
                      {record.status === 'active' ? '生效中' : record.status === 'expired' ? '已过期' : '已退款'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 温馨提示 */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="text-xs text-gray-500 space-y-1.5">
            <div className="flex items-start gap-1.5">
              <span className="text-water font-bold shrink-0">•</span>
              <span>充值即送额外金额，多充多送，赠送金优先抵扣消费</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-water font-bold shrink-0">•</span>
              <span>余额可累加使用，不可提现不可转赠</span>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
