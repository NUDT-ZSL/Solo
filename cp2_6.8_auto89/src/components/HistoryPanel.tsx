import type { Action } from '../Types';

interface Props {
  history: Action[];
  onRollback: (index: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function HistoryPanel({ history, onRollback, isOpen, onClose }: Props) {
  const reversed = [...history].reverse();
  const originalIndex = (idx: number) => history.length - 1 - idx;

  return (
    <>
      <div className={`backdrop ${isOpen ? 'visible' : ''}`} onClick={onClose} />
      <aside className={`history-panel ${isOpen ? 'open' : ''}`}>
        <h2 className="history-panel-title">操作历史</h2>
        {reversed.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#9CA3AF' }}>暂无操作记录</div>
        ) : (
          <div className="timeline">
            {reversed.map((action, idx) => (
              <div key={`${action.timestamp}-${idx}`} className="timeline-item">
                <div className="timeline-text">
                  <strong>{action.nickname}</strong> {action.description}
                </div>
                <div className="timeline-time">{formatTime(action.timestamp)}</div>
                {action.type !== 'ROLLBACK' && (
                  <button
                    className="rollback-btn"
                    onClick={() => {
                      if (confirm(`确定回滚到该操作点吗？之后的所有操作将被撤销。`)) {
                        onRollback(originalIndex(idx));
                      }
                    }}
                    type="button"
                  >
                    还原到此
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
