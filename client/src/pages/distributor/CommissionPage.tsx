import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, TrendingUp } from 'lucide-react';
import { distributorApi } from '../../api/distributor.api';

export default function CommissionPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('distributor_user') || '{}');
    const distributorId = user.distributorId;
    if (!distributorId) { setLoading(false); return; }

    Promise.all([
      distributorApi.getCommissionRecords(distributorId),
      distributorApi.getCommissionSummary(distributorId),
    ]).then(([recRes, sumRes]: any[]) => {
      if (sumRes?.code === 200) setSummary(sumRes.data);
      if (recRes?.code === 200) setRecords(Array.isArray(recRes.data) ? recRes.data : recRes.data?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-primary-50">
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-8 px-5 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">佣金明细</h1>
        </div>
      </header>

      {/* Summary */}
      {summary && (
        <div className="px-4 -mt-2 relative z-10 mb-4">
          <div className="glass rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: '累计', value: `¥${(summary.total_commission || 0).toFixed(2)}` },
              { label: '可提现', value: `¥${(summary.available_commission || 0).toFixed(2)}`, accent: true },
              { label: '冻结', value: `¥${(summary.frozen_commission || 0).toFixed(2)}` },
            ].map((item, i) => (
              <div key={i} className={item.accent ? '' : ''}>
                <p className={`text-xs ${item.accent ? 'text-water font-semibold' : 'text-gray-400'}`}>{item.label}</p>
                <p className={`font-bold mt-0.5 ${item.accent ? 'text-lg text-water' : 'text-gray-700'}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="px-4 space-y-3 pb-8">
        <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-2"><Receipt className="w-4 h-4" /> 佣金记录</h3>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-water/30 border-t-water rounded-full animate-spin" /></div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">暂无佣金记录</p>
            <p className="text-gray-300 text-xs mt-1">分享链接给好友，他们下单后即可获得返佣</p>
          </div>
        ) : records.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-800">{r.commission_type === 'percentage' ? `${r.commission_rate}%` : '固定'} 返佣</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleString('zh-CN')}</p>
              <p className="text-xs text-gray-400">订单金额 ¥{r.order_amount.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${r.status === 'settled' ? 'bg-green-50 text-green-600' : r.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                {r.status === 'settled' ? '已结算' : r.status === 'pending' ? '待结算' : '已取消'}
              </span>
              <p className="text-lg font-bold text-green-500 mt-1.5">+¥{r.commission_amount.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
