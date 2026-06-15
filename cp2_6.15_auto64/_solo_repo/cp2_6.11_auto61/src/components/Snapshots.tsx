import React from 'react';

interface Snapshot {
  id: string;
  dataUrl: string;
  timestamp: number;
}

interface SnapshotsProps {
  snapshots: Snapshot[];
  activeSnapshot: string | null;
  onSnapshotClick: (id: string) => void;
  onSnapshotDelete: (id: string, e: React.MouseEvent) => void;
}

const Snapshots: React.FC<SnapshotsProps> = ({
  snapshots,
  activeSnapshot,
  onSnapshotClick,
  onSnapshotDelete,
}) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="snapshots-container">
      {snapshots.length === 0 ? (
        <div className="empty-snapshots">
          点击「捕获这一刻」保存你的艺术作品
        </div>
      ) : (
        snapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className={`snapshot-item ${activeSnapshot === snapshot.id ? 'active' : ''}`}
            onClick={() => onSnapshotClick(snapshot.id)}
            title={`${formatTime(snapshot.timestamp)} - 点击${activeSnapshot === snapshot.id ? '取消' : '叠加'}`}
          >
            <img src={snapshot.dataUrl} alt={`快照 ${formatTime(snapshot.timestamp)}`} />
            <div
              className="snapshot-delete"
              onClick={(e) => onSnapshotDelete(snapshot.id, e)}
            >
              ×
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Snapshots;
