import type { RequestLog } from '../types';

interface LogPanelProps {
  logs: RequestLog[];
  onClearLogs: () => void;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function getStatusClass(log: RequestLog): string {
  if (log.isError) return 'log-status-error';
  if (log.isWarning) return 'log-status-warning';
  return 'log-status-success';
}

export default function LogPanel({ logs, onClearLogs }: LogPanelProps) {
  return (
    <div className="log-panel">
      <div className="log-panel-header">
        <span className="log-panel-title">请求日志 ({logs.length}/50)</span>
        <button className="clear-logs-btn" onClick={onClearLogs}>
          清空日志
        </button>
      </div>
      {logs.length === 0 ? (
        <div className="empty-logs">等待模拟请求...</div>
      ) : (
        <div className="log-list">
          {logs.map((log) => (
            <div className="log-row" key={log.id}>
              <span className="log-time">{formatTime(log.timestamp)}</span>
              <span className={`log-method log-method-${log.method}`}>{log.method}</span>
              <span className="log-url" title={log.url}>{log.url}</span>
              <span className={`log-rule ${!log.matchedRuleName ? 'log-rule-none' : ''}`} title={log.matchedRuleName || '无匹配'}>
                {log.matchedRuleName || '无匹配'}
              </span>
              <span className={`log-status ${getStatusClass(log)}`}>
                {log.statusCode}
              </span>
              <span className="log-delay">{log.delay}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
