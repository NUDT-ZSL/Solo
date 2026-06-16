import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ServerData, ALERT_RULES, HealthStatus, Notification } from './types';
import { useServerData } from './hooks/useServerData';
import ServerCard from './components/ServerCard';
import './App.css';

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
  const prevAlertsRef = useRef<Map<string, Set<string>>>(new Map());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    for (const server of servers) {
      const alerts = new Set<string>();
      const alertMessages: string[] = [];
      for (const rule of ALERT_RULES) {
        if (server[rule.metric] > rule.threshold) {
          alerts.add(rule.metric);
          alertMessages.push(`${rule.label} ${server[rule.metric].toFixed(1)}%`);
        }
      }

      const prevAlerts = prevAlertsRef.current.get(server.id) || new Set<string>();
      for (const rule of ALERT_RULES) {
        if (alerts.has(rule.metric) && !prevAlerts.has(rule.metric)) {
          const notifId = `${server.id}-${rule.metric}-${Date.now()}`;
          const notification: Notification = {
            id: notifId,
            serverId: server.id,
            serverName: server.name,
            message: `服务器${server.name}：${rule.label} ${server[rule.metric].toFixed(1)}%`,
            timestamp: Date.now(),
          };

          setNotifications((prev) => [...prev, notification]);

          const existingTimer = timersRef.current.get(notifId);
          if (existingTimer) clearTimeout(existingTimer);
          const timer = setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== notifId));
            timersRef.current.delete(notifId);
          }, 5000);
          timersRef.current.set(notifId, timer);
        }
      }

      prevAlertsRef.current.set(server.id, alerts);
    }
  }, [servers]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

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
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">服务器监控仪表盘</h1>
        <div ref={dropdownRef} className="interval-selector">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`interval-btn ${dropdownOpen ? 'interval-btn-open' : ''}`}
          >
            <span className="interval-label">{currentIntervalLabel}</span>
            <span className="interval-arrow">▼</span>
          </button>
          {dropdownOpen && (
            <div className="interval-dropdown">
              {INTERVAL_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  className={`interval-option ${opt.value === intervalMs ? 'interval-option-active' : ''}`}
                  onClick={() => handleIntervalChange(opt.value)}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="summary-row">
        {servers.map((server) => {
          const status = getHealthStatus(server);
          const color = getStatusColor(status);
          const label = getStatusLabel(status);
          const alertInfo = serverAlerts.find((a) => a.serverId === server.id);
          return (
            <div key={server.id} className="summary-card">
              <div className="summary-name">{server.name}</div>
              <div className="summary-count" style={{ color }}>
                {alertInfo?.alerts.length || 0}
              </div>
              <div className="summary-status" style={{ color }}>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="panels-grid">
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

      <div className="notification-container">
        {notifications.map((n) => (
          <div key={n.id} className="notification-item">
            {n.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
