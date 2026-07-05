import { useState, useEffect } from 'react';
import { Search, Package, Eye, RefreshCw, Undo2, SearchCheck, UserCheck, Download, XCircle } from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';

const API_BASE = '/api';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'bg-gray-100 text-gray-700' },
  paid: { label: '已付款', color: 'bg-blue-100 text-blue-700' },
  pending_delivery: { label: '待派送', color: 'bg-purple-100 text-purple-700' },
  refunding: { label: '退款中', color: 'bg-yellow-100 text-yellow-700' },
  refunded: { label: '已退款', color: 'bg-red-100 text-red-700' },
  assigned: { label: '待配送', color: 'bg-orange-100 text-orange-700' },
  delivering: { label: '配送中', color: 'bg-indigo-100 text-indigo-700' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '已关闭', color: 'bg-gray-200 text-gray-500' },
};

const payMethodMap: Record<string, string> = {
  online: '在线支付',
  balance: '账户余额',
  mixed: '混合支付',
};

export default function OrderManage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // 搜索条件
  const [search, setSearch] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  // 下拉选项
  const [distributors, setDistributors] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [deliverymen, setDeliverymen] = useState<{ id: string; name: string }[]>([]);
  const [distributorFilter, setDistributorFilter] = useState('');
  const [deliverymanFilter, setDeliverymanFilter] = useState('');
  // 详情弹窗
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  // 交易查询中
  const [queryingOrders, setQueryingOrders] = useState<Set<string>>(new Set());
  // 退款中
  const [refundingOrders, setRefundingOrders] = useState<Set<string>>(new Set());
  // 退款查询中
  const [refundQueryingOrders, setRefundQueryingOrders] = useState<Set<string>>(new Set());
  // 关闭订单中
  const [closingOrders, setClosingOrders] = useState<Set<string>>(new Set());
  // 分配派送员中
  const [assigningOrders, setAssigningOrders] = useState<Set<string>>(new Set());
  // 分配派送员弹窗 { orderId, orderNo }
  const [assignModal, setAssignModal] = useState<{ orderId: string; orderNo: string; currentDeliverymanName: string } | null>(null);
  const [selectedDeliverymanId, setSelectedDeliverymanId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadOrders();
    loadDistributors();
    loadDeliverymen();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), _t: String(Date.now()) });
      if (statusFilter) params.set('status', statusFilter);
      if (distributorFilter) params.set('distributor_id', distributorFilter);
      if (deliverymanFilter) params.set('deliveryman_id', deliverymanFilter);
      if (search.trim()) params.set('keyword', search.trim());
      if (addressSearch.trim()) params.set('address', addressSearch.trim());

      const res = await apiFetch(`${API_BASE}/admin/orders?${params}`);
      if (res && res.code === 200) {
        setOrders(res.data?.data || res.data || []);
        setTotal(res.pagination?.total || 0);
      }
    } catch (e: any) {
      if (e.message !== '登录已过期，请重新登录') {
        console.error('[加载订单]', e);
      }
    } finally {
      setLoading(false);
    }
  }

  /** 按当前筛选条件导出 CSV */
  async function exportOrders() {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (distributorFilter) params.set('distributor_id', distributorFilter);
      if (deliverymanFilter) params.set('deliveryman_id', deliverymanFilter);
      if (search.trim()) params.set('keyword', search.trim());
      if (addressSearch.trim()) params.set('address', addressSearch.trim());

      const res: Response = await apiFetch(`${API_BASE}/admin/orders/export?${params}`, { rawResponse: true });
      if (!res.ok) {
        alert('导出失败，请重试');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // 从 Content-Disposition 头取文件名，兼容后端动态命名
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const n = new Date(); a.download = match?.[1] || `order_export_${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      if (e.message !== '登录已过期，请重新登录') {
        alert('导出失败: ' + (e.message || '网络错误'));
      }
    } finally {
      setExporting(false);
    }
  }

  async function loadDistributors() {
    try {
      const res = await apiFetch(`${API_BASE}/admin/distributors`);
      if (res && res.code === 200 && Array.isArray(res.data)) {
        setDistributors((res.data.data || res.data).map((d: any) => ({
          id: d.id,
          name: d.name || d.user_name || d.shop_name || d.phone,
          code: d.code,
        })));
      }
    } catch { /* ignore */ }
  }

  async function loadDeliverymen() {
    try {
      const res = await apiFetch(`${API_BASE}/admin/deliverymen`);
      if (res && res.code === 200 && Array.isArray(res.data)) {
        setDeliverymen((res.data.data || res.data).map((d: any) => ({ id: d.id, name: d.name })));
      }
    } catch { /* ignore */ }
  }

  /** 向合利宝查询退款状态 */
  async function queryRefund(order: any) {
    setRefundQueryingOrders(prev => new Set(prev).add(order.id));
    try {
      const res = await apiFetch(`${API_BASE}/admin/orders/${order.id}/query-refund`, { method: 'POST' });
      if (res && res.code === 200) {
        alert(res.data?.message || res.message || '查询完成');
        if (res.data?.localStatus === 'refunded') {
          loadOrders();
        }
      } else {
        alert(res?.message || '退款查询失败');
      }
    } catch (e: any) {
      if (e.message !== '登录已过期，请重新登录') {
        alert('退款查询失败: ' + (e.message || '网络错误'));
      }
    } finally {
      setRefundQueryingOrders(prev => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  }

  /** 关闭未支付订单，释放冻结库存 */
  async function closeOrderHandler(order: any) {
    if (!confirm(`确定要关闭该订单吗？\n\n订单号：${order.order_no}\n金额：¥${Number(order.total_amount || 0).toFixed(2)}\n\n关闭后将释放冻结库存。`)) return;

    setClosingOrders(prev => new Set(prev).add(order.id));
    try {
      const res = await apiFetch(`${API_BASE}/admin/orders/${order.id}/close`, { method: 'POST' });
      if (res && res.code === 200) {
        alert(res.message || '订单已关闭');
        loadOrders();
      } else {
        alert(res?.message || '关闭订单失败');
      }
    } catch (e: any) {
      if (e.message !== '登录已过期，请重新登录') {
        alert('关闭订单失败: ' + (e.message || '网络错误'));
      }
    } finally {
      setClosingOrders(prev => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  }

  /** 向合利宝发起退款 */
  async function requestRefund(order: any) {
    if (!confirm(`确定要对该订单发起退款吗？\n\n订单号：${order.order_no}\n金额：¥${Number(order.total_amount || 0).toFixed(2)}\n\n退款请求提交后将不可撤销。`)) return;

    setRefundingOrders(prev => new Set(prev).add(order.id));
    try {
      const res = await apiFetch(`${API_BASE}/admin/orders/${order.id}/refund`, { method: 'POST' });
      if (res && res.code === 200) {
        alert(res.data?.message || res.message || '退款请求已提交');
        loadOrders();
      } else {
        alert(res?.message || '退款请求失败');
      }
    } catch (e: any) {
      if (e.message !== '登录已过期，请重新登录') {
        alert('退款请求失败: ' + (e.message || '网络错误'));
      }
    } finally {
      setRefundingOrders(prev => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  }

  /** 向合利宝查询交易状态 */
  async function queryPayment(order: any) {
    setQueryingOrders(prev => new Set(prev).add(order.id));
    try {
      const res = await apiFetch(`${API_BASE}/admin/orders/${order.id}/query-payment`, { method: 'POST' });
      if (res && res.code === 200) {
        alert(res.data?.message || res.message || '查询完成');
        // 如果支付成功，刷新列表
        if (res.data?.localStatus === 'paid') {
          loadOrders();
        }
      } else {
        alert(res?.message || '查询失败');
      }
    } catch (e: any) {
      if (e.message !== '登录已过期，请重新登录') {
        alert('查询失败: ' + (e.message || '网络错误'));
      }
    } finally {
      setQueryingOrders(prev => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  }

  /** 手动分配派送员 */
  async function assignDeliveryman(orderId: string) {
    if (!selectedDeliverymanId) {
      alert('请选择派送员');
      return;
    }
    setAssigningOrders(prev => new Set(prev).add(orderId));
    try {
      const res = await apiFetch(`${API_BASE}/admin/orders/${orderId}/assign-deliveryman`, {
        method: 'POST',
        body: JSON.stringify({ deliveryman_id: selectedDeliverymanId }),
      });
      console.log('[分配派送员] 响应:', res);
      if (res && res.code === 200) {
        alert(res.message || '分配成功');
        setAssignModal(null);
        setSelectedDeliverymanId('');
        // 如果当前筛选导致订单不可见，重置筛选条件
        if (statusFilter && (res.data?.status || '') !== statusFilter) {
          setStatusFilter('');
          setPage(1);
        }
        loadOrders();
      } else {
        alert(res?.message || '分配失败');
      }
    } catch (e: any) {
      if (e.message !== '登录已过期，请重新登录') {
        alert('分配失败: ' + (e.message || '网络错误'));
      }
    } finally {
      setAssigningOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }

  /** 筛选条件变化时重新请求 */
  useEffect(() => { setPage(1); loadOrders(); }, [statusFilter, distributorFilter, deliverymanFilter, search, addressSearch]);
  useEffect(() => { loadOrders(); }, [page, pageSize]);

  const totalPages = Math.ceil(total / pageSize);

  return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8"><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Package className="w-7 h-7 text-water" /> 订单管理</h1><p className="text-gray-500 mt-1">查看和管理所有订单</p></div>

        {/* Filters */}
        <div className="flex gap-4 mb-6 flex-wrap items-end">
          {/* 关键词搜索 */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜索订单号、客户姓名或手机号..."
              className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 ring-water/30" />
          </div>
          {/* 地址搜索 */}
          <div className="relative min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={addressSearch} onChange={e=>setAddressSearch(e.target.value)} placeholder="收货地址模糊搜索..."
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 ring-water/30 text-sm" />
          </div>
          {/* 分销商筛选 */}
          <select value={distributorFilter} onChange={e=>setDistributorFilter(e.target.value)}
            className="px-4 py-3 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 ring-water/30 text-sm text-gray-600 min-w-[140px]">
            <option value="">全部分销商</option>
            {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {/* 派送员筛选 */}
          <select value={deliverymanFilter} onChange={e=>setDeliverymanFilter(e.target.value)}
            className="px-4 py-3 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 ring-water/30 text-sm text-gray-600 min-w-[120px]">
            <option value="">全部派送员</option>
            {deliverymen.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {/* 状态筛选 */}
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 ring-water/30 text-sm text-gray-600 min-w-[120px]">
            <option value="">全部状态</option>
            <option value="pending">待支付</option>
            <option value="paid">已付款</option>
            <option value="pending_delivery">待派送</option>
            <option value="refunding">退款中</option>
            <option value="refunded">已退款</option>
            <option value="cancelled">已关闭</option>
            <option value="assigned">待配送</option>
            <option value="delivering">配送中</option>
            <option value="completed">已完成</option>
          </select>
          {/* 导出按钮 */}
          <button
            onClick={exportOrders}
            disabled={exporting}
            className="px-5 py-3 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-emerald-200"
          >
            {exporting ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 导出中...</>
            ) : (
              <><Download className="w-4 h-4" /> 导出报表</>
            )}
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-gray-50/80 border-b border-gray-100">
              {['订单号','客户','手机号','地址','预约时间','商品明细','金额','支付方式','分销商','派送员','状态','操作'].map(h => (<th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={12} className="py-16 text-center"><div className="w-8 h-8 border-3 border-water/30 border-t-water rounded-full animate-spin mx-auto" /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={12} className="py-16 text-center text-gray-400">暂无订单数据</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3.5 text-xs font-mono text-gray-600">{o.order_no}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-800">{o.customer_name}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-500">{o.customer_phone}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-500 max-w-[160px] truncate" title={o.address}>{o.address}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                    {o.delivery_date || '-'}{(o.delivery_date && o.delivery_time) ? ' ' : ''}{o.delivery_time || ''}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-700 max-w-[200px]">
                    {o.items && o.items.length > 0
                      ? o.items.map((item: any, i: number) => (
                          <div key={i} className={i > 0 ? 'mt-1' : ''}>
                            <span className="font-medium">{item.product_name}</span>
                            <span className="text-gray-400"> ×{item.quantity}{item.unit || ''}</span>
                            <span className="text-gray-400 ml-1">¥{Number(item.unit_price || 0).toFixed(2)}</span>
                          </div>
                        ))
                      : (o.product_name || o.product?.name || '-')
                    }
                  </td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-gray-800">¥{Number(o.total_amount || o.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{payMethodMap[o.pay_method] || o.pay_method || '-'}</td>
                  <td className="px-4 py-3.5 text-sm text-purple-600">{o.distributor_name || o.distributor?.name || '-'}</td>
                  <td className="px-4 py-3.5 text-sm text-cyan-600">{o.deliveryman_name || o.deliveryman?.name || '-'}</td>
                  <td className="px-4 py-3.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusMap[o.status]?.color}`}>{statusMap[o.status]?.label || o.status}</span></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedOrder(o)} className="p-1.5 rounded-lg hover:bg-water/10 text-water transition-colors" title="查看详情"><Eye className="w-4 h-4"/></button>
                      {o.status === 'pending' && (
                        <button
                          onClick={() => queryPayment(o)}
                          disabled={queryingOrders.has(o.id)}
                          className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="向合利宝查询交易状态"
                        >
                          {queryingOrders.has(o.id) ? (
                            <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {o.status === 'pending' && (
                        <button
                          onClick={() => closeOrderHandler(o)}
                          disabled={closingOrders.has(o.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="关闭订单并释放冻结库存"
                        >
                          {closingOrders.has(o.id) ? (
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {(o.status === 'paid' || o.status === 'pending_delivery' || o.status === 'assigned') && (
                        <button
                          onClick={() => { setAssignModal({ orderId: o.id, orderNo: o.order_no, currentDeliverymanName: o.deliveryman?.name || '' }); setSelectedDeliverymanId(''); }}
                          disabled={assigningOrders.has(o.id)}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="分配派送员"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      {(o.status === 'paid' || o.status === 'pending_delivery') && (
                        <button
                          onClick={() => requestRefund(o)}
                          disabled={refundingOrders.has(o.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="向合利宝发起退款"
                        >
                          {refundingOrders.has(o.id) ? (
                            <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                          ) : (
                            <Undo2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {o.status === 'refunding' && (
                        <button
                          onClick={() => queryRefund(o)}
                          disabled={refundQueryingOrders.has(o.id)}
                          className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="向合利宝查询退款状态"
                        >
                          {refundQueryingOrders.has(o.id) ? (
                            <div className="w-4 h-4 border-2 border-yellow-300 border-t-yellow-500 rounded-full animate-spin" />
                          ) : (
                            <SearchCheck className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-400 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span>共 {total} 条记录</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white outline-none">
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}条/页</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">上一页</button>
              <span className="text-gray-500">{page}/{Math.max(totalPages, 1)}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">下一页</button>
            </div>
          </div>
        </div>

        {/* Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-start justify-center py-6 px-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto p-6 shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-5 sticky top-0 bg-white z-10 -mx-2 px-2 py-1">
                <div><h2 className="font-bold text-lg text-gray-800">订单详情</h2><p className="text-xs text-gray-400 font-mono mt-0.5">{selectedOrder.order_no}</p></div>
                <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="space-y-3 text-sm">
                {/* 基本信息 */}
                {[
                  ['客户姓名', selectedOrder.customer_name],
                  ['联系电话', selectedOrder.customer_phone],
                  ['收货地址', selectedOrder.address],
                  ['预约时间', [selectedOrder.delivery_date, selectedOrder.delivery_time].filter(Boolean).join(' ') || '-'],
                  ['订单金额', `¥${Number(selectedOrder.total_amount || selectedOrder.amount || 0).toFixed(2)}`],
                  ['配送费', `¥${Number(selectedOrder.delivery_fee || 0).toFixed(2)}`],
                  ['支付方式', payMethodMap[selectedOrder.pay_method] || selectedOrder.pay_method || '-'],
                  ['分销商', selectedOrder.distributor_name || selectedOrder.distributor?.name || '无'],
                  ['派送员', selectedOrder.deliveryman_name || selectedOrder.deliveryman?.name || '未分配'],
                  ['状态', statusMap[selectedOrder.status]?.label || selectedOrder.status],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-dashed border-gray-100 last:border-0">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-800">{val as string}</span>
                  </div>
                ))}

                {/* 商品信息：支持多商品，展示单价 */}
                {(selectedOrder.items && selectedOrder.items.length > 0) ? (
                  <div className="pt-1 space-y-2">
                    <span className="text-gray-400">商品信息</span>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      {selectedOrder.items.map((item: any, i: number) => (
                        <div key={i} className={`flex justify-between items-center text-xs ${i < selectedOrder.items.length - 1 ? 'pb-2 border-b border-dashed border-gray-200' : ''}`}>
                          <span className="text-gray-700 font-medium truncate max-w-[200px]">{item.product_name}</span>
                          <span className="text-gray-400 whitespace-nowrap">
                            ×{item.quantity}{item.unit || ''} 单价¥{Number(item.unit_price || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-xs pt-2 border-t border-dashed border-gray-200">
                        <span className="text-gray-400">合计</span>
                        <span className="font-bold text-gray-800">¥{Number(selectedOrder.total_amount || selectedOrder.amount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between py-2 border-b border-dashed border-gray-100 last:border-0">
                    <span className="text-gray-400">商品</span>
                    <span className="font-medium text-gray-800">{`${selectedOrder.product_name || selectedOrder.product?.name || '-'} × ${selectedOrder.quantity || 1}`}</span>
                  </div>
                )}

                <div className="pt-2 space-y-1">
                  <p className="text-xs text-gray-400">下单时间：{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString('zh-CN') : '-'}</p>
                  {selectedOrder.paid_at && selectedOrder.paid_at !== 'undefined' && <p className="text-xs text-gray-400">支付时间：{new Date(selectedOrder.paid_at).toLocaleString('zh-CN')}</p>}
                  {(selectedOrder.assigned_at && selectedOrder.assigned_at !== 'undefined') && <p className="text-xs text-gray-400">派送时间：{new Date(selectedOrder.assigned_at).toLocaleString('zh-CN')}</p>}
                  {(selectedOrder.delivered_at && selectedOrder.delivered_at !== 'undefined') && <p className="text-xs text-gray-400">送达时间：{new Date(selectedOrder.delivered_at).toLocaleString('zh-CN')}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assign Deliveryman Modal */}
        {assignModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center py-6 px-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto p-6 shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-5 sticky top-0 bg-white z-10 -mx-2 px-2 py-1">
                <div>
                  <h2 className="font-bold text-lg text-gray-800">分配派送员</h2>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{assignModal.orderNo}</p>
                  {assignModal.currentDeliverymanName && (
                    <p className="text-xs text-orange-500 mt-1">当前派送员：{assignModal.currentDeliverymanName}（可重新分配）</p>
                  )}
                </div>
                <button onClick={() => setAssignModal(null)} className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="space-y-4">
                <select
                  value={selectedDeliverymanId}
                  onChange={e => setSelectedDeliverymanId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 ring-water/30 text-sm"
                >
                  <option value="">-- 请选择派送员 --</option>
                  {deliverymen.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setAssignModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-500 text-sm hover:bg-gray-50 transition-colors">取消</button>
                  <button
                    onClick={() => assignDeliveryman(assignModal.orderId)}
                    disabled={!selectedDeliverymanId || assigningOrders.has(assignModal.orderId)}
                    className="flex-1 py-2.5 bg-water text-white rounded-xl text-sm font-medium hover:bg-water/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {assigningOrders.has(assignModal.orderId) ? '分配中...' : '确认分配'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
