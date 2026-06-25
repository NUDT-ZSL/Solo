import { useState, createContext, useContext } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import MarketList from './components/MarketList';
import StallGrid from './components/StallGrid';
import AdminPanel from './components/AdminPanel';
import Profile from './components/Profile';
import { Market, User, ToastItem, Stall, Feedback, Category } from './types';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  markets: Market[];
  setMarkets: (markets: Market[]) => void;
  addToast: (type: 'success' | 'error', message: string) => void;
  bookStall: (marketId: string, stallId: number, category: Category, description: string, contact: string) => void;
  cancelStall: (marketId: string, stallId: number) => void;
  addMarket: (name: string, date: string, deadline: string) => void;
  addFeedback: (marketId: string, rating: number, comment: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

const createInitialStalls = (): Stall[] => {
  return Array.from({ length: 16 }, (_, i) => ({
    id: i + 1,
    booked: false,
  }));
};

const createInitialMarkets = (): Market[] => [
  {
    id: '1',
    name: '春日跳蚤市场',
    date: '2026-07-15',
    deadline: '2026-07-10',
    totalStalls: 16,
    stalls: [
      ...createInitialStalls().slice(0, 3).map(s => ({
        ...s,
        booked: true,
        category: '二手书籍' as Category,
        description: '各类小说和教材',
        contact: '13800138001',
        userId: 'user1',
        userName: '张三',
      })),
      ...createInitialStalls().slice(3, 5).map(s => ({
        ...s,
        booked: true,
        category: '手工艺品' as Category,
        description: '手工编织品',
        contact: '13800138002',
        userId: 'user2',
        userName: '李四',
      })),
      ...createInitialStalls().slice(5),
    ],
    feedbacks: [
      { id: 'f1', marketId: '1', userId: 'user1', userName: '张三', rating: 5, comment: '活动很棒，人流量大！', createdAt: '2026-06-20' },
      { id: 'f2', marketId: '1', userId: 'user2', userName: '李四', rating: 4, comment: '组织得不错，下次还来', createdAt: '2026-06-21' },
    ],
  },
  {
    id: '2',
    name: '夏日清凉市集',
    date: '2026-08-05',
    deadline: '2026-07-30',
    totalStalls: 16,
    stalls: [
      ...createInitialStalls().slice(0, 2).map(s => ({
        ...s,
        booked: true,
        category: '家居用品' as Category,
        description: '小家电和日用品',
        contact: '13800138003',
        userId: 'user3',
        userName: '王五',
      })),
      ...createInitialStalls().slice(2),
    ],
    feedbacks: [],
  },
  {
    id: '3',
    name: '周末二手交易',
    date: '2026-06-28',
    deadline: '2026-06-26',
    totalStalls: 16,
    stalls: createInitialStalls(),
    feedbacks: [],
  },
];

const ToastContainer = ({ toasts }: { toasts: ToastItem[] }) => (
  <div className="toast-container">
    {toasts.map(toast => (
      <div key={toast.id} className={'toast ' + toast.type}>
        {toast.message}
      </div>
    ))}
  </div>
);

const Navbar = () => {
  const location = useLocation();
  const { user, setUser } = useApp();
  const navigate = useNavigate();

  const handleLogin = () => {
    setUser({ id: 'user1', name: '测试用户', isAdmin: true });
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">跳蚤市场管理系统</div>
      <div className="navbar-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>市场列表</Link>
        <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>管理员后台</Link>
        <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>个人中心</Link>
        {user ? (
          <button onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '12px' }}>
            {'退出 (' + user.name + ')'}
          </button>
        ) : (
          <button onClick={handleLogin} style={{ padding: '6px 12px', fontSize: '12px' }}>
            登录
          </button>
        )}
      </div>
    </nav>
  );
};

const MarketDetail = () => {
  const { markets } = useApp();
  const location = useLocation();
  const id = location.pathname.split('/')[2];
  const market = markets.find(m => m.id === id);

  if (!market) {
    return <div style={{ padding: '24px' }}>市场不存在</div>;
  }

  return (
    <div className="market-detail fade-in">
      <div className="market-detail-header">
        <h2>{market.name}</h2>
        <p style={{ color: '#7b1fa2', fontSize: '14px' }}>
          {'活动日期：' + market.date + ' | 报名截止：' + market.deadline}
        </p>
      </div>
      <StallGrid market={market} />
    </div>
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [markets, setMarkets] = useState<Market[]>(createInitialMarkets());
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const bookStall = (marketId: string, stallId: number, category: Category, description: string, contact: string) => {
    if (!user) {
      addToast('error', '请先登录');
      return;
    }
    setMarkets(prev => prev.map(market => {
      if (market.id !== marketId) return market;
      return {
        ...market,
        stalls: market.stalls.map(stall => {
          if (stall.id !== stallId || stall.booked) return stall;
          return {
            ...stall,
            booked: true,
            category,
            description,
            contact,
            userId: user.id,
            userName: user.name,
          };
        }),
      };
    }));
    addToast('success', '摊位预订成功！');
  };

  const cancelStall = (marketId: string, stallId: number) => {
    setMarkets(prev => prev.map(market => {
      if (market.id !== marketId) return market;
      return {
        ...market,
        stalls: market.stalls.map(stall => {
          if (stall.id !== stallId) return stall;
          return { id: stall.id, booked: false };
        }),
      };
    }));
    addToast('success', '摊位已取消');
  };

  const addMarket = (name: string, date: string, deadline: string) => {
    const newMarket: Market = {
      id: uuidv4(),
      name,
      date,
      deadline,
      totalStalls: 16,
      stalls: createInitialStalls(),
      feedbacks: [],
    };
    setMarkets(prev => [...prev, newMarket]);
    addToast('success', '市场创建成功！');
  };

  const addFeedback = (marketId: string, rating: number, comment: string) => {
    if (!user) {
      addToast('error', '请先登录');
      return;
    }
    const feedback: Feedback = {
      id: uuidv4(),
      marketId,
      userId: user.id,
      userName: user.name,
      rating,
      comment,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setMarkets(prev => prev.map(market => {
      if (market.id !== marketId) return market;
      return { ...market, feedbacks: [...market.feedbacks, feedback] };
    }));
    addToast('success', '评价提交成功！');
  };

  const contextValue: AppContextType = {
    user,
    setUser,
    markets,
    setMarkets,
    addToast,
    bookStall,
    cancelStall,
    addMarket,
    addFeedback,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <ToastContainer toasts={toasts} />
        <Routes>
          <Route path="/" element={<MarketList />} />
          <Route path="/market/:id" element={<MarketDetail />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </AppContext.Provider>
  );
}

export default App;