import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { BookOpen, PenTool, LogOut, Feather } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, filterMine, setFilterMine } = useStore();

  const isHome = location.pathname === '/';
  const isAllActive = isHome && !filterMine;
  const isMineActive = isHome && filterMine;

  const navButtonClass = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-serif transition ${
      active
        ? 'bg-amber/15 text-amber-dark'
        : 'text-poem-muted hover:bg-white/60 hover:text-poem-text'
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <Feather className="text-amber" />
          <span className="font-xiaowei text-xl text-poem-text">诗影随行</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            className={navButtonClass(isAllActive)}
            onClick={() => {
              setFilterMine(false);
              navigate('/');
            }}
          >
            <BookOpen size={16} />
            全部诗歌
          </button>

          {currentUser && (
            <button
              className={navButtonClass(isMineActive)}
              onClick={() => {
                setFilterMine(true);
                navigate('/');
              }}
            >
              <PenTool size={16} />
              我的创作
            </button>
          )}

          {currentUser ? (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-serif transition text-poem-muted hover:text-red-400"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <LogOut size={16} />
              退出
            </button>
          ) : (
            <button
              className={navButtonClass(false)}
              onClick={() => navigate('/login')}
            >
              登录
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
