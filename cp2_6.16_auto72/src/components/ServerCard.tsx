import React from 'react';
import { ServerData, ALERT_RULES, HealthStatus } from '../types';
import MetricChart from './MetricChart';

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

export const ServerCard: React.FC<ServerCardProps> = React.memo(({ server, hasAlert, alertMessages }) => {
  const status = getHealthStatus(server);
  const statusColor = getStatusColor(status);

  return (
    <div
      style={{
        width: '48%',
        height: 320,
        background: '#1e293b',
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        border: hasAlert ? '2px solid #ef4444' : '2px solid transparent',
        animation: hasAlert ? 'pulseBorder 0.5s ease-in-out infinite' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 16, color: '#94a3b8', fontWeight: 500 }}>{server.name}</span>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: statusColor,
            boxShadow: `0 0 6px ${statusColor}80`,
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {METRIC_CONFIG.map((metric) => {
          const value = server[metric.key];
          const isOver = ALERT_RULES.find((r) => r.metric === metric.key)!;
          const isAlert = value > isOver.threshold;
          return (
            <div key={metric.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#94a3b8', width: 32, flexShrink: 0 }}>{metric.label}</span>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  background: '#334155',
                  borderRadius: 3,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${value}%`,
                    height: '100%',
                    background: metric.color,
                    borderRadius: 3,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: isAlert ? '#ef4444' : '#e2e8f0',
                  width: 48,
                  textAlign: 'right',
                  flexShrink: 0,
                  transition: 'color 0.2s',
                }}
              >
                {value.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <MetricChart title="CPU" data={server.cpuHistory} color="#3b82f6" />
      </div>
    </div>
  );
});

ServerCard.displayName = 'ServerCard';

export default ServerCard;
