import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
  Navigate
} from 'react-router-dom';
import { useFinanceData } from './hooks/useFinanceData';
import Dashboard from './pages/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import BudgetCard from './components/BudgetCard';

const GlobalStyles: React.FC = () => (
  <style>{`
    * {
      box-sizing: border-box;
    }

    html, body, #root {
      margin: 0;
      padding: 0;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
        'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      color: #333;
      background-color: #f5f7fa;
    }

    body {
      background-image:
        linear-gradient(rgba(74, 144, 217, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(74, 144, 217, 0.05) 1px, transparent 1px);
      background-size: 24px 24px;
      background-attachment: fixed;
    }

    .card {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.03);
      transition: box-shadow 250ms ease;
    }

    .card:hover {
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.04);
    }

    button {
      font-family: inherit;
    }

    button:focus {
      outline: none;
    }

    .btn-primary:hover,
    .type-btn:hover,
    .cat-btn:hover,
    .btn-secondary:hover,
    .page-btn:hover:not(:disabled),
    .delete-btn:hover,
    .stat-card:hover,
    .budget-card:hover,
    .detail-item:hover {
      transform: scale(1.05);
    }

    .cat-btn:hover {
      transform: scale(1.03);
    }

    .btn-primary:active,
    .type-btn:active,
    .cat-btn:active,
    .btn-secondary:active,
    .page-btn:active:not(:disabled) {
      transform: scale(0.98);
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    input:focus,
    select:focus {
      border-color: #4A90D9 !important;
      box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.12);
    }

    @keyframes fadeSlideIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeSlideUp {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes shakeYellow {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-3px) rotate(-0.5deg); }
      40% { transform: translateX(3px) rotate(0.5deg); }
      60% { transform: translateX(-2px); }
      80% { transform: translateX(2px); }
    }

    @keyframes shakeRed {
      0%, 100% { transform: translateX(0); }
      15% { transform: translateX(-5px) rotate(-1deg); }
      30% { transform: translateX(5px) rotate(1deg); }
      45% { transform: translateX(-4px); }
      60% { transform: translateX(4px); }
      75% { transform: translateX(-2px); }
      90% { transform: translateX(2px); }
    }

    @keyframes pulseBar {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.75; }
    }

    @keyframes flashWarning {
      0%, 100% {
        opacity: 1;
        box-shadow: 0 4px 20px rgba(251, 140, 0, 0.3);
      }
      50% {
        opacity: 0.85;
        box-shadow: 0 4px 30px rgba(251, 140, 0, 0.5);
      }
    }

    @keyframes flashDanger {
      0%, 100% {
        opacity: 1;
        box-shadow: 0 4px 20px rgba(229, 57, 53, 0.3);
      }
      50% {
        opacity: 0.85;
        box-shadow: 0 4px 30px rgba(229, 57, 53, 0.5);
      }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-100%);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .page-enter {
      animation: fadeSlideUp 300ms ease both;
    }

    .notification-bar {
      animation: slideDown 300ms ease both;
    }

    .notification-warning {
      animation: slideDown 300ms ease both, flashWarning 1.2s ease-in-out 300ms infinite;
    }

    .notification-danger {
      animation: slideDown 300ms ease both, flashDanger 1s ease-in-out 300ms infinite;
    }

    .nav-link {
      position: relative;
      padding: 12px 20px;
      border-radius: 8px;
      text-decoration: none;
      color: #666;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 200ms ease;
      white-space: nowrap;
    }

    .nav-link:hover {
      background: #f0f4f8;
      color: #4A90D9;
    }

    .nav-link.active {
      background: linear-gradient(135deg, #4A90D9, #4A90D9dd);
      color: #fff;
      box-shadow: 0 4px 12px rgba(74, 144, 217, 0.25);
    }

    .nav-link.active::after {
      content: '';
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.8);
    }

    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: #d0d7de;
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #b0b8c0;
    }

    @media (max-width: 768px) {
      .sidebar {
        display: none !important;
      }

      .main-content {
        margin-left: 0 !important;
        padding-bottom: 80px !important;
      }

      .bottom-nav {
        display: flex !important;
      }

      .dashboard-charts {
        grid-template-columns: 1fr !important;
      }
    }

    @media (min-width: 769px) {
      .bottom-nav {
        display: none !important;
      }
    }
  `}</style>
);

const Sidebar: React.FC = () => {
  const navItems = [
    { path: '/dashboard', label: '数据仪表盘', icon: '📊' },
    { path: '/transactions', label: '交易记录', icon: '📝' },
    { path: '/budgets', label: '预算管理', icon: '🎯' }
  ];

  return (
    <aside
      className="sidebar"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '240px',
        background: '#fff',
        boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100
      }}
    >
      <div style={{ padding: '8px 12px 28px', borderBottom: '1px solid #f0f0f0', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4A90D9, #50E3C2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(74, 144, 217, 0.3)'
            }}
          >
            💰
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#333' }}>财务管家</div>
            <div style={{ fontSize: '11px', color: '#999' }}>Finance Tracker</div>
          </div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', padding: '16px 12px' }}>
        <div
          style={{
            padding: '14px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #4A90D910, #50E3C215)',
            fontSize: '12px',
            color: '#666',
            lineHeight: 1.6
          }}
        >
          <div style={{ fontWeight: 600, color: '#4A90D9', marginBottom: '6px' }}>💡 小提示</div>
          合理规划每月预算，
          <br />
          让每一笔支出都有据可依。
        </div>
      </div>
    </aside>
  );
};

