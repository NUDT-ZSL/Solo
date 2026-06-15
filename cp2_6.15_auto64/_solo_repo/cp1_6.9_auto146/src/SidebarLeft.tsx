import type { Snapshot } from './types';

interface Props {
  snapshots: Snapshot[];
  onRollback: (snapshotId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

const SidebarLeft = ({ snapshots, onRollback, isOpen, onClose }: Props) => {
  return (
    <>
      {isOpen && <div className="drawer-overlay mobile-only" onClick={onClose} />}
      <aside className={`sidebar-left ${isOpen ? 'drawer-open' : ''}`}>
        <div className="sidebar-header">
          <h3>📜 历史快照</h3>
          <button className="icon-btn mobile-only" onClick={onClose}>×</button>
        </div>
        <div className="sidebar-content">
          {snapshots.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🕑</div>
              <p>暂无快照</p>
              <p className="empty-hint">系统每60秒自动保存，或点击右上角手动保存</p>
            </div>
          ) : (
            <div className="snapshot-list">
              {snapshots.map((snap, idx) => (
                <div key={snap.id} className={`snapshot-item ${idx === 0 ? 'latest' : ''}`}>
                  <div className="snapshot-meta">
                    <div className="snapshot-time">
                      {idx === 0 && <span className="latest-badge">最新</span>}
                      <span className="time-value">{formatTime(snap.timestamp)}</span>
                    </div>
                    <div className="snapshot-stats">
                      <span className="stat-chip">📌 {snap.nodes.length}</span>
                      <span className="stat-chip">🔗 {snap.connections.length}</span>
                    </div>
                  </div>
                  <button
                    className="rollback-btn"
                    onClick={() => {
                      if (window.confirm(`确定回滚到 ${formatTime(snap.timestamp)} 的版本吗？当前所有未保存的更改将丢失。`)) {
                        onRollback(snap.id);
                      }
                    }}
                  >
                    ↩️ 回滚
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="sidebar-footer">
          <div className="footer-hint">最多保留 10 个快照</div>
        </div>
      </aside>
    </>
  );
};

export default SidebarLeft;
