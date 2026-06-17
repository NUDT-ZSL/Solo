import { Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import OrdersPage from './pages/OrdersPage';
import LogsPage from './pages/LogsPage';

export default function App() {
  const location = useLocation();

  const navItem = (path: string, label: string) => {
    const active = location.pathname === path;
    return (
      <Link
        to={path}
        className="nav-item"
        style={{
          fontWeight: active ? 700 : 500,
          color: active ? '#ff7043' : '#555',
          borderBottom: active ? '3px solid #ff7043' : '3px solid transparent',
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🥐</span>
            <span className="logo-text">社区烘焙坊</span>
          </div>
          <nav className="nav">
            {navItem('/', '首页')}
            {navItem('/orders', '订单管理')}
            {navItem('/logs', '烘焙日志')}
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>© 2026 社区烘焙坊管理系统 · 温暖每一天</p>
      </footer>
    </div>
  );
}