const BottomNav: React.FC = () => {
  const navItems = [
    { path: '/dashboard', label: '仪表盘', icon: '📊' },
    { path: '/transactions', label: '记录', icon: '📝' },
    { path: '/budgets', label: '预算', icon: '🎯' }
  ];

  return (
    <nav
      className="bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: '#fff',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '8px 0',
        zIndex: 100
      }}
    >
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          style={{
            flexDirection: 'column',
            gap: '2px',
            padding: '6px 14px',
            fontSize: '11px'
          }}
        >
          <span style={{ fontSize: '22px' }}>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

const NotificationBar: React.FC<{
  notification: { type: 'warning' | 'danger'; message: string } | null;
  onDismiss: () => void;
}> = ({ notification, onDismiss }) => {
  if (!notification) return null;

  const bgColor = notification.type === 'danger' ? '#E53935' : '#FB8C00';
  const animClass = notification.type === 'danger' ? 'notification-danger' : 'notification-warning';

  return (
    <div
      className={animClass}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: bgColor,
        color: '#fff',
        padding: '14px 24px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontWeight: 600,
        fontSize: '14px'
      }}
    >
      <span style={{ fontSize: '18px' }}>
        {notification.type === 'danger' ? '🚨' : '⚠️'}
      </span>
      <span>{notification.message}</span>
      <button
        onClick={onDismiss}
        style={{
          position: 'absolute',
          right: '24px',
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: '#fff',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          lineHeight: 1
        }}
      >
        ×
      </button>
    </div>
  );
};

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [key, setKey] = useState(location.pathname);

  useEffect(() => {
    setKey(location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div key={key} className="page-enter">
      {children}
    </div>
  );
};

const DashboardPage: React.FC<ReturnType<typeof useFinanceData>> = props => (
  <div>
    <h1 style={{ margin: '0 0 24px', fontSize: '24px', color: '#333' }}>
      数据仪表盘
      <span style={{ marginLeft: '12px', fontSize: '14px', color: '#999', fontWeight: 400 }}>
        全方位掌握您的财务状况
      </span>
    </h1>
    <Dashboard summary={props.summary} loading={props.loading} />
  </div>
);

const TransactionsPage: React.FC<ReturnType<typeof useFinanceData>> = props => (
  <div>
    <h1 style={{ margin: '0 0 24px', fontSize: '24px', color: '#333' }}>
      交易记录
      <span style={{ marginLeft: '12px', fontSize: '14px', color: '#999', fontWeight: 400 }}>
        管理您的每一笔收支
      </span>
    </h1>
    <TransactionForm
      budgets={props.budgets}
      allTags={props.summary?.allTags || []}
      onSubmit={props.addTransaction}
      loading={props.loading}
    />
    <TransactionList
      transactions={props.transactions}
      total={props.transactionsTotal}
      allTags={props.summary?.allTags || []}
      allCategories={props.summary?.allCategories || []}
      loading={props.loading}
      onFilter={props.fetchTransactions}
      onDelete={props.removeTransaction}
    />
  </div>
);

const BudgetsPage: React.FC<ReturnType<typeof useFinanceData>> = props => (
  <div>
    <h1 style={{ margin: '0 0 24px', fontSize: '24px', color: '#333' }}>
      预算管理
      <span style={{ marginLeft: '12px', fontSize: '14px', color: '#999', fontWeight: 400 }}>
        设定目标，智能追踪开销
      </span>
    </h1>
    <BudgetCard
      budgets={props.budgets}
      onAdd={props.addBudget}
      onDelete={props.removeBudget}
      onFetchBudgets={props.fetchBudgets}
    />
  </div>
);

const AppContent: React.FC = () => {
  const finance = useFinanceData();
  const location = useLocation();
  const notifOffset = finance.notification ? '56px' : '0';

  return (
    <>
      <NotificationBar
        notification={finance.notification}
        onDismiss={finance.dismissNotification}
      />
      <Sidebar />
      <BottomNav />
      <main
        className="main-content"
        style={{
          marginLeft: '240px',
          padding: `calc(24px + ${notifOffset}) 32px 32px`,
          minHeight: '100vh',
          maxWidth: '100%',
          transition: 'padding-top 300ms ease'
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <PageWrapper>
            <Routes location={location}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage {...finance} />} />
              <Route path="/transactions" element={<TransactionsPage {...finance} />} />
              <Route path="/budgets" element={<BudgetsPage {...finance} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </PageWrapper>
        </div>
      </main>
    </>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <GlobalStyles />
    <AppContent />
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
