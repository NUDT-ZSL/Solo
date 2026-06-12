import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useSocket } from './hooks/useSocket';

interface InventoryItem {
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

interface DashboardData {
  totalCategories: number;
  totalQuantity: number;
  lowStockCount: number;
  expiringCount: number;
  trend: { date: string; inbound: number; outbound: number }[];
}

interface InventoryContextValue {
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

function DashboardPage() {
  const { dashboard } = useInventory();
  if (!dashboard) return <div style={{ padding: 24 }}>Loading...</div>;

  const cards = [
    { label: '品类总数', value: dashboard.totalCategories, color: '#4a9eff' },
    { label: '库存总量', value: dashboard.totalQuantity.toLocaleString(), color: '#34d399' },
    { label: '低库存数', value: dashboard.lowStockCount, color: '#fbbf24' },
    { label: '即将过期', value: dashboard.expiringCount, color: '#f87171' },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 22, fontWeight: 600 }}>仪表盘</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map((card) => (
          <div key={card.label} className="glass-card" style={{ padding: 20 }}>
            <div style={{ color: '#8899aa', fontSize: 13, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>
      <div className="glass-card" style={{ padding: 20 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16 }}>近30天出入库趋势</h3>
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 160 }}>
          {dashboard.trend.slice(-15).map((d) => {
            const maxVal = Math.max(...dashboard.trend.map((t) => Math.max(t.inbound, t.outbound)), 1);
            const inH = (d.inbound / maxVal) * 140;
            const outH = (d.outbound / maxVal) * 140;
            return (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 150 }}>
                  <div style={{ width: 8, height: inH, background: '#4a9eff', borderRadius: 2 }} title={`入库: ${d.inbound}`} />
                  <div style={{ width: 8, height: outH, background: '#f87171', borderRadius: 2 }} title={`出库: ${d.outbound}`} />
                </div>
                <div style={{ fontSize: 9, color: '#6b7f94' }}>{d.date.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InventoryList() {
  const { items, refreshData } = useInventory();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const paged = items.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 22, fontWeight: 600 }}>库存列表</h2>
      <div className="glass-card" style={{ padding: 16, overflowX: 'auto' }}>
        <table>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {['名称', '品类', '数量', '库区', '安全库存', '状态'].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, color: '#8899aa', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px 12px', fontSize: 14 }}>{item.name}</td>
                <td style={{ padding: '10px 12px', fontSize: 14, color: '#8899aa' }}>{item.category}</td>
                <td style={{ padding: '10px 12px', fontSize: 14 }}>{item.quantity}</td>
                <td style={{ padding: '10px 12px', fontSize: 14, color: '#8899aa' }}>{item.storage_area}</td>
                <td style={{ padding: '10px 12px', fontSize: 14, color: '#8899aa' }}>{item.safety_stock}</td>
                <td style={{ padding: '10px 12px', fontSize: 14 }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 12,
                    background: item.status === 'normal' ? 'rgba(52,211,153,0.15)' : item.status === 'low_stock' ? 'rgba(251,191,36,0.15)' : item.status === 'critical' ? 'rgba(248,113,113,0.15)' : 'rgba(248,113,113,0.25)',
                    color: item.status === 'normal' ? '#34d399' : item.status === 'low_stock' ? '#fbbf24' : '#f87171',
                  }}>
                    {item.status === 'normal' ? '正常' : item.status === 'low_stock' ? '低库存' : item.status === 'critical' ? '紧急' : '缺货'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
        {Array.from({ length: Math.ceil(items.length / pageSize) }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: page === i + 1 ? '#4a9eff' : 'rgba(255,255,255,0.08)',
              color: page === i + 1 ? '#fff' : '#8899aa',
              fontSize: 13,
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function HeatmapPage() {
  const { items } = useInventory();
  const areas = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
  const areaData = areas.map((area) => {
    const areaItems = items.filter((i) => i.storage_area === area);
    const totalQty = areaItems.reduce((s, i) => s + i.quantity, 0);
    const maxCap = areaItems.reduce((s, i) => s + i.max_capacity, 0);
    const ratio = maxCap > 0 ? totalQty / maxCap : 0;
    return { area, totalQty, maxCap, ratio, itemCount: areaItems.length };
  });

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 22, fontWeight: 600 }}>仓库热力图</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {areaData.map((d) => {
          const hue = d.ratio < 0.3 ? 200 : d.ratio < 0.7 ? 50 : 0;
          const saturation = 70;
          const lightness = 45 + (1 - d.ratio) * 15;
          return (
            <div key={d.area} className="glass-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: `hsl(${hue}, ${saturation}%, ${lightness}%)` }}>
                {d.area}
              </div>
              <div style={{ fontSize: 13, color: '#8899aa', marginBottom: 4 }}>物品数: {d.itemCount}</div>
              <div style={{ fontSize: 13, color: '#8899aa', marginBottom: 4 }}>库存量: {d.totalQty}</div>
              <div style={{ fontSize: 13, color: '#8899aa', marginBottom: 8 }}>容量: {d.maxCap}</div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(d.ratio * 100, 100)}%`, background: `hsl(${hue}, ${saturation}%, ${lightness}%)`, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 11, color: '#6b7f94', marginTop: 4 }}>{Math.round(d.ratio * 100)}% 占用</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PredictionPage() {
  const [predictions, setPredictions] = useState<Array<{ id: string; name: string; category: string; recentConsumption: number; predictedConsumption: number; suggestedReplenishment: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/inventory/prediction?days=7&factor=1.2')
      .then((r) => r.json())
      .then((data) => {
        setPredictions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  const needsReplenishment = predictions.filter((p) => p.suggestedReplenishment > 0);

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 22, fontWeight: 600 }}>补货预测</h2>
      <div className="glass-card" style={{ padding: 16, overflowX: 'auto' }}>
        <table>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {['名称', '品类', '近期消耗', '预测消耗(7天)', '建议补货'].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 13, color: '#8899aa', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {needsReplenishment.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px 12px', fontSize: 14 }}>{p.name}</td>
                <td style={{ padding: '10px 12px', fontSize: 14, color: '#8899aa' }}>{p.category}</td>
                <td style={{ padding: '10px 12px', fontSize: 14 }}>{p.recentConsumption}</td>
                <td style={{ padding: '10px 12px', fontSize: 14 }}>{p.predictedConsumption}</td>
                <td style={{ padding: '10px 12px', fontSize: 14, color: '#fbbf24', fontWeight: 600 }}>{p.suggestedReplenishment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    fetch('/api/inventory?pageSize=100')
      .then((r) => r.json())
      .then((data) => setItems(data.data))
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
    const itemName = (payload.item as Record<string, unknown>?.name as string) || '未知物品';

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
              {isConnected ? '已连接' : '未连接'}
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
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/inventory" element={<InventoryList />} />
                <Route path="/heatmap" element={<HeatmapPage />} />
                <Route path="/prediction" element={<PredictionPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
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
            minWidth: 220,
          }}
        >
          <div style={{ fontSize: 12, color: '#4a9eff', marginBottom: 4 }}>库存变更</div>
          <div style={{ fontSize: 14, color: '#f0f4f8' }}>
            {activeNotification.itemName}
            <span style={{ color: '#8899aa', marginLeft: 8 }}>
              {actionLabels[activeNotification.action] || activeNotification.action}
            </span>
          </div>
        </div>
      )}
    </InventoryContext.Provider>
  );
}

export default App;
