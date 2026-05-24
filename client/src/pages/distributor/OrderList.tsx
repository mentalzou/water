import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle2, Truck, X, Phone as PhoneIcon, MapPin, ShoppingBag, Layers } from 'lucide-react';
import { customerApi } from '../../api/customer.api';

const statusMap: Record<string, { label: string; color: string; icon: any; bgColor: string }> = {
  pending: { label: '待支付', color: 'text-orange-600 bg-orange-100', icon: Clock, bgColor: 'bg-orange-50' },
  paid: { label: '已付款', color: 'text-blue-600 bg-blue-100', icon: Package, bgColor: 'bg-blue-50' },
  assigned: { label: '待配送', color: 'text-cyan-600 bg-cyan-100', icon: Truck, bgColor: 'bg-cyan-50' },
  delivering: { label: '配送中', color: 'text-indigo-600 bg-indigo-100', icon: Truck, bgColor: 'bg-indigo-50' },
  completed: { label: '已完成', color: 'text-green-600 bg-green-100', icon: CheckCircle2, bgColor: 'bg-green-50' },
};

/** 获取订单的商品摘要（用于列表展示） */
function getOrderSummary(order: any): { text: string; count: number } {
  if (order.items && order.items.length > 0) {
    const names = order.items.map((item: any) => item.product_name || item.product_id);
    const totalQty = order.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    
    if (order.items.length === 1) {
      return { 
        text: `${names[0]} ×${totalQty} ${order.items[0].unit || ''}`, 
        count: totalQty 
      };
    }
    return { text: `共 ${order.items.length} 种商品，${totalQty} 件`, count: totalQty };
  }
  
  // 兼容旧数据（没有 items 字段）
  return { 
    text: `${order.product_name || order.product_id || '未知商品'} ×${order.quantity || 1}`,
    count: order.quantity || 1
  };
}

