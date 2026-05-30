import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Package, CheckCircle2, Clock, MapPin, Phone } from 'lucide-react';

const API_BASE = '/api';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  assigned: { label: '待接单', color: 'bg-water/10 text-water', icon: Clock },
  delivering: { label: '配送中', color: 'bg-blue-100 text-blue-600', icon: Truck },
  completed: { label: '已完成', color: 'bg-green-100 text-green-600', icon: CheckCircle2 },
};

function getUser(): any {
  try { return JSON.parse(localStorage.getItem('deliveryman_user') || '{}'); }
  catch { return {}; }
}

export default function TaskList() {
  const navigate = useNavigate();
  const user = getUser();
  const dmId = user.deliverymanId || '';
  const [tasks, setTasks] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('assigned');

  async function loadTasks() {
    if (!dmId) return;
    try {
      const token = localStorage.getItem('deliveryman_token') || '';
      const res: any = await fetch(
        `${API_BASE}/deliverymen/${dmId}/tasks?status=${activeTab}`,
        { headers: { Authorization: `Bearer ${token}` } },
      ).then(r => r.json());
      if (res.code === 200) {
        setTasks(res.data?.tasks || []);
        setSummary(res.data?.summary);
      }
    } catch { /* dev fallback */ }
  }

  useEffect(() => { loadTasks(); }, [activeTab]);

  const tabs = [
    { key: 'assigned', label: '待配送', count: summary?.pending || 0 },
    { key: 'delivering', label: '配送中', count: summary?.delivering || 0 },
    { key: 'completed', label: '已完成', count: summary?.completed || 0 },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Welcome Banner */}
      <header className="bg-gradient-to-br from-water-light via-water to-teal-500 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <h1 className="text-lg font-bold text-white mb-1">欢迎回来，{user.name || '派送员'}</h1>
        <p className="text-white/70 text-sm">今日任务概览</p>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: '待配送', value: summary?.pending || 0, accent: false },
            { label: '配送中', value: summary?.delivering || 0, accent: false },
            { label: '已完成', value: summary?.completed || 0, accent: true },
          ].map((item, i) => (
            <div key={i} className={`rounded-xl p-3 backdrop-blur-sm ${item.accent ? 'bg-white/20' : 'bg-white/10'}`}>
              <p className={`text-[11px] ${item.accent ? 'text-white font-medium' : 'text-white/70'}`}>{item.label}</p>
              <p className="font-bold mt-0.5 text-white text-lg">{item.value}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(({ key, label, count }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === key ? 'bg-water text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}{count > 0 ? `(${count})` : ''}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">暂无任务</p>
          </div>
        ) : tasks.map((task: any) => (
          <div key={task.id} onClick={() => navigate(`/deliveryman/task/${task.id}`)}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <p className="font-semibold text-gray-800 text-sm">{task.order_no}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[task.status]?.color || ''}`}>
                {(() => { const Icon = statusConfig[task.status]?.icon || Package; return <Icon className="w-3 h-3 mr-1" />; })()}
                {statusConfig[task.status]?.label || task.status}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-sm"><MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" /><span className="text-gray-700 line-clamp-2">{task.address}</span></div>
              <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-gray-400 flex-shrink-0" /><span className="text-gray-700">{task.customer_phone}</span></div>
            </div>
            <div className="flex justify-between items-end mt-3 pt-3 border-t border-dashed border-gray-100">
              <span className="text-xs text-gray-400">{task.product_name} ×{task.quantity}</span>
              <span className="font-bold text-water">¥{Number(task.total_amount).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
