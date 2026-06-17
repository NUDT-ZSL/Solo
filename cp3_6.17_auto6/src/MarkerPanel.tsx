import { useState } from 'react';
import type { VideoMeta, Marker } from './types';
import { formatTime } from './constants';

interface Props {
  videos: VideoMeta[];
  markers: Marker[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onClearSelection: () => void;
  onJump: (videoId: string, time: number) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export default function MarkerPanel({
  videos,
  markers,
  selectedIds,
  onToggleSelect,
  onClearSelection,
  onJump,
  onDelete,
  onReorder,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const groups = videos
    .map((v) => ({
      video: v,
      items: markers
        .filter((m) => m.videoId === v.id)
        .sort((a, b) => a.order - b.order || a.time - b.time),
    }))
    .filter((g) => g.items.length > 0);

  const handleDrop = (videoId: string) => {
    if (!dragId || !overId || dragId === overId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const group = groups.find((g) => g.video.id === videoId);
    if (!group) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const items = [...group.items];
    const fromIdx = items.findIndex((m) => m.id === dragId);
    const toIdx = items.findIndex((m) => m.id === overId);
    if (fromIdx === -1 || toIdx === -1) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    onReorder(items.map((m) => m.id));
    setDragId(null);
    setOverId(null);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <span className="sidebar-title">标记</span>
        {selectedIds.size > 0 ? (
          <button className="sidebar-count pressable" onClick={onClearSelection}>
            清除 {selectedIds.size}
          </button>
        ) : (
          <span className="sidebar-count">{markers.length}</span>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="empty">还没有标记，播放视频时按 M 键添加</div>
      ) : (
        groups.map(({ video, items }) => (
          <div className="marker-group" key={video.id}>
            <div className="marker-group-head" title={video.fileName}>
              {video.fileName}
            </div>
            {items.map((m) => (
              <div
                key={m.id}
                className={`marker-row ${dragId === m.id ? 'dragging' : ''} ${
                  overId === m.id ? 'drag-over' : ''
                }`}
                draggable
                onDragStart={() => setDragId(m.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverId(m.id);
                }}
                onDrop={() => handleDrop(video.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                onClick={() => onJump(video.id, m.time)}
              >
                <input
                  type="checkbox"
                  className="marker-check"
                  checked={selectedIds.has(m.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleSelect(m.id)}
                />
                {m.thumbnail ? (
                  <img className="marker-thumb" src={m.thumbnail} alt="" />
                ) : (
                  <div className="marker-thumb-placeholder">·</div>
                )}
                <div className="marker-body">
                  <div className="marker-label" style={{ color: m.color }}>
                    {m.label}
                  </div>
                  <div className="marker-time mono">{formatTime(m.time)}</div>
                </div>
                <button
                  className="marker-del pressable"
                  title="删除标记"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(m.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ))
      )}
    </aside>
  );
}
