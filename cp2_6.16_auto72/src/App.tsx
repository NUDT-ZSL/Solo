import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ServerData, ALERT_RULES, HealthStatus, Notification } from './types';
import { useServerData } from './hooks/useServerData';
import ServerCard from './components/ServerCard';

function getHealthStatus(server: ServerData): HealthStatus {
  let alertCount = 0;
  for (const rule of ALERT_RULES) {
    if (server[rule.metric] > rule.threshold) {
      alertCount++;
    }
  }
  if (alertCount >= 2) return 'critical';
  if (alertCount === 1) return 'warning';
  return 'healthy';
}

function getStatusLabel(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return '正常';
    case 'warning':
      return '告警';
    case 'critical':
      return '严重';
  }
}

function getStatusColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return '#10b981';
    case 'warning':
      return '#f59e0b';
    case 'critical':
      return '#ef4444';
  }
}

const INTERVAL_OPTIONS = [
  { value: 1000, label: '1 秒' },
  { value: 3000, label: '3 秒' },
  { value: 5000, label: '5 秒' },
];

const App: React.FC = () => {
  const [intervalMs, setIntervalMs] = useState(1000);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const servers = useServerData(intervalMs);
  const prevAlertsRef = useRef<Map<string, string[]>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newAlerts = new Map<string, string[]>();
    for (const server of servers) {
      const alerts: string[] = [];
      for (const rule of ALERT_RULES) {
        if (server[rule.metric] > rule.threshold) {
          alerts.push(`${rule.label} ${server[rule.metric].toFixed(1)}%`);
        }
      }
      newAlerts.set(server.id, alerts);

      const prevAlerts = prevAlertsRef.current.get(server.id) || [];
      const newAlertMessages = alerts.filter((a) => !prevAlerts.includes(a));

      for (const msg of newAlertMessages) {
        const notification: Notification = {
          id: `${server.id}-${Date.now()}-${Math.random()}`,
          serverId: server.id,
          serverName: server.name,
          message: `服务器${server.name}：${msg}`,
          timestamp: Date.now(),
        };
        setNotifications((prev) => [...prev, notification]);

        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        }, 5000);
      }
    }
    prevAlertsRef.current = newAlerts;
  }, [servers]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleIntervalChange = useCallback((value: number) => {
    setIntervalMs(value);
    setDropdownOpen(false);
  }, []);

  const serverAlerts = servers.map((server) => {
    const alerts: string[] = [];
    for (const rule of ALERT_RULES) {
      if (server[rule.metric] > rule.threshold) {
        alerts.push(`${rule.label} ${server[rule.metric].toFixed(1)}%`);
      }
    }
    return { serverId: server.id, alerts, hasAlert: alerts.length > 0 };
  });

  const currentIntervalLabel = INTERVAL_OPTIONS.find((o) => o.value === intervalMs)?.label || '1 秒';

  return (
    <div
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        minWidth: 1200,
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes pulseBorder {
          0%, 100% { box-shadow: 0 0 4px #ef4444; }
          50% { box-shadow: 0 0 16px #ef4444; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
          服务器监控仪表盘
        </h1>
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              width: 120,
              height: 36,
              borderRadius: 8,
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#e2e8f0',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',
              transition: 'background 0.2s, box-shadow 0.2s',
            }}
          >
            <span>{currentIntervalLabel}</span>
            <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </button>
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 40,
                right: 0,
                width: 120,
                background: '#1e293b',
                borderRadius: 8,
                border: '1px solid #334155',
                overflow: 'hidden',
                zIndex: 100,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => handleIntervalChange(opt.value)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    color: opt.value === intervalMs ? '#3b82f6' : '#e2e8f0',
                    background: opt.value === intervalMs ? '#1e3a5f' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (opt.value !== intervalMs) {
                      (e.target as HTMLElement).style.background = '#334155';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (opt.value !== intervalMs) {
                      (e.target as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'nowrap' }}>
        {servers.map((server) => {
          const status = getHealthStatus(server);
          const color = getStatusColor(status);
          const label = getStatusLabel(status);
          const alertInfo = serverAlerts.find((a) => a.serverId === server.id);
          return (
            <div
              key={server.id}
              style={{
                width: 200,
                height: 120,
                background: '#1e293b',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'default',
                transition: 'transform 0.2s, box-shadow 0.2s',
                borderRight: '1px solid #334155',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{server.name}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color, transition: 'color 0.2s' }}>
                {alertInfo?.alerts.length || 0}
              </div>
              <div style={{ fontSize: 12, color, marginTop: 4, transition: 'color 0.2s' }}>{label}</div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'space-between',
        }}
      >
        {servers.map((server) => {
          const alertInfo = serverAlerts.find((a) => a.serverId === server.id);
          return (
            <ServerCard
              key={server.id}
              server={server}
              hasAlert={alertInfo?.hasAlert || false}
              alertMessages={alertInfo?.alerts || []}
            />
          );
        })}
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 1000,
        }}
      >
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              width: 280,
              height: 56,
              borderRadius: 8,
              background: '#dc2626',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              fontSize: 13,
              animation: 'slideIn 0.3s ease-out',
              boxShadow: '0 4px 12px rgba(220,38,38,0.4)',
              boxSizing: 'border-box',
            }}
          >
            {n.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
