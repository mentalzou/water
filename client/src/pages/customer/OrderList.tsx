import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, Package, Clock, CheckCircle2, Truck } from 'lucide-react';
import { customerApi } from '../../api/customer.api';
import BottomNav from '../../components/BottomNav';

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: '待支付', color: 'text-orange-500 bg-orange-50', icon: Clock },
  pending_delivery: { label: '待派送', color: 'text-blue-500 bg-blue-50', icon: Package },
  paid: { label: '已付款', color: 'text-blue-500 bg-blue-50', icon: Package },
  assigned: { label: '待配送', color: 'text-cyan-500 bg-cyan-50', icon: Truck },
  delivering: { label: '配送中', color: 'text-indigo-500 bg-indigo-50', icon: Truck },
  completed: { label: '已完成', color: 'text-green-500 bg-green-50', icon: CheckCircle2 },
};

export default function OrderList() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('customer_user') || '{}');
  const phone = (location.state as any)?.phone || user.phone || '';


  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (phone) {
      customerApi.getMyOrders(phone).then((res: any) => {
        setOrders(Array.isArray(res.data) ? res.data : res.data?.data || []);
        setLoading(false);
      });
    }
  }, [phone]);

  return (
      <div className="min-h-screen bg-primary-50 pb-20">
        {/* Header */}
        <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5 sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => window.history.back()} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">我的订单</h1>
          </div>
          <p className="text-white/70 text-sm">{phone ? `手机号：${phone}` : ''}</p>
        </header>

        {/* Content */}
        <main className="px-4 py-4 space-y-3 pb-8">
          {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-3 border-water-light/30 border-t-water rounded-full animate-spin" />
              </div>
          ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400">暂无订单</p>
              </div>
          ) : (
              orders.map((order) => {
                const status = statusMap[order.status] || statusMap.pending;
                const StatusIcon = status.icon;

                return (
                    <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{order.order_no}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleString('zh-CN')}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    <StatusIcon className="w-3 h-3" /> {status.label}
                  </span>
                      </div>

                      <div className="border-t border-dashed border-gray-100 pt-3 space-y-1.5">
                        {/* 多商品列表或单商品 */}
                        {Array.isArray(order.items) && order.items.length > 0 ? (
                            <div className="space-y-1.5">
                              {order.items.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-gray-400">商品</span>
                                    <span className="text-gray-700">{item.product_name} ×{item.quantity}</span>
                                  </div>
                              ))}
                            </div>
                        ) : (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">商品</span>
                              <span className="text-gray-700">{order.product_name || order.product_id} ×{order.quantity}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">收货地址</span>
                          <span className="text-gray-700 max-w-[200px] truncate text-right">{order.address}</span>
                        </div>
                        <div className="flex justify-between items-end pt-2">
                          <span className="text-xs text-gray-400">合计</span>
                          <span className="text-lg font-bold text-water">¥{order.total_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                );
              })
          )}
        </main>

        <BottomNav />
      </div>
  );
}
