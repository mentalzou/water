import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Share2, Receipt, ShoppingBag, TrendingUp, Copy, Check } from 'lucide-react';
import { distributorApi } from '../../api/distributor.api';

function getDistributorUser(): any {
  try { return JSON.parse(localStorage.getItem('distributor_user') || '{}'); }
  catch { return {}; }
}

export default function DistributorDashboard() {
  const navigate = useNavigate();
  const user = getDistributorUser();
  const distributorId = user.distributorId || '';
  const [summary, setSummary] = useState<any>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (distributorId) loadSummary();
    loadShareLink();
  }, [distributorId]);

  async function loadSummary() {
    try {
      // 使用 token 认证的 API
      const token = localStorage.getItem('distributor_token') || '';
      const res: any = await fetch(
        `${import.meta.env.VITE_API_BASE || 'http://localhost:3001/api'}/distributors/${distributorId}/commission/summary`,
        { headers: { Authorization: `Bearer ${token}` } },
      ).then(r => r.json());
      if (res.code === 200) setSummary(res.data);
    } catch { /* dev mode */ }
  }

  async function loadShareLink() {
    try {
      const code = user.distributorCode || '';
      if (!code) return;
      setShareLink(`${window.location.origin}/?distributor_code=${code}`);
    } catch { /* fallback */ }
  }

  async function copyLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const menuItems = [
    { icon: ShoppingBag, label: '购买/充值', path: '/distributor/recharge', color: 'from-blue-500 to-cyan-400' },
    { icon: Share2, label: '推广分享', path: '/distributor/share', color: 'from-purple-500 to-pink-400' },
    { icon: Receipt, label: '佣金明细', path: '/distributor/commission', color: 'from-green-500 to-emerald-400' },
    { icon: TrendingUp, label: '订单记录', path: '/distributor/orders', color: 'from-orange-500 to-yellow-400' },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-water-light via-water to-teal-500 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <h1 className="text-lg font-bold text-white mb-1">欢迎回来，{user.name || '分销商'}</h1>
        <p className="text-white/70 text-sm">今日数据概览</p>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: '累计佣金', value: summary?.total_commission ? `¥${summary.total_commission}` : '¥0.00' },
            { label: '可提现', value: summary?.available_commission ? `¥${summary.available_commission}` : '¥0.00', accent: true },
            { label: '冻结中', value: summary?.frozen_commission ? `¥${summary.frozen_commission}` : '¥0.00' },
          ].map((item, i) => (
            <div key={i} className={`rounded-xl p-3 backdrop-blur-sm ${item.accent ? 'bg-white/20' : 'bg-white/10'}`}>
              <p className={`text-[11px] ${item.accent ? 'text-white font-medium' : 'text-white/70'}`}>{item.label}</p>
              <p className="font-bold mt-0.5 text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">快捷入口</h2>
        <div className="grid grid-cols-4 gap-3">
          {menuItems.map(({ icon: Icon, label, path, color }) => (
            <button key={path} onClick={() => navigate(path)}
              className="bg-white rounded-xl p-4 flex flex-col items-center gap-2.5 shadow-sm border border-gray-100 hover:shadow-md active:scale-[0.97] transition-all"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-gray-600">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Share Link */}
      {shareLink && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="w-4 h-4 text-water" />
            <span className="text-sm font-semibold text-gray-700">我的推广链接</span>
          </div>
          <div className="flex gap-2">
            <input readOnly value={shareLink}
              className="flex-1 px-3 py-2.5 bg-gray-50 rounded-xl text-xs text-gray-600 truncate outline-none"
              onClick={e => (e.target as HTMLInputElement).select()} />
            <button onClick={copyLink}
              className="px-4 py-2.5 bg-water text-white rounded-xl text-xs font-medium active:bg-water-dark transition-colors flex items-center gap-1"
            >
              {copied ? <><Check className="w-3 h-3" />已复制</> : <><Copy className="w-3 h-3" />复制</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
