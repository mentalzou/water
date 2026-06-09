import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Package, CheckCircle2, Clock, MapPin, Phone, Sparkles, TrendingUp, ClipboardList } from 'lucide-react';

const API_BASE = '/api';

const statusConfig: Record<string, { label: string; color: string; icon: any; dotColor: string }> = {
  assigned:   { label: '待配送', color: 'bg-amber-50 text-amber-700 border border-amber-100', icon: Clock,          dotColor: 'bg-amber-400' },
  delivering: { label: '配送中', color: 'bg-blue-50 text-blue-700 border border-blue-100',   icon: Truck,           dotColor: 'bg-blue-400' },
  completed:  { label: '已完成', color: 'bg-emerald-50 text-emerald-700 border border-emerald-100', icon: CheckCircle2, dotColor: 'bg-emerald-400' },
};

function getUser(): any {
  try { return JSON.parse(localStorage.getItem('deliveryman_user') || '{}'); }
  catch { return {}; }
}

/* ─── 统计卡片 ─── */
function StatCard({ label, value, accent, icon: Icon }: { label: string; value: number; accent: boolean; icon: any }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl p-3 min-w-0 ${accent ? 'bg-white/25 backdrop-blur-sm' : 'bg-white/10 backdrop-blur-[2px]'} transition-transform active:scale-95`}>
      <Icon className={`w-4 h-4 mb-1 ${accent ? 'text-white' : 'text-white/60'}`} />
      <p className={`text-[10px] tracking-wide ${accent ? 'text-white font-medium' : 'text-white/60'}`}>{label}</p>
      <p className="text-xl font-extrabold text-white leading-none mt-0.5">{value}</p>
    </div>
  );
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
    { key: 'assigned',   label: '待配送', count: summary?.pending || 0     },
    { key: 'delivering', label: '配送中', count: summary?.delivering || 0   },
    { key: 'completed',  label: '已完成', count: summary?.completed || 0    },
  ];

  /* ─── 时间问候语 ─── */
  const hour = new Date().getHours();
  const greeting = hour < 6 ? '夜深了' : hour < 9 ? '早上好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
  const greetEmoji = hour < 6 ? '🌙' : hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌆';

  return (
    <div className="min-h-screen bg-gray-50/80">
      {/* ═══ 欢迎区域 ═══ */}
      <section className="relative overflow-hidden">
        {/* 背景渐变 + 装饰 */}
        <div className="bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 pt-8 pb-10 px-6 relative">
          {/* 装饰圆 */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/[0.07] rounded-full blur-sm" />
          <div className="absolute -bottom-12 -left-8 w-36 h-36 bg-white/[0.05] rounded-full blur-sm" />
          <div className="absolute top-6 right-8 w-20 h-20 bg-white/[0.06] rounded-full" />

          {/* 顶部信息行 */}
          <div className="relative z-10 flex items-center justify-between mb-5">
            <div>
              <p className="text-white/70 text-xs font-medium">{greetEmoji} {greeting}</p>
              <h1 className="text-white text-xl font-bold mt-0.5 drop-shadow-sm">
                欢迎回来，<span className="text-yellow-200">{user.name || '派送员'}</span>
              </h1>
            </div>
            <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center ring-2 ring-white/30 shadow-lg">
              <span className="text-white font-bold text-base">{(user.name || '派').charAt(0)}</span>
            </div>
          </div>

          {/* 统计卡片区 */}
          <div className="grid grid-cols-3 gap-3 relative z-10 max-w-xs mx-auto">
            <StatCard label="待配送" value={summary?.pending || 0} accent={false} icon={ClipboardList} />
            <StatCard label="配送中" value={summary?.delivering || 0} accent={false} icon={Truck} />
            <StatCard label="已完成" value={summary?.completed || 0} accent={true} icon={CheckCircle2} />
          </div>

          {/* 波浪分割线 */}
          <div className="absolute bottom-0 left-0 right-0 leading-none">
            <svg viewBox="0 0 1440 54" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 22L60 17C120 12 240 2 360 5C480 8 600 24 720 28C840 32 960 24 1080 19.5C1200 15 1320 13.7 1380 13L1440 12V54H1380C1320 54 1200 54 1080 54C960 54 840 54 720 54C600 54 480 54 360 54C240 54 120 54 60 54H0V22Z" fill="#F9FAFB"/>
            </svg>
          </div>
        </div>
      </section>

      {/* ═══ Tab 栏 ═══ */}
      <div className="px-5 -mt-1 relative z-10">
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          {tabs.map(({ key, label, count }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 relative py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md shadow-teal-500/20'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span>{label}</span>
                {(count > 0) && (
                  <span className={`ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ 任务列表 ═══ */}
      <div className="px-5 pb-8 space-y-3 mt-4">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl pt-10 pb-8 px-6 text-center shadow-sm border border-gray-100">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
              <Package className="w-9 h-9 text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="text-gray-400 font-medium">暂无任务</p>
            <p className="text-gray-300 text-xs mt-1">有新任务时会自动显示在这里</p>
          </div>
        ) : tasks.map((task: any) => {
          const cfg = statusConfig[task.status];
          const StatusIcon = cfg?.icon || Package;

          return (
            <div
              key={task.id}
              onClick={() => navigate(`/deliveryman/task/${task.id}`)}
              className="group bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 cursor-pointer hover:shadow-md hover:border-gray-200 active:scale-[0.98] transition-all duration-150"
            >
              {/* 头部：订单号 + 状态标签 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg?.dotColor}`} />
                  <p className="font-mono font-semibold text-gray-800 text-sm truncate">{task.order_no}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg?.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {cfg?.label}
                </span>
              </div>

              {/* 地址 + 电话 */}
              <div className="space-y-2 mb-3 pl-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 text-sm leading-relaxed line-clamp-2">{task.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <span className="text-gray-600 text-sm">{task.customer_phone}</span>
                </div>
              </div>

              {/* 底部：商品 + 金额 */}
              <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-100">
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                  {task.product_name} ×{task.quantity}
                </span>
                <span className="font-bold text-base bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  ¥{Number(task.total_amount).toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}

        {/* 底部留白 */}
        <div className="h-4" />
      </div>
    </div>
  );
}
