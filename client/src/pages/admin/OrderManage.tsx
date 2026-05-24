import { useState, useEffect } from 'react';
import { Search, Package, Eye, Filter } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

function getToken(): string {
  return localStorage.getItem('admin_token') || '';
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'bg-gray-100 text-gray-700' },
  paid: { label: '已付款', color: 'bg-blue-100 text-blue-700' },
  assigned: { label: '待配送', color: 'bg-orange-100 text-orange-700' },
  delivering: { label: '配送中', color: 'bg-indigo-100 text-indigo-700' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
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

  useEffect(() => {
    loadOrders();
    loadDistributors();
    loadDeliverymen();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      const token = getToken();
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (distributorFilter) params.set('distributor_id', distributorFilter);
      if (deliverymanFilter) params.set('deliveryman_id', deliverymanFilter);
      if (search.trim()) params.set('keyword', search.trim());
      if (addressSearch.trim()) params.set('address', addressSearch.trim());

      const res: any = await fetch(`${API_BASE}/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); } catch { return null; }
      });
      if (res && res.code === 200) {
        setOrders(res.data?.data || res.data || []);
      }
    } catch (e) {
      console.error('[加载订单]', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadDistributors() {
    try {
      const token = getToken();
      const res: any = await fetch(`${API_BASE}/admin/distributors`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); } catch { return null; }
      });
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
      const token = getToken();
      const res: any = await fetch(`${API_BASE}/admin/deliverymen`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.text()).then(text => {
        try { return JSON.parse(text); } catch { return null; }
      });
      if (res && res.code === 200 && Array.isArray(res.data)) {
        setDeliverymen((res.data.data || res.data).map((d: any) => ({ id: d.id, name: d.name })));
      }
    } catch { /* ignore */ }
  }

  /** 筛选条件变化时重新请求 */
  useEffect(() => { loadOrders(); }, [statusFilter, distributorFilter, deliverymanFilter, search, addressSearch]);

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
            <option value="assigned">待配送</option>
            <option value="delivering">配送中</option>
            <option value="completed">已完成</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead><tr className="bg-gray-50/80 border-b border-gray-100">
              {['订单号','客户','手机号','地址','商品','数量','金额','分销商','派送员','状态','操作'].map(h => (<th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={11} className="py-16 text-center"><div className="w-8 h-8 border-3 border-water/30 border-t-water rounded-full animate-spin mx-auto" /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={11} className="py-16 text-center text-gray-400">暂无订单数据</td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3.5 text-xs font-mono text-gray-600">{o.order_no}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-800">{o.customer_name}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-500">{o.customer_phone}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-500 max-w-[160px] truncate" title={o.address}>{o.address}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-700">{(o.items && o.items.length > 0) ? `${o.items.length}种商品` : (o.product_name || o.product?.name || '-')}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{o.items ? o.items.reduce((s: number, i: any) => s + (i.quantity || 0), 0) : (o.quantity)}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-gray-800">¥{Number(o.total_amount || o.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3.5 text-sm text-purple-600">{o.distributor_name || o.distributor?.name || '-'}</td>
                  <td className="px-4 py-3.5 text-sm text-cyan-600">{o.deliveryman_name || o.deliveryman?.name || '-'}</td>
                  <td className="px-4 py-3.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusMap[o.status]?.color}`}>{statusMap[o.status]?.label || o.status}</span></td>
                  <td className="px-4 py-3.5"><button onClick={() => setSelectedOrder(o)} className="p-1.5 rounded-lg hover:bg-water/10 text-water transition-colors"><Eye className="w-4 h-4"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-400 flex justify-between items-center"><span>共 {orders.length} 条记录</span></div>
        </div>

        {/* Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-5">
                <div><h2 className="font-bold text-lg text-gray-800">订单详情</h2><p className="text-xs text-gray-400 font-mono mt-0.5">{selectedOrder.order_no}</p></div>
                <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-gray-100 rounded-lg"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <div className="space-y-3 text-sm">
                {/* 基本信息 */}
                {[
                  ['客户姓名', selectedOrder.customer_name],
                  ['联系电话', selectedOrder.customer_phone],
                  ['收货地址', selectedOrder.address],
                  ['订单金额', `¥${Number(selectedOrder.total_amount || selectedOrder.amount || 0).toFixed(2)}`],
                  ['分销商', selectedOrder.distributor_name || selectedOrder.distributor?.name || '无'],
                  ['派送员', selectedOrder.deliveryman_name || selectedOrder.deliveryman?.name || '未分配'],
                  ['状态', statusMap[selectedOrder.status]?.label || selectedOrder.status],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between py-2 border-b border-dashed border-gray-100 last:border-0">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-medium text-gray-800">{val as string}</span>
                  </div>
                ))}

                {/* 商品信息：支持多商品 */}
                {(selectedOrder.items && selectedOrder.items.length > 0) ? (
                  <div className="pt-1 space-y-2">
                    <span className="text-gray-400">商品信息</span>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      {selectedOrder.items.map((item: any, i: number) => (
                        <div key={i} className={`flex justify-between items-center text-xs ${i < selectedOrder.items.length - 1 ? 'pb-2 border-b border-dashed border-gray-200' : ''}`}>
                          <span className="text-gray-700 font-medium truncate max-w-[220px]">{item.product_name || item.product_id || '-'}</span>
                          <span className="text-gray-500">×{item.quantity} {item.unit || ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between py-2 border-b border-dashed border-gray-100 last:border-0">
                    <span className="text-gray-400">商品</span>
                    <span className="font-medium text-gray-800">{`${selectedOrder.product_name || selectedOrder.product?.name || '-'} × ${selectedOrder.quantity || 1}`}</span>
                  </div>
                )}

                <p className="text-xs text-gray-400 pt-1">下单时间：{selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString('zh-CN') : '-'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
