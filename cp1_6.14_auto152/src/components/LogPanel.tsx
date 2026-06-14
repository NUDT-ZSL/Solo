import React, { useEffect, useRef } from 'react';
import type { LogEntry } from '../types';

interface LogPanelProps {
  logs: LogEntry[];
}

export const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="log-panel">
      <div className="log-panel-title">📜 冒险日志</div>
      <div className="log-panel-list" ref={listRef}>
        {logs.map((log) => (
          <div key={log.id} className={`log-entry type-${log.type}`}>
            {log.message}
          </div>
        ))}
      </div>
    </div>
  );
};
