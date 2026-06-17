import type { DeviceStatus, RecordStatus } from '../types';

const STATUS_MAP: Record<DeviceStatus, { label: string; bg: string; color: string }> = {
  idle: { label: '空闲', bg: '#dcfce7', color: '#16a34a' },
  borrowed: { label: '被借', bg: '#fef9c3', color: '#ca8a04' },
  maintenance: { label: '维修', bg: '#fee2e2', color: '#dc2626' },
};

export function StatusBadge({ status }: { status: DeviceStatus }) {
  const s = STATUS_MAP[status];
  return (
    <span style={badgeStyle(s.bg, s.color)}>{s.label}</span>
  );
}

const RECORD_STATUS_MAP: Record<RecordStatus, { label: string; color: string }> = {
  ongoing: { label: '未归还', color: '#eab308' },
  'on-time': { label: '按时归还', color: '#22c55e' },
  overdue: { label: '超时归还', color: '#ef4444' },
};

export function RecordStatusTag({ status }: { status: RecordStatus }) {
  const s = RECORD_STATUS_MAP[status];
  return (
    <span style={tagStyle(s.color)}>{s.label}</span>
  );
}

function badgeStyle(bg: string, color: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    background: bg,
    color,
  };
}

function tagStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    background: color,
  };
}
