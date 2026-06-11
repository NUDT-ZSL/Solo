import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Heart, User, LogOut, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useEffect, useState } from 'react';
import Home from '@/pages/Home';
import PollDetail from '@/pages/PollDetail';
import Favorites from '@/pages/Favorites';

function LoginModal() {
  const { showLoginModal, setShowLoginModal, login } = useStore();
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    login(trimmed);
    setUsername('');
    setShowLoginModal(false);
  };

  if (!showLoginModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={() => setShowLoginModal(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 relative animate-slideIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShowLoginModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors btn-interactive"
          aria-label="关闭"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#4facfe] to-[#00f2fe] flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">欢迎登录</h2>
          <p className="text-gray-500 text-sm">登录后即可参与投票、评论和收藏</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              maxLength={20}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full btn-interactive bg-gradient-to-r from-[#4facfe] to-[#00f2fe] text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
          >
            登录
          </button>
        </form>
      </div>
    </div>
  );
}

function Navbar() {
  const { nickname, isLoggedIn, logout, setShowLoginModal } = useStore();

  return (
    <nav className="bg-gradient-to-r from-[#1a237e] to-[#283593] text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg tracking-wide hover:opacity-90 transition-opacity">
          实时投票平台
        </Link>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-3 py-1.5">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{nickname || '用户'}</span>
              </div>
              <button
                onClick={logout}
                className="btn-interactive flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-3 py-1.5 text-sm transition-colors"
                aria-label="退出登录"
              >
                <LogOut className="w-4 h-4" />
                <span>退出</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="btn-interactive flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-lg px-3 py-1.5 text-sm transition-colors"
            >
              <User className="w-4 h-4" />
              <span>登录</span>
            </button>
          )}
          <Link
            to="/favorites"
            className="btn-interactive relative hover:opacity-90 transition-opacity"
            aria-label="收藏"
          >
            <Heart className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const { initSocket } = useStore();

  useEffect(() => {
    initSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-[#f9f9f9]">
        <Navbar />
        <LoginModal />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/poll/:id" element={<PollDetail />} />
          <Route path="/favorites" element={<Favorites />} />
        </Routes>
      </div>
    </Router>
  );
}
