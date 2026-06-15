import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import TradePanel from './TradePanel';
import Leaderboard from './Leaderboard';
import ChartView from './ChartView';

interface MarketItem {
  symbol: string;
  name: string;
  open: number;
  close: number;
  high: number;
  low: number;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

interface LeaderboardEntry {
  userId: number;
  email: string;
  totalAsset: number;
  returnRate: number;
  tradeCount: number;
}

interface Portfolio {
  cash: number;
  totalAsset: number;
  marketValue: number;
  totalProfit: number;
  dailyProfit: number;
  holdings: { symbol: string; quantity: number; avgCost: number; currentPrice: number; marketValue: number; profit: number }[];
}

interface UserInfo {
  userId: number;
  email: string;
}

const App: React.FC = () => {
  const [token, setToken] = useState<string>(() => localStorage.getItem('tr_token') || '');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState('');
  const [marketData, setMarketData] = useState<MarketItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [selectedStock, setSelectedStock] = useState<string>('TR001');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const prevAssetRef = useRef<number>(0);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ userId: payload.userId, email: payload.email });
      } catch {
        setToken('');
        localStorage.removeItem('tr_token');
      }
    }
  }, []);

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('market-data', (data: MarketItem[]) => {
      setMarketData(data);
    });

    socket.on('leaderboard', (data: LeaderboardEntry[]) => {
      setLeaderboard(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchPortfolio = useCallback(() => {
    if (!token) return;
    fetch('/api/portfolio', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.totalAsset !== undefined) {
          if (prevAssetRef.current !== 0 && prevAssetRef.current !== data.totalAsset) {
            setFlashKey((k) => k + 1);
          }
          prevAssetRef.current = data.totalAsset;
          setPortfolio(data);
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (token) fetchPortfolio();
    const interval = setInterval(() => {
      if (token) fetchPortfolio();
    }, 5000);
    return () => clearInterval(interval);
  }, [token, fetchPortfolio]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = isRegister ? '/api/register' : '/api/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.error) {
        setAuthError(data.error);
      } else {
        setToken(data.token);
        setUser({ userId: data.userId, email: data.email });
        localStorage.setItem('tr_token', data.token);
      }
    } catch {
      setAuthError('网络错误');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setPortfolio(null);
    localStorage.removeItem('tr_token');
  };

  const handleTrade = async (symbol: string, side: 'buy' | 'sell', quantity: number) => {
    if (!token) return null;
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ symbol, side, quantity }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPortfolio();
      }
      return data;
    } catch {
      return { error: '网络错误' };
    }
  };

  if (!token || !user) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard} className="fade-in">
          <h1 style={styles.authTitle}>TradeRush</h1>
          <p style={styles.authSubtitle}>模拟股票交易竞赛平台</p>
          <form onSubmit={handleAuth} style={styles.authForm}>
            <input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.authInput}
              required
            />
            <input
              type="password"
              placeholder="密码（至少6位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.authInput}
              required
              minLength={6}
            />
            {authError && <p style={styles.authError}>{authError}</p>}
            <button type="submit" style={styles.authButton}>
              {isRegister ? '注册' : '登录'}
            </button>
          </form>
          <p style={styles.authSwitch}>
            {isRegister ? '已有账户？' : '没有账户？'}
            <span style={styles.authSwitchLink} onClick={() => { setIsRegister(!isRegister); setAuthError(''); }}>
              {isRegister ? '立即登录' : '立即注册'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  const formatMoney = (v: number) => v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const profitColor = (v: number) => (v >= 0 ? '#4caf50' : '#f44336');
  const profitSign = (v: number) => (v >= 0 ? '+' : '');

  return (
    <div style={styles.layout}>
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.brandName}>TradeRush</span>
          <button style={styles.drawerToggle} onClick={() => setDrawerOpen(!drawerOpen)}>☰</button>
        </div>
        {portfolio && (
          <div style={styles.assetBar} key={flashKey} className={flashKey > 0 ? 'flash' : ''}>
            <div style={styles.assetItem}>
              <span style={styles.assetLabel}>总资产</span>
              <span style={styles.assetValue}>{formatMoney(portfolio.totalAsset)}</span>
            </div>
            <div style={styles.assetItem}>
              <span style={styles.assetLabel}>可用资金</span>
              <span style={styles.assetValue}>{formatMoney(portfolio.cash)}</span>
            </div>
            <div style={styles.assetItem}>
              <span style={styles.assetLabel}>持仓市值</span>
              <span style={styles.assetValue}>{formatMoney(portfolio.marketValue)}</span>
            </div>
            <div style={styles.assetItem}>
              <span style={styles.assetLabel}>当日盈亏</span>
              <span style={{ ...styles.assetValue, color: profitColor(portfolio.dailyProfit) }}>
                {profitSign(portfolio.dailyProfit)}{formatMoney(portfolio.dailyProfit)}
              </span>
            </div>
          </div>
        )}
        <div style={styles.navRight}>
          <span style={styles.userEmail}>{user.email}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>登出</button>
        </div>
      </nav>

      <div style={styles.mainContent}>
        <div style={{ ...styles.sidebar, ...(window.innerWidth < 768 ? (drawerOpen ? styles.sidebarDrawerOpen : styles.sidebarDrawerClosed) : {}) }}>
          <Leaderboard entries={leaderboard} currentUserId={user.userId} />
        </div>
        {drawerOpen && window.innerWidth < 768 && (
          <div style={styles.overlay} onClick={() => setDrawerOpen(false)} />
        )}
        <div style={styles.centerContent} className="fade-in">
          <TradePanel
            marketData={marketData}
            portfolio={portfolio}
            selectedStock={selectedStock}
            onSelectStock={setSelectedStock}
            onTrade={handleTrade}
          />
          <ChartView
            symbol={selectedStock}
            marketData={marketData}
            socketRef={socketRef}
          />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  layout: {
    minHeight: '100vh',
    background: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    height: 56,
    background: 'linear-gradient(135deg, #0f3460, #16213e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  brandName: {
    fontSize: 22,
    fontWeight: 700,
    color: '#e94560',
    letterSpacing: 1,
  },
  drawerToggle: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: 22,
    cursor: 'pointer',
  },
  assetBar: {
    display: 'flex',
    gap: 24,
    alignItems: 'center',
  },
  assetItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  assetLabel: {
    fontSize: 11,
    color: '#8892b0',
    marginBottom: 2,
  },
  assetValue: {
    fontSize: 15,
    fontWeight: 600,
    color: '#e0e0e0',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  userEmail: {
    fontSize: 13,
    color: '#a0aec0',
  },
  logoutBtn: {
    background: 'rgba(233,69,96,0.2)',
    border: '1px solid #e94560',
    color: '#e94560',
    borderRadius: 6,
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: 13,
    transition: 'all 0.2s ease',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  sidebar: {
    width: 280,
    background: '#16213e',
    borderRight: '1px solid #0f3460',
    overflowY: 'auto' as const,
    padding: 12,
    transition: 'transform 0.3s ease',
  },
  sidebarDrawerOpen: {
    position: 'fixed' as const,
    right: 0,
    top: 56,
    bottom: 0,
    zIndex: 200,
    transform: 'translateX(0)',
  },
  sidebarDrawerClosed: {
    position: 'fixed' as const,
    right: 0,
    top: 56,
    bottom: 0,
    zIndex: 200,
    transform: 'translateX(100%)',
  },
  overlay: {
    position: 'fixed' as const,
    top: 56,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 150,
  },
  centerContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'auto',
    padding: 16,
    gap: 16,
  },
  authContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a2e',
  },
  authCard: {
    background: '#16213e',
    borderRadius: 12,
    padding: 40,
    width: 400,
    maxWidth: '90vw',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  authTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: '#e94560',
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#8892b0',
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  },
  authInput: {
    background: '#0f3460',
    border: '1px solid #1a3a5c',
    borderRadius: 6,
    padding: '12px 16px',
    color: '#e0e0e0',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  authError: {
    color: '#f44336',
    fontSize: 13,
    textAlign: 'center' as const,
  },
  authButton: {
    background: '#e94560',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  authSwitch: {
    marginTop: 20,
    textAlign: 'center' as const,
    fontSize: 13,
    color: '#8892b0',
  },
  authSwitchLink: {
    color: '#e94560',
    cursor: 'pointer',
    marginLeft: 4,
    textDecoration: 'underline',
  },
};

export default App;
