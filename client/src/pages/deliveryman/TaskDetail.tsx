import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Package, CheckCircle2, Truck, Navigation, Clock } from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';

const API_BASE = '/api';

export default function TaskDetail() {
  const { id: taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (taskId) {
      apiFetch(`${API_BASE}/tasks/${taskId}`, { tokenKey: 'deliveryman_token' }).then((res: any) => {
        if (res && res.code === 200) setTask(res.data);
        setLoading(false);
      });
    }
  }, [taskId]);

  async function handleStartDelivery() {
    if (!taskId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/tasks/${taskId}/accept`, {
        method: 'POST',
        tokenKey: 'deliveryman_token',
      });
      if (res && res.code === 200 && res.data) setTask(res.data);
    } catch { /* handled by apiFetch */ }
    finally { setActionLoading(false); }
  }

  async function handleComplete() {
    if (!taskId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/tasks/${taskId}/complete`, {
        method: 'POST',
        tokenKey: 'deliveryman_token',
      });
      if (res && res.code === 200 && res.data) setTask(res.data);
      alert('配送完成！');
    } catch { /* handled by apiFetch */ }
    finally { setActionLoading(false); }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-water/30 border-t-water rounded-full animate-spin" /></div>;
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-primary-50 flex flex-col items-center justify-center p-6">
        <p className="text-gray-400 mb-6">任务不存在</p>
        <button onClick={() => navigate(-1)} className="px-8 py-3 bg-water text-white rounded-xl">返回</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50 pb-32">
      {/* Header */}
      <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-6 px-5 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">任务详情</h1>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {/* Status Banner */}
        <div className={`rounded-2xl px-5 py-4 ${task.status === 'completed' ? 'bg-green-50' : task.status === 'delivering' ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <div className="flex items-center gap-2">
            {task.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : task.status === 'delivering' ? <Truck className="w-5 h-5 text-blue-500" /> : <Clock className="w-5 h-5 text-orange-500" />}
            <span className={`font-semibold ${task.status === 'completed' ? 'text-green-600' : task.status === 'delivering' ? 'text-blue-600' : 'text-orange-600'}`}>
              {task.status === 'assigned' ? '待配送' : task.status === 'delivering' ? '配送中' : '已完成'}
            </span>
          </div>
          <p className={`text-xs mt-1 ${task.status === 'completed' ? 'text-green-500/70' : task.status === 'delivering' ? 'text-blue-500/70' : 'text-orange-500/70'}`}>{task.order_no}</p>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm"><Package className="w-4 h-4 text-water" /> 收货信息</h3>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><MapPin className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-xs text-gray-400">收货地址</p>
                  <p className="text-sm text-gray-800 mt-0.5">{task.address}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><Phone className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-xs text-gray-400">联系电话</p>
                  <a href={`tel:${task.customer_phone}`} className="text-sm text-water font-medium mt-0.5 block">{task.customer_phone}</a>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"><Package className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-xs text-gray-400">商品信息</p>
                  <p className="text-sm text-gray-800 mt-0.5">{task.product_name || '矿泉水'} × {task.quantity}件</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-100 px-4 py-3 flex justify-between items-center bg-primary-50/50">
            <span className="text-sm text-gray-500">订单金额</span>
            <span className="text-lg font-bold text-water">¥{task.total_amount?.toFixed(2)}</span>
          </div>
        </div>

        {/* Navigate button */}
        {(task.status === 'assigned' || task.status === 'delivering') && (
          <button onClick={() => window.open(`https://uri.amap.com/navigation?to=${encodeURIComponent(task.address)},${task.address}&mode=car`, '_blank')}
            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-center gap-2 active:bg-gray-50 transition-colors">
            <Navigation className="w-5 h-5 text-water" />
            <span className="font-medium text-water">导航前往</span>
          </button>
        )}
      </main>

      {/* Bottom Actions */}
      {task.status === 'assigned' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 safe-area-pb">
          <button onClick={handleStartDelivery} disabled={actionLoading}
            className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white py-4 rounded-2xl font-semibold shadow-lg shadow-teal-200/40 active:scale-[0.98] transition-transform disabled:opacity-50">
            {actionLoading ? '处理中...' : '开始配送'}
          </button>
        </div>
      )}

      {task.status === 'delivering' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 safe-area-pb">
          <button onClick={handleComplete} disabled={actionLoading}
            className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white py-4 rounded-2xl font-semibold shadow-lg shadow-green-200/50 active:scale-[0.98] transition-transform disabled:opacity-50">
            {actionLoading ? '处理中...' : '确认送达'}
          </button>
        </div>
      )}
    </div>
  );
}
