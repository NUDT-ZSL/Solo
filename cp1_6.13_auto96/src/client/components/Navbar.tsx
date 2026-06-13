import { Link, useLocation } from 'react-router-dom';
import { Crown, Upload, Package, ShoppingBag, User } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Navbar() {
  const location = useLocation();
  const { userRole, setUserRole } = useStore();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              AssetVault
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setUserRole('buyer')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  userRole === 'buyer'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                买家
              </button>
              <button
                onClick={() => setUserRole('seller')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  userRole === 'seller'
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4" />
                卖家
              </button>
            </div>

            {userRole === 'seller' && (
              <>
                <Link
                  to="/upload"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                    isActive('/upload')
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  上传
                </Link>
                <Link
                  to="/manage"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                    isActive('/manage')
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <User className="w-4 h-4" />
                  管理
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
