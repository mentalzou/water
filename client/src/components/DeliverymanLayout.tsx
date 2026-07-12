import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, ArrowRightLeft, Truck, User } from 'lucide-react';
import { useSiteConfig } from '../context/SiteConfigContext';

const navItems = [
  { icon: LayoutDashboard, label: '任务中心', path: '/deliveryman' },
  // 后续可扩展：{ icon: User, label: '我的', path: '/deliveryman/profile' },
];

function getDeliverymanUser(): any | null {
  try { return JSON.parse(localStorage.getItem('deliveryman_user') || 'null'); }
  catch { return null; }
}

function getToken(): string | null {
  return localStorage.getItem('deliveryman_token');
}

export default function DeliverymanLayout() {
  const { siteName } = useSiteConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(getDeliverymanUser());
  const [activeNav, setActiveNav] = useState('任务中心');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const item = navItems.find(i => location.pathname.startsWith(i.path));
    if (item) setActiveNav(item.label);
  }, [location.pathname]);

  useEffect(() => {
    const token = getToken();
    const u = getDeliverymanUser();
    if (!token || !u) {
      navigate('/deliveryman/login', { replace: true });
      return;
    }
    setUser(u);
  }, []);

  function handleLogout() {
    localStorage.removeItem('deliveryman_token');
    localStorage.removeItem('deliveryman_user');
    navigate('/deliveryman/login', { replace: true });
  }

  if (!user) return null;

  /* ─── 共用：导航项渲染 ─── */
  function renderNavItem(item: typeof navItems[0], compact = false) {
    const IconComponent = item.icon;
    const isActive = activeNav === item.label || location.pathname === item.path;
    if (compact) {
      return (
        <button
          key={item.path}
          onClick={() => { setActiveNav(item.label); navigate(item.path); }}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-colors ${
            isActive ? 'text-cyan-600' : 'text-gray-400'
          }`}
        >
          <IconComponent className="w-5 h-5" />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      );
    }
    return (
      <button
        key={item.path}
        onClick={() => { setActiveNav(item.label); navigate(item.path); }}
        className={`group w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md shadow-teal-500/15'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
      >
        <IconComponent className={`w-[18px] h-[18px] ${isActive ? 'text-white/90' : ''}`} />
        <span>{item.label}</span>
        {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/80">

      {/* ═══════════════════════════════════════════════════
          移动端：顶部状态栏
          ═══════════════════════════════════════════════════ */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100/80 px-4 py-2.5 flex items-center justify-between safe-area-top">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Truck className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{user.name || '派送员'}</p>
            <p className="text-[10px] text-gray-400 truncate">{user.phone}</p>
          </div>
        </div>
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-gray-500">
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </header>

      {/* 移动端弹出菜单 */}
      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="absolute top-0 right-0 w-56 bg-white h-full shadow-2xl p-4 pt-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-white shadow-sm">
                {(user.name || '派').charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{user.name || '派送员'}</p>
                <p className="text-xs text-gray-400 font-mono">{user.phone}</p>
              </div>
            </div>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> 退出登录
            </button>
            <button onClick={() => { setShowMobileMenu(false); navigate('/'); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors mt-1"
            >
              <ArrowRightLeft className="w-4 h-4" /> 返回前台
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          桌面端：左侧菜单栏
          ═══════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex w-60 bg-white fixed left-0 top-0 bottom-0 z-20 flex-col border-r border-gray-100/80 shadow-[0_0_15px_rgba(0,0,0,0.02)]">
        {/* Brand */}
        <div className="p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-md shadow-teal-500/20">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-800 text-sm tracking-tight">{siteName}</span>
              <p className="text-[11px] text-gray-400 mt-0.5">派送中心</p>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="mx-4 mb-3 p-3.5 rounded-2xl bg-gradient-to-br from-cyan-50 via-white to-teal-50 border border-cyan-100/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold shadow-sm ring-2 ring-white">
              {(user.name || '派').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.name || '派送员'}</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{user.phone}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 px-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => renderNavItem(item))}
        </nav>

        {/* Footer */}
        <div className="p-4 pt-2 space-y-1 border-t border-gray-100/80 mx-4">
          <button onClick={handleLogout}
            className="group w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            退出登录
          </button>
          <button onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            返回前台
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════
          主内容区
          ═══════════════════════════════════════════════════ */}
      <main className="lg:ml-60 flex-1 min-h-screen overflow-auto pt-12 lg:pt-0 pb-16 lg:pb-0">
        <Outlet />
      </main>

      {/* ═══════════════════════════════════════════════════
          移动端：底部 Tab 导航栏
          ═══════════════════════════════════════════════════ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-t border-gray-100/80 flex items-stretch safe-area-bottom">
        {navItems.map(item => renderNavItem(item, true))}
      </nav>
    </div>
  );
}
