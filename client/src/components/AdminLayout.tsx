import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Truck, Package,
  ShoppingBag, ArrowRightLeft, MapPin, Settings,
  Shield, UserCog, LogOut, Tag, FolderOpen, CreditCard, Image
} from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

function getToken(): string {
  return localStorage.getItem('admin_token') || '';
}

/** 获取当前用户的权限列表（从 localStorage 缓存） */
function getPermissions(): string[] {
  try {
    const raw = localStorage.getItem('admin_user');
    if (!raw) return [];
    const user = JSON.parse(raw);
    if (user.permissions && Array.isArray(user.permissions)) {
      // '*' 表示拥有所有权限
      if (user.permissions.includes('*')) return ['*'];
      return user.permissions;
    }
    return [];
  } catch { return []; }
}

/** 判断是否有某项权限（* 表示全权限） */
function hasPermission(required: string): boolean {
  const perms = getPermissions();
  return perms.includes('*') || perms.includes(required);
}

// 每个菜单项绑定对应的权限 key
const allSidebarItems = [
  { icon: LayoutDashboard, label: '仪表盘', path: '/admin', permission: 'dashboard:view' },
  { icon: Users, label: '分销商管理', path: '/admin/distributors', permission: 'distributor:manage' },
  { icon: UserPlus, label: '派送员管理', path: '/admin/deliverymen', permission: 'deliveryman:manage' },
  { icon: MapPin, label: '区域管理', path: '/admin/areas', permission: 'area:manage' },
  { icon: FolderOpen, label: '产品分类', path: '/admin/categories', permission: 'category:manage' },
  { icon: Tag, label: '品牌管理', path: '/admin/brands', permission: 'brand:manage' },
  { icon: ShoppingBag, label: '产品管理', path: '/admin/products', permission: 'product:manage' },
  { icon: Package, label: '订单管理', path: '/admin/orders', permission: 'order:view' },
  { icon: CreditCard, label: '充值套餐', path: '/admin/recharge-packages', permission: 'recharge:manage' },
  { icon: Image, label: '广告栏管理', path: '/admin/ad-banners', permission: 'banner:manage' },
  { icon: Settings, label: '系统配置', path: '/admin/config', permission: 'config:manage' },
  { icon: UserCog, label: '用户管理', path: '/admin/users', permission: 'user:view' },
  { icon: Shield, label: '角色管理', path: '/admin/roles', permission: 'role:view' },
];

function DropletsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/>
      <path d="M12.56 6.6A10.97 10.97 0 0014 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.66a8.98 8.98 0 01-1.44 4.88" opacity=".6"/>
      <path d="M17.01 17H7c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2z" opacity=".3"/>
    </svg>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [permissions, setPermissions] = useState<string[]>(() => getPermissions());
  const [activeNav, setActiveNav] = useState(() => {
    const current = allSidebarItems.find(item => item.path === location.pathname);
    return current?.label || '仪表盘';
  });

  /** 根据当前权限过滤后的菜单 */
  const visibleItems = allSidebarItems.filter(item => hasPermission(item.permission));

  useEffect(() => {
    // 组件挂载时刷新一次用户信息（确保权限最新）
    async function fetchProfile() {
      try {
        const token = getToken();
        if (!token) {
          navigate('/admin/login', { replace: true });
          return;
        }
        const res = await apiFetch('/api/admin/profile', { tokenKey: 'admin_token' });
        if (res && res.code === 200) {
          localStorage.setItem('admin_user', JSON.stringify(res.data));
          setPermissions(res.data.permissions || []);
          // 如果当前页面不在有权限的菜单中，跳到第一个可用页面
          const firstVisible = allSidebarItems.find(item =>
            (res.data.permissions || []).includes('*') || (res.data.permissions || []).includes(item.permission)
          );
          if (firstVisible && location.pathname !== '/' && !allSidebarItems.some(
            item => item.path === location.pathname && (
              (res.data.permissions || []).includes('*') || (res.data.permissions || []).includes(item.permission)
            )
          )) {
            navigate(firstVisible.path, { replace: true });
          }
        }
      } catch (e: any) {
        // token 过期已在 apiFetch 中处理跳转，此处无需额外操作
        if (e.message !== '登录已过期，请重新登录') {
          console.error('[AdminLayout] 获取用户信息失败:', e);
        }
      }
    }
    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 fixed left-0 top-0 bottom-0 z-20 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <DropletsIcon />
            </div>
            <span className="font-bold text-white text-lg">武夷屿都山水</span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeNav === item.label || location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { setActiveNav(item.label); navigate(item.path); }}
                className={
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all '
                  + (isActive ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white hover:bg-white/5')
                }
              >
                <IconComponent className="w-[18px] h-[18px]" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" /> 返回前台
          </button>
          <button
            onClick={() => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); navigate('/admin/login'); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> 退出登录
          </button>
        </div>
      </aside>

      {/* Main Content - 子路由内容在这里渲染 */}
      <main className="ml-60 flex-1 p-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
