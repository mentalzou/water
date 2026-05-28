import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Package, Lock, MapPin, LogOut, ChevronRight, Gift, CreditCard
} from 'lucide-react';
import BottomNav from '../../components/BottomNav';

const MENU_ITEMS = [
  { key: 'orders', label: '我的订单', icon: Package, path: '/profile/orders', desc: '查看全部订单状态' },
  { key: 'recharge', label: '充值中心', icon: CreditCard, path: '/profile/recharge', desc: '充值享受优惠折扣' },
  { key: 'points', label: '我的积分', icon: Gift, path: '/profile/points', desc: '查看积分和记录' },
  { key: 'password', label: '修改密码', icon: Lock, path: '/profile/password', desc: '更改登录密码' },
  { key: 'address', label: '收货地址', icon: MapPin, path: '/profile/address', desc: '管理收货地址' },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>({});

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('customer_user') || '{}');
    setUser(u);
  }, []);

  function handleLogout() {
    if (!confirm('确定要退出当前账户吗？')) return;
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    navigate('/', { replace: true });
  }

  return (
      <div className="min-h-screen bg-primary-50 pb-20">
        {/* Header */}
        <header className="bg-gradient-to-r from-water-light to-water pt-12 pb-24 px-5">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-white rotate-180" />
            </button>
            <h1 className="text-xl font-bold text-white">个人中心</h1>
          </div>
          {/* 用户信息卡片 */}
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{user.name || '用户'}</p>
              <p className="text-white/70 text-sm">{user.phone || ''}</p>
            </div>
          </div>
        </header>

        <main className="px-4 -mt-12 pb-8">
          {/* 功能入口卡片 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            {MENU_ITEMS.map(item => (
                <button key={item.key} onClick={() => navigate(item.path)}
                        className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <div className="w-10 h-10 rounded-xl bg-water/10 text-water flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
            ))}
          </div>

          {/* 退出登录 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-red-50 active:bg-red-50"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-400 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="flex-1 text-sm font-medium text-red-500">退出登录</span>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </button>
          </div>
        </main>

        <BottomNav />
      </div>
  );
}
