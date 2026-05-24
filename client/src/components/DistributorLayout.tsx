import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Share2, Receipt, ShoppingBag, TrendingUp, LogOut, ArrowRightLeft, User } from 'lucide-react';

const sidebarItems = [
  { icon: LayoutDashboard, label: '工作台', path: '/distributor' },
  { icon: ShoppingBag, label: '购买/充值', path: '/distributor/recharge' },
  { icon: Share2, label: '推广分享', path: '/distributor/share' },
  { icon: Receipt, label: '佣金明细', path: '/distributor/commission' },
  { icon: TrendingUp, label: '订单记录', path: '/distributor/orders' },
];

function getDistributorUser(): any | null {
  try {
    return JSON.parse(localStorage.getItem('distributor_user') || 'null');
  } catch { return null; }
}

function getToken(): string | null {
  return localStorage.getItem('distributor_token');
}

export default function DistributorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(getDistributorUser());
  const [activeNav, setActiveNav] = useState(() => {
    const item = sidebarItems.find(i => i.path === location.pathname);
    return item?.label || '工作台';
  });

  // 认证守卫
  useEffect(() => {
    const token = getToken();
    const u = getDistributorUser();
    if (!token || !u) {
      navigate('/distributor/login', { replace: true });
      return;
    }
    setUser(u);
  }, []);

  function handleLogout() {
    localStorage.removeItem('distributor_token');
    localStorage.removeItem('distributor_user');
    navigate('/distributor/login', { replace: true });
  }

  if (!user) return null; // 避免闪烁

  return (
    <div className="min-h-screen bg-primary-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white fixed left-0 top-0 bottom-0 z-20 flex flex-col border-r border-gray-100 shadow-sm">
        {/* Brand */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-water to-teal-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">好</span>
            </div>
            <div>
              <span className="font-bold text-gray-800 text-sm">好水到家</span>
              <p className="text-xs text-gray-400">分销商中心</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="mx-4 mt-4 p-3 rounded-xl bg-gradient-to-br from-water/5 to-teal-50 border border-water/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-water to-teal-400 flex items-center justify-center text-white text-sm font-bold">
              {(user.name || '分').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.name || '分销商'}</p>
              <p className="text-xs text-gray-400">{user.phone}</p>
            </div>
          </div>
          {user.distributorCode && (
            <p className="text-[11px] text-water/70 mt-1.5 font-medium">推荐码：{user.distributorCode}</p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {sidebarItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeNav === item.label || location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { setActiveNav(item.label); navigate(item.path); }}
                className={
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all '
                  + (isActive ? 'bg-water/10 text-water' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')
                }
              >
                <IconComponent className="w-[17px] h-[17px]" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 space-y-1 border-t border-gray-100">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> 退出登录
          </button>
          <button onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" /> 返回前台
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-56 flex-1 min-h-screen overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