export default function DistributorOrderList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('distributor_user') || '{}');
    if (user.distributorId) {
      customerApi.getOrdersByDistributorId(user.distributorId).then((res: any) => {
        setOrders(res.data || []);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // 查看订单详情
  const handleViewDetail = (order: any) => {
    setSelectedOrder(order);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-water-light to-water pt-6 pb-6 px-6">
        <h1 className="text-xl font-bold text-white">订单记录</h1>
        <p className="text-white/70 text-sm mt-1">共 {orders.length} 条订单</p>
      </header>

      {/* Content - Table */}
      <main className="px-4 py-4 pb-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-water-light/30 border-t-water rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm mt-4">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">暂无订单记录</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mt-4">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">订单号</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">商品信息</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">金额</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">状态</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">下单时间</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => {
                    const status = statusMap[order.status] || statusMap.pending;
                    const summary = getOrderSummary(order);
                    
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{order.order_no}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleString('zh-CN')}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {(order.items?.length > 1) ? (
                              <Layers className="w-4 h-4 text-water shrink-0" />
                            ) : (
                              <ShoppingBag className="w-4 h-4 text-gray-400 shrink-0" />
                            )}
                            <span className="text-gray-700">{summary.text}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-water">¥{order.total_amount.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(order.created_at).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleViewDetail(order)}
                            className="text-water hover:text-water/80 text-sm font-medium hover:underline"
                          >
                            查看详情
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-gray-100">
              {orders.map((order) => {
                const status = statusMap[order.status] || statusMap.pending;
                const summary = getOrderSummary(order);
                
                return (
                  <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{order.order_no}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleString('zh-CN')}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        {(order.items?.length > 1) ? (
                          <Layers className="w-4 h-4 text-water" />
                        ) : (
                          <ShoppingBag className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-gray-700">{summary.text}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
                        <span className="text-gray-400 text-sm">合计</span>
                        <span className="text-lg font-bold text-water">¥{order.total_amount.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewDetail(order)}
                      className="mt-3 w-full py-2 border border-water text-water rounded-lg text-sm font-medium hover:bg-water/5 transition-colors"
                    >
                      查看详情
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setSelectedOrder(null)}>
          <div 
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">订单详情</h2>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status & Order No */}
              <div className={`${(statusMap[selectedOrder.status] || statusMap.pending).bgColor} rounded-xl p-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">订单号</p>
                    <p className="font-bold text-gray-800 mt-1">{selectedOrder.order_no}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${(statusMap[selectedOrder.status] || statusMap.pending).color}`}>
                    {(statusMap[selectedOrder.status] || statusMap.pending).label}
                  </span>
                </div>
              </div>

              {/* Product Info - 支持多商品展示 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-water" /> 商品信息
                  {(selectedOrder.items?.length > 1) && (
                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      共 {selectedOrder.items.length} 种
                    </span>
                  )}
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item: any, index: number) => (
                      <div key={index} className={`flex items-start justify-between ${index < selectedOrder.items.length - 1 ? 'pb-3 border-b border-dashed border-gray-200' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800">{item.product_name || item.product_id}</p>
                          {item.unit && (
                            <p className="text-sm text-gray-500 mt-0.5">规格：{item.unit}</p>
                          )}
                        </div>
                        <div className="text-right ml-4 shrink-0">
                          <p className="text-sm text-gray-500">×{item.quantity}</p>
                          <p className="font-semibold text-water mt-1">¥{(item.subtotal || item.unit_price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    // 兼容旧数据
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{selectedOrder.product_name || selectedOrder.product_id}</p>
                        {selectedOrder.unit && (
                          <p className="text-sm text-gray-500 mt-0.5">规格：{selectedOrder.unit}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-500">×{selectedOrder.quantity || 1}</p>
                        <p className="font-semibold text-water mt-1">¥{selectedOrder.total_amount?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 显示分销商佣金 */}
                  {selectedOrder.distributor_commission > 0 && (
                    <div className="border-t border-dashed border-gray-200 pt-3 mt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">预估佣金收益</span>
                        <span className="font-bold text-green-600">+¥{selectedOrder.distributor_commission.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount Info */}
              <div className="border-t border-dashed border-gray-200 pt-4 space-y-2">
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <React.Fragment>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">商品种类</span>
                      <span className="text-gray-700">{selectedOrder.items.length} 种</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">商品总数</span>
                      <span className="text-gray-700">{selectedOrder.items.reduce((sum: number, item: any) => sum + item.quantity, 0)} 件</span>
                    </div>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">单价</span>
                      <span className="text-gray-700">¥{selectedOrder.unit_price?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">数量</span>
                      <span className="text-gray-700">{selectedOrder.quantity || 1} {selectedOrder.unit || ''}</span>
                    </div>
                  </React.Fragment>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                  <span className="text-gray-800">订单总额</span>
                  <span className="text-water">¥{selectedOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-water" /> 联系信息
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-gray-500 w-16">收货人：</span>
                    <span>{selectedOrder.customer_name || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-gray-500 w-16">手机号：</span>
                    <span>{selectedOrder.customer_phone}</span>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-water" /> 收货地址
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedOrder.address || '自提'}</p>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">订单进度</h3>
                <div className="space-y-3">
                  <div className={`flex items-center gap-3 text-sm ${selectedOrder.created_at ? 'text-gray-700' : 'text-gray-400'}`}>
                    <div className="w-2 h-2 rounded-full bg-water" />
                    <span>创建订单</span>
                    {selectedOrder.created_at && (
                      <span className="ml-auto text-gray-500 text-xs">{new Date(selectedOrder.created_at).toLocaleString('zh-CN')}</span>
                    )}
                  </div>
                  
                  {selectedOrder.paid_at && (
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>支付成功</span>
                      <span className="ml-auto text-gray-500 text-xs">{new Date(selectedOrder.paid_at).toLocaleString('zh-CN')}</span>
                    </div>
                  )}
                  
                  {selectedOrder.assigned_at && (
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                      <span>{selectedOrder.deliveryman_id ? '已分配配送员' : '等待分配配送员'}</span>
                      <span className="ml-auto text-gray-500 text-xs">{new Date(selectedOrder.assigned_at).toLocaleString('zh-CN')}</span>
                    </div>
                  )}
                  
                  {selectedOrder.delivered_at && selectedOrder.delivered_at.length > 0 && (
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>已完成配送</span>
                      <span className="ml-auto text-gray-500 text-xs">{new Date(selectedOrder.delivered_at).toLocaleString('zh-CN')}</span>
                    </div>
                  )}

                  {!selectedOrder.paid_at && (
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                      <span>待支付</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button (Mobile) */}
              <button
                onClick={() => setSelectedOrder(null)}
                className="sm:hidden w-full py-3 bg-gradient-to-r from-water-light to-water text-white rounded-xl font-semibold shadow-lg active:scale-[0.98] transition-transform"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
