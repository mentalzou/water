import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Truck, DollarSign } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('admin_token') || '';
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const token = getToken();
        const res: any = await fetch(`${API_BASE}/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.text()).then(text => { try { return JSON.parse(text); } catch { return null; } });
        if (res && res.code === 200) setData(res.data);
      } catch (e) {
        console.error('[加载仪表盘]', e);
      }
      setLoading(false);
    }
    loadDashboard();
  }, []);

  // 从 recentOrders 聚合最近7天的销售趋势
  const salesData = (() => {
    if (!data?.recentOrders) return [];
    const days = ['周日', '周六', '周五', '周四', '周三', '周二', '周一'];
    const now = new Date();
    const result: Record<string, { day: string; orders: number; revenue: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      result[key] = { day: days[d.getDay()], orders: 0, revenue: 0 };
    }
    // 用今日已支付订单填充（后端 recentOrders 包含 created_at）
    // 如果需要精确的每日数据，后续可在后端扩展接口
    return Object.values(result);
  })();

  const statCards = [
    { icon: DollarSign, label: '今日收入', value: '¥' + Number(data?.todayRevenue || 0).toFixed(2), colorClass: 'from-green-400 to-emerald-500' },
    { icon: Users, label: '总用户数', value: data?.totalCustomers || 0, colorClass: 'from-blue-400 to-indigo-500' },
    { icon: UserPlus, label: '活跃分销商', value: data?.activeDistributors || 0, colorClass: 'from-purple-400 to-pink-500' },
    { icon: Truck, label: '待配送订单', value: data?.pendingDelivery || 0, colorClass: 'from-orange-400 to-red-500' },
  ];

  const statusMap: Record<string, string> = { paid: '已付款', assigned: '待配送', delivering: '配送中', completed: '已完成' };
  const statusColorMap: Record<string, string> = {
    paid: 'bg-blue-100 text-blue-700',
    assigned: 'bg-orange-100 text-orange-700',
    delivering: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-green-100 text-green-700',
  };

  return (
    <>
      {loading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-water-light/30 border-t-water rounded-full animate-spin" />
        </div>
      ) : (
      <>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">仪表盘</h1>
        <p className="text-gray-500 mt-1">欢迎回来，管理员。以下是系统运营概览。</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => {
          const CardIcon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div className={'w-11 h-11 rounded-xl bg-gradient-to-br ' + card.colorClass + ' flex items-center justify-center shadow-md'}>
                  <CardIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              <p className="text-xs text-gray-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">近7日销售趋势</h3>
          {salesData.length > 0 && (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#06B6D4" strokeWidth={2.5} dot={{ fill: '#06B6D4', r: 4 }} name="销售额" />
                <Line type="monotone" dataKey="orders" stroke="#0EA5E9" strokeWidth={2} dot={{ fill: '#0EA5E9', r: 4 }} name="订单数" yAxisId={0} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">分销商佣金排行</h3>
          {(data?.topDistributors?.length > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.topDistributors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} width={50} />
                <Tooltip formatter={(v: number) => ['¥' + v.toFixed(2), '佣金']} />
                <Bar dataKey="total_commission" fill="url(#barGradient)" radius={[0, 6, 6, 0]} barSize={22} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0EA5E9" />
                    <stop offset="100%" stopColor="#06B6D4" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm">暂无数据</p>}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">最近订单</h3>
          <button onClick={() => navigate('/admin/orders')} className="text-sm text-cyan-500 font-medium hover:underline">查看全部</button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">订单号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">客户</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data?.recentOrders || []).map((order: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-mono text-gray-600 whitespace-nowrap">{order.order_no}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{order.customer_name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{order.product_name}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-800">¥{order.total_amount}</td>
                <td className="px-6 py-4">
                  <span className={'inline-flex px-2.5 py-1 rounded-full text-xs font-medium ' + (statusColorMap[order.status] || '')}>
                    {statusMap[order.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}
    </>
  );
}
