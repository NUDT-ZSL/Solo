import React, { useEffect, useRef } from 'react';
import { BattleLogEntry } from '../data/GameData';

interface BattleLogProps {
  logs: BattleLogEntry[];
  onClear: () => void;
}

const BattleLog: React.FC<BattleLogProps> = ({ logs, onClear }) => {
  const logListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logListRef.current) {
      logListRef.current.scrollTop = logListRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="battle-log-container">
      <div className="glass-container">
        <div className="log-header">
          <span className="section-title" style={{ marginBottom: 0 }}>战斗日志</span>
          <button className="btn-clear-log" onClick={onClear}>清除日志</button>
        </div>
        <div className="log-list" ref={logListRef}>
          {logs.map(entry => (
            <div key={entry.id} className={`log-entry ${entry.type}`}>
              <span className="turn-badge">R{entry.turn}</span>
              {entry.message}
            </div>
          ))}
          {logs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', opacity: 0.4, fontSize: '0.85rem' }}>
              战斗尚未开始...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BattleLog;
