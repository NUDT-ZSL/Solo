import React from 'react';
import { History, Clock } from 'lucide-react';
import type { HistoryItem } from '../types';

interface HistoryPanelProps {
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onRestore }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="history-panel">
      <div className="history-header">
        <History size={16} />
        <span>历史记录</span>
        <span className="history-count">({history.length})</span>
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <Clock size={24} />
          <span>暂无历史记录</span>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item, index) => (
            <button
              key={item.id}
              className="history-card"
              onClick={() => onRestore(item)}
              title="点击恢复此状态"
            >
              <div className="history-index">状态 {history.length - index}</div>
              <div className="history-time">
                <Clock size={12} />
                {formatTime(item.timestamp)}
              </div>
              <div className="history-colors">
                {item.tokens.colors.slice(0, 4).map((c, i) => (
                  <span
                    key={i}
                    className="history-color-dot"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              <div className="history-summary">
                {item.tokens.colors.length} 色 · {item.tokens.guidelines.length} 线
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
