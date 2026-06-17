import React, { useState, useEffect, useRef, useCallback } from 'react';
import CampaignCreator from './components/CampaignCreator';
import Dashboard from './components/Dashboard';
import { getCampaigns, Campaign, TotalStats, TimeSeriesPoint } from './utils/api';

const App: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<TotalStats>({ totalIssued: 0, totalClaimed: 0, totalRedeemed: 0 });
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await getCampaigns();
      setCampaigns(data);
    } catch { }
  }, []);

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3001/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'stats_update') {
          setStats(data.stats);
          if (data.timeSeries) {
            setTimeSeries(data.timeSeries);
          }
          fetchCampaigns();
        }
      } catch { }
    };

    ws.onclose = () => {
      reconnectRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [fetchCampaigns]);

  useEffect(() => {
    fetchCampaigns();
    connectWebSocket();

    const pollInterval = setInterval(async () => {
      try {
        const data = await getCampaigns();
        setCampaigns(data);
      } catch { }
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [fetchCampaigns, connectWebSocket]);

  return (
    <div style={appStyle}>
      <style>{globalCSS}</style>
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>优惠券促销驾驶舱</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>实时追踪优惠券发放、领取与核销数据</p>
        </div>
        <button
          onClick={() => setShowCreator(true)}
          style={createBtnStyle}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(76,175,80,0.35)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(76,175,80,0.2)'; }}
        >
          + 创建活动
        </button>
      </header>
      <main style={mainStyle}>
        <Dashboard
          campaigns={campaigns}
          stats={stats}
          timeSeries={timeSeries}
          onStatusChange={fetchCampaigns}
        />
      </main>
      {showCreator && (
        <CampaignCreator
          onClose={() => setShowCreator(false)}
          onCreated={fetchCampaigns}
        />
      )}
    </div>
  );
};

const globalCSS = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #F5F7FA;
    color: #333;
    -webkit-font-smoothing: antialiased;
  }
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }
`;

const appStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#F5F7FA',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 32px',
  background: '#fff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const mainStyle: React.CSSProperties = {
  maxWidth: '1400px',
  margin: '0 auto',
  padding: '24px 32px',
};

const createBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  background: '#4CAF50',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
  boxShadow: '0 2px 8px rgba(76,175,80,0.2)',
};

export default App;
