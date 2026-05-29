import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Package, User } from 'lucide-react';

const navItems = [
  { path: '/', icon: ShoppingCart, label: '订购' },
  { path: '/orders', icon: Package, label: '订单' },
  { path: '/profile', icon: User, label: '我的' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
                <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex flex-col items-center justify-center py-2 px-4 flex-1 transition-all ${
                        isActive ? 'text-water' : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <Icon className={`w-6 h-6 mb-1 ${isActive ? 'scale-110' : ''}`} />
                  <span className={`text-xs ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
                  {isActive && (
                      <div className="absolute bottom-0 w-8 h-0.5 bg-water rounded-full" />
                  )}
                </button>
            );
          })}
        </div>
      </nav>
  );
}