import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  name: string;
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="page-container">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="nav-brand" onClick={() => navigate('/')}>
            🏪 社区跳蚤市场
          </div>
          <div className="nav-links">
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
              活动列表
            </Link>
            {user && (
              <Link to="/my-stalls" className={`nav-link ${isActive('/my-stalls') ? 'active' : ''}`}>
                我的摊位
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
                管理后台
              </Link>
            )}
            {!user && (
              <Link to="/login" className={`nav-link ${isActive('/login') ? 'active' : ''}`}>
                登录
              </Link>
            )}
            {user && (
              <button className="nav-link" onClick={handleLogout}>
                退出 ({user.name})
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="content-area">{children}</div>

      <footer className="footer">© 2026 社区跳蚤市场管理系统 · 让交易更简单</footer>
    </div>
  );
};

export default Layout;
