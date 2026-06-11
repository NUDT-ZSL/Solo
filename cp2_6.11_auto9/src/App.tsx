import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Home from '@/pages/Home';
import Profile from '@/pages/Profile';
import { useStore } from '@/store/useStore';
import { Map, User, LogIn } from 'lucide-react';

export default function App() {
  const { user, setUser } = useStore();

  useEffect(() => {
    const savedUser = localStorage.getItem('soundscape_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('soundscape_user');
      }
    }
  }, [setUser]);

  const handleDemoLogin = () => {
    const demoUser = {
      id: 'demo-user-1',
      username: '声景漫步者',
      email: 'demo@soundscape.map',
      avatar: '',
    };
    setUser(demoUser);
    localStorage.setItem('soundscape_user', JSON.stringify(demoUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('soundscape_user');
  };

  return (
    <Router>
      <div className="min-h-screen bg-earth-warm font-body">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-earth-brown text-white px-4 py-2.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Map size={20} className="text-earth-wheat" />
            <span className="font-display text-lg font-semibold">
              声景地图
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <a
                  href="/profile"
                  className="flex items-center gap-1.5 text-sm hover:text-earth-wheat transition-colors"
                >
                  <User size={16} />
                  {user.username}
                </a>
                <button
                  onClick={handleLogout}
                  className="text-xs text-earth-brown/70 bg-earth-wheat/20 px-2 py-1 rounded hover:bg-earth-wheat/30 transition-colors"
                >
                  退出
                </button>
              </>
            ) : (
              <button
                onClick={handleDemoLogin}
                className="flex items-center gap-1.5 text-sm bg-earth-wheat text-earth-brown px-3 py-1.5 rounded-lg hover:bg-earth-wheatHover transition-colors"
              >
                <LogIn size={14} />
                演示登录
              </button>
            )}
          </div>
        </nav>

        <div className="pt-11">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/profile"
              element={
                user ? (
                  <Profile userId={user.id} onBack={() => window.history.back()} />
                ) : (
                  <div className="flex items-center justify-center h-[80vh] text-earth-brown/50">
                    请先登录
                  </div>
                )
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
