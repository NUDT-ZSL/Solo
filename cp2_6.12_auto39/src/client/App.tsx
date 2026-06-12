import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useSocket } from './hooks/useSocket';
import DashboardPage from './pages/DashboardPage';
import HeatmapPage from './pages/HeatmapPage';
import PredictionPage from './pages/PredictionPage';
import InventoryList from './components/InventoryList';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  storage_area: string;
  safety_stock: number;
  max_capacity: number;
  expiry_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: number;
  itemName: string;
  action: string;
  timestamp: number;
}

export interface DashboardData {
  totalCategories: number;
  totalQuantity: number;
  lowStockCount: number;
  expiringCount: number;
  trend: { date: string; inbound: number; outbound: number }[];
}

export interface InventoryContextValue {
  items: InventoryItem[];
  dashboard: DashboardData | null;
  notifications: Notification[];
  refreshData: () => void;
}

const InventoryContext = createContext<InventoryContextValue>({
  items: [],
  dashboard: null,
  notifications: [],
  refreshData: () => {},
});

export function useInventory() {
  return useContext(InventoryContext);
}

const navItems = [
  { path: '/', label: '仪表盘', icon: '📊' },
  { path: '/inventory', label: '库存列表', icon: '📦' },
  { path: '/heatmap', label: '热力图', icon: '🗺️' },
  { path: '/prediction', label: '补货预测', icon: '🔮' },
];

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div key={location.pathname} style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <Routes location={location}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryList />} />
        <Route path="/heatmap" element={<HeatmapPage />} />
        <Route path="/prediction" element={<PredictionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

let notificationId = 0;

function App() {
  const { lastMessage, isConnected } = useSocket();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);

  const fetchItems = useCallback(() => {
    fetch('/api/inventory?pageSize=200')
      .then((r) => r.json())
      .then((data) => setItems(data.data || []))
      .catch(() => {});
  }, []);

  const fetchDashboard = useCallback(() => {
    fetch('/api/inventory/dashboard')
      .then((r) => r.json())
      .then((data) => setDashboard(data))
      .catch(() => {});
  }, []);

  const refreshData = useCallback(() => {
    fetchItems();
    fetchDashboard();
  }, [fetchItems, fetchDashboard]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'INVENTORY_CHANGE') return;

    const payload = lastMessage.payload;
    const action = (payload.action as string) || 'change';
    let itemName = '未知物品';
    if (payload.item && typeof (payload.item as Record<string, unknown>).name === 'string') {
      itemName = (payload.item as Record<string, unknown>).name as string;
    }

    const notif: Notification = {
      id: ++notificationId,
      itemName,
      action,
      timestamp: Date.now(),
    };

    setNotifications((prev) => [notif, ...prev].slice(0, 50));
    setActiveNotification(notif);
    refreshData();

    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [lastMessage, refreshData]);

  const actionLabels: Record<string, string> = {
    create: '新增',
    update: '更新',
    delete: '删除',
    'batch-status': '批量状态变更',
  };

  return (
    <InventoryContext.Provider value={{ items, dashboard, notifications, refreshData }}>
      <BrowserRouter>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <nav style={{
            width: 220,
            minWidth: 220,
            background: '#0d1520',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 0',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ padding: '0 20px', marginBottom: 32 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f0f4f8' }}>虚拟仓库</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: isConnected ? '#34d399' : '#f87171' }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isConnected ? '#34d399' : '#f87171',
                  display: 'inline-block',
                }} />
                {isConnected ? '实时已连接' : '连接断开'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 20px',
                    fontSize: 14,
                    color: isActive ? '#4a9eff' : '#8899aa',
                    textDecoration: 'none',
                    borderLeft: isActive ? '3px solid #4a9eff' : '3px solid transparent',
                    background: isActive ? 'rgba(74, 158, 255, 0.08)' : 'transparent',
                    transition: 'all 0.2s',
                  })}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>

          <main style={{ flex: 1, padding: 24, overflowY: 'auto', maxHeight: '100vh' }}>
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
              <AnimatedRoutes />
            </div>
          </main>
        </div>

        {activeNotification && (
          <div
            className="notification-enter"
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              background: 'rgba(20, 35, 55, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(74, 158, 255, 0.3)',
              borderRadius: 10,
              padding: '12px 18px',
              zIndex: 2000,
              minWidth: 240,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: 12, color: '#4a9eff', marginBottom: 4, fontWeight: 500 }}>库存变更通知</div>
            <div style={{ fontSize: 14, color: '#f0f4f8' }}>
              <span style={{ fontWeight: 600 }}>{activeNotification.itemName}</span>
              <span style={{ color: '#8899aa', marginLeft: 8, fontSize: 12 }}>
                · {actionLabels[activeNotification.action] || activeNotification.action}
              </span>
            </div>
          </div>
        )}
      </BrowserRouter>
    </InventoryContext.Provider>
  );
}

export default App;
