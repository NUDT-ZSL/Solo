import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { BookOpen, User, LogOut, Settings } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#8B4513]/90 backdrop-blur-sm shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-[#F5E6CA]">
          <BookOpen size={28} />
          <span className="text-xl font-bold">社区图书馆</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/books" className="text-[#F5E6CA] hover:text-white transition-colors">
            图书浏览
          </Link>
          <Link to="/my-loans" className="text-[#F5E6CA] hover:text-white transition-colors">
            我的借阅
          </Link>
          {user.role === 'admin' && (
            <Link to="/admin" className="text-[#F5E6CA] hover:text-white transition-colors flex items-center gap-1">
              <Settings size={18} />
              管理面板
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[#F5E6CA]">
            <User size={20} />
            <span>{user.username}</span>
            <span className="text-xs bg-[#F5E6CA] text-[#5C4033] px-2 py-0.5 rounded-full">
              {user.role === 'admin' ? '管理员' : '读者'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#F5E6CA] hover:text-white transition-colors flex items-center gap-1"
          >
            <LogOut size={18} />
            退出
          </button>
        </div>
      </div>
    </nav>
  );
}
