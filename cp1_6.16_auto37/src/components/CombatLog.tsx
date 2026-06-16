import React from 'react';
import { CombatLogEntry } from '@/gameLogic';

interface CombatLogProps {
  logs: CombatLogEntry[];
}

const CombatLog: React.FC<CombatLogProps> = ({ logs }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="combat-log-container">
      <div
        className="text-lg font-bold mb-4 text-center"
        style={{ color: '#F1C40F' }}
      >
        战斗日志
      </div>
      
      <div className="log-list">
        {logs.length === 0 ? (
          <div className="empty-log" style={{ color: '#BDC3C7' }}>
            战斗尚未开始...
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={log.id}
              className={`log-entry ${index === 0 ? 'latest' : ''}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="log-time" style={{ color: '#7F8C8D' }}>
                {formatTime(log.timestamp)}
              </div>
              <div className="log-dice">
                骰子: [{log.diceResult.dice.join(', ')}] = {log.diceResult.total}
              </div>
              <div className="log-message">
                {log.message}
              </div>
              <div className="log-damage">
                伤害: <span style={{ color: '#E74C3C' }}>{log.damage}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .combat-log-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 400px;
          background: rgba(44, 62, 80, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 12px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .log-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 8px;
        }

        .log-list::-webkit-scrollbar {
          width: 6px;
        }

        .log-list::-webkit-scrollbar-track {
          background: rgba(52, 73, 94, 0.5);
          border-radius: 3px;
        }

        .log-list::-webkit-scrollbar-thumb {
          background: #F1C40F;
          border-radius: 3px;
        }

        .log-entry {
          padding: 12px;
          background: rgba(52, 73, 94, 0.6);
          border-radius: 8px;
          font-size: 13px;
          color: #BDC3C7;
          animation: slideInLeft 0.3s ease-out both;
          will-change: transform, opacity;
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        .log-entry.latest {
          color: #3498DB;
          background: rgba(52, 152, 219, 0.15);
          border-left: 3px solid #3498DB;
          animation: slideInLeft 0.3s ease-out both, logPulse 1s ease-out;
        }

        .log-time {
          font-size: 11px;
          margin-bottom: 4px;
        }

        .log-dice {
          font-size: 12px;
          color: #F1C40F;
          margin-bottom: 4px;
        }

        .log-entry.latest .log-dice {
          color: #F4D03F;
        }

        .log-message {
          margin-bottom: 4px;
          line-height: 1.4;
        }

        .log-damage {
          font-size: 12px;
          color: #7F8C8D;
        }

        .log-entry.latest .log-damage {
          color: #BDC3C7;
        }

        .empty-log {
          text-align: center;
          padding: 40px 20px;
          font-style: italic;
        }

        @keyframes slideInLeft {
          0% {
            opacity: 0;
            transform: translateX(-30px) translateZ(0);
          }
          60% {
            opacity: 1;
            transform: translateX(5px) translateZ(0);
          }
          100% {
            opacity: 1;
            transform: translateX(0) translateZ(0);
          }
        }

        @keyframes logPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(52, 152, 219, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(52, 152, 219, 0);
          }
        }

        @media (max-width: 768px) {
          .combat-log-container {
            min-height: 300px;
            max-height: 400px;
          }
        }
      `}</style>
    </div>
  );
};

export default CombatLog;
