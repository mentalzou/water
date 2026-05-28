import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Clock, Truck,
  CheckCircle2, Send, ArrowLeft
} from 'lucide-react';
import { customerApi } from '../../api/customer.api';
import BottomNav from '../../components/BottomNav';

const statusTabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待付款', icon: Clock },
  { key: 'paid', label: '待发货', icon: Package },
  { key: 'assigned', label: '待配送', icon: Send },
  { key: 'delivering', label: '待收货', icon: Truck },
  { key: 'completed', label: '已完成', icon: CheckCircle2 },
];

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待付款', color: 'text-orange-500 bg-orange-50' },
  paid: { label: '待发货', color: 'text-blue-500 bg-blue-50' },
  assigned: { label: '待配送', color: 'text-cyan-500 bg-cyan-50' },
  delivering: { label: '配送中', color: 'text-indigo-500 bg-indigo-50' },
  completed: { label: '已完成', color: 'text-green-500 bg-green-50' },
  cancelled: { label: '已取消', color: 'text-gray-400 bg-gray-100' },
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const user = JSON.parse(localStorage.getItem('customer_user') || '{}');
  const phone = user.phone;

  useEffect(() => {
    if (!phone) return;
    setLoading(true);
    customerApi.getMyOrders(phone).then((res: any) => {
      setOrders(Array.isArray(res.data) ? res.data : res.data?.data || []);
      setLoading(false);
    });
  }, [phone]);

  const filtered = activeTab === 'all'
      ? orders
      : orders.filter((o: any) => o.status === activeTab);

  return (
      <div className="min-h-screen bg-primary-50 pb-20">
        <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/profile')} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">我的订单</h1>
          </div>
        </header>

        <main className="px-4 py-4 pb-8">
          {/* 状态筛选 */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
            {statusTabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeTab === tab.key ? 'bg-water text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
                >
                  {tab.icon && <tab.icon className="w-3 h-3" />}
                  {tab.label}
                  {tab.key !== 'all' && (
                      <span className="ml-0.5 text-[10px] opacity-70">
                  ({orders.filter(o => o.status === tab.key).length})
                </span>
                  )}
                </button>
            ))}
          </div>

          {/* 订单列表 */}
          {loading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-water/30 border-t-water rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                暂无{activeTab !== 'all' ? statusTabs.find(t => t.key === activeTab)?.label : ''}订单
              </div>
          ) : (
              <div className="space-y-3">
                {filtered.map(order => {
                  const st = statusMap[order.status] || statusMap.pending;
                  return (
                      <div key={order.id} className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-gray-400">{order.order_no}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        </div>

                        {/* 商品列表 */}
                        <div className="mb-2 space-y-1">
                          {Array.isArray(order.items) && order.items.length > 0
                              ? order.items.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-gray-700 truncate">{item.product_name}</span>
                                    <span className="text-gray-400 ml-2 shrink-0">×{item.quantity}</span>
                                  </div>
                              ))
                              : <div className="flex justify-between text-sm"><span className="text-gray-700">{order.product_name || '商品'} ×{order.quantity}</span></div>
                          }
                        </div>

                        <div className="border-t border-dashed border-gray-100 pt-2 flex justify-between items-center">
                          <span className="text-xs text-gray-400">合计</span>
                          <span className="font-bold text-water">¥{Number(order.total_amount).toFixed(2)}</span>
                        </div>
                      </div>
                  );
                })}
              </div>
          )}
        </main>

        <BottomNav />
      </div>
  );
}
