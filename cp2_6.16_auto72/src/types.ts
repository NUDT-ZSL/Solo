export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface ServerData {
  id: string;
  name: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  cpuHistory: MetricPoint[];
  memoryHistory: MetricPoint[];
  diskHistory: MetricPoint[];
  networkHistory: MetricPoint[];
}

export interface AlertRule {
  metric: keyof Pick<ServerData, 'cpu' | 'memory' | 'disk' | 'network'>;
  threshold: number;
  label: string;
}

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface Notification {
  id: string;
  serverId: string;
  serverName: string;
  message: string;
  timestamp: number;
}

export const ALERT_RULES: AlertRule[] = [
  { metric: 'cpu', threshold: 85, label: 'CPU' },
  { metric: 'memory', threshold: 90, label: '内存' },
  { metric: 'disk', threshold: 80, label: '磁盘' },
  { metric: 'network', threshold: 95, label: '网络' },
];

export const MAX_HISTORY_LENGTH = 60;

export const SERVER_NAMES = ['Alpha-01', 'Beta-02', 'Gamma-03', 'Delta-04'];
