import React from 'react';
import { ServerData, ALERT_RULES, HealthStatus } from '../types';
import MetricChart from './MetricChart';
import './ServerCard.css';

interface ServerCardProps {
  server: ServerData;
  hasAlert: boolean;
  alertMessages: string[];
}

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

const METRIC_CONFIG = [
  { key: 'cpu' as const, label: 'CPU', color: '#3b82f6' },
  { key: 'memory' as const, label: '内存', color: '#8b5cf6' },
  { key: 'disk' as const, label: '磁盘', color: '#10b981' },
  { key: 'network' as const, label: '网络', color: '#f59e0b' },
];

export const ServerCard: React.FC<ServerCardProps> = React.memo(({ server, hasAlert }) => {
  const status = getHealthStatus(server);
  const statusColor = getStatusColor(status);

  const cardClass = hasAlert ? 'server-card server-card-alert' : 'server-card';

  return (
    <div className={cardClass}>
      <div className="server-card-header">
        <span className="server-card-name">{server.name}</span>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: statusColor,
            boxShadow: `0 0 6px ${statusColor}80`,
            flexShrink: 0,
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
        />
      </div>

      <div className="server-card-metrics">
        {METRIC_CONFIG.map((metric) => {
          const value = server[metric.key];
          const rule = ALERT_RULES.find((r) => r.metric === metric.key)!;
          const isAlert = value > rule.threshold;
          return (
            <div key={metric.key} className="metric-row">
              <span className="metric-label">{metric.label}</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${value}%`,
                    background: metric.color,
                  }}
                />
              </div>
              <span className={`metric-value ${isAlert ? 'metric-alert' : ''}`}>
                {value.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="server-card-chart">
        <MetricChart title="CPU使用率" data={server.cpuHistory} color="#3b82f6" />
      </div>
    </div>
  );
});

ServerCard.displayName = 'ServerCard';

export default ServerCard;
