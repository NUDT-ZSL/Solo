import { Routes, Route, Link, useLocation } from 'react-router-dom';
import OrdersPage from './pages/OrdersPage';
import LogsPage from './pages/LogsPage';
import './styles.css';

function App() {
  const location = useLocation();

  const navLinkClass = (path: string) => {
    const base = 'nav-link';
    return location.pathname === path ? `${base} active` : base;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🥐 烘焙坊管理系统</h1>
        <nav className="app-nav">
          <Link to="/" className={navLinkClass('/')}>首页</Link>
          <Link to="/orders" className={navLinkClass('/orders')}>订单管理</Link>
          <Link to="/logs" className={navLinkClass('/logs')}>烘焙日志</Link>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<OrdersPage showPendingOnly={true} />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
