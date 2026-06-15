import React from 'react';
import { History } from 'lucide-react';
import type { HistorySnapshot, ThemeColors } from '@/store/types';

interface Props {
  history: HistorySnapshot[];
  onRestore: (snapshotId: string) => void;
}

const COLOR_ORDER: (keyof ThemeColors)[] = [
  'primary',
  'secondary',
  'background',
  'text',
  'accent',
];

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const formatDate = (ts: number): string => {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return '今天';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const HistoryPanel: React.FC<Props> = React.memo(function HistoryPanel({
  history,
  onRestore,
}) {
  if (history.length === 0) {
    return (
      <div className="empty-hint">
        <History size={18} style={{ marginBottom: 6, opacity: 0.6 }} />
        还没有保存的版本快照
        <br />
        点击「保存版本」记录当前配色
      </div>
    );
  }

  return (
    <div className="history-list">
      {history.map((snap, idx) => (
        <div
          key={snap.id}
          className="history-item"
          onClick={() => onRestore(snap.id)}
          title="点击恢复到此版本"
        >
          <div className="history-item__swatches">
            {COLOR_ORDER.map((k) => (
              <div
                key={k}
                className="history-item__swatch"
                style={{ backgroundColor: snap.colors[k] }}
              />
            ))}
          </div>
          <div className="history-item__meta">
            <span className="history-item__time">
              {snap.label || `版本 V${history.length - idx}`}
            </span>
            <span className="history-item__sub">
              {formatDate(snap.timestamp)} · {formatTime(snap.timestamp)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

export default HistoryPanel;
