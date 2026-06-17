import { useState, useRef } from 'react';
import type { Video, Marker } from './types';
import './MarkerPanel.css';

interface MarkerPanelProps {
  videos: Video[];
  markers: Marker[];
  markersByVideo: Record<string, Marker[]>;
  selectedMarkerIds: string[];
  onToggleSelect: (markerId: string) => void;
  onSelectAll: () => void;
  onPlayMarker: (video: Video, timestamp: number) => void;
  onMarkerDeleted: (markerId: string) => void;
  onMarkersReordered: (markers: Marker[]) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function MarkerPanel({
  videos,
  markers,
  markersByVideo,
  selectedMarkerIds,
  onToggleSelect,
  onSelectAll,
  onPlayMarker,
  onMarkerDeleted,
  onMarkersReordered,
}: MarkerPanelProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragOverRef = useRef<HTMLDivElement | null>(null);

  const getVideoById = (id: string): Video | undefined => {
    return videos.find(v => v.id === id);
  };

  const handleDragStart = (e: React.DragEvent, markerId: string) => {
    setDraggedId(markerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, markerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== markerId) {
      setDragOverId(markerId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetMarkerId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetMarkerId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedMarker = markers.find(m => m.id === draggedId);
    const targetMarker = markers.find(m => m.id === targetMarkerId);

    if (!draggedMarker || !targetMarker || draggedMarker.videoId !== targetMarker.videoId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const videoMarkers = markers
      .filter(m => m.videoId === draggedMarker.videoId)
      .sort((a, b) => a.timestamp - b.timestamp);

    const draggedIndex = videoMarkers.findIndex(m => m.id === draggedId);
    const targetIndex = videoMarkers.findIndex(m => m.id === targetMarkerId);

    const newVideoMarkers = [...videoMarkers];
    const [removed] = newVideoMarkers.splice(draggedIndex, 1);
    newVideoMarkers.splice(targetIndex, 0, removed);

    const updatedVideoMarkers = newVideoMarkers.map((m, i) => ({ ...m, order: i }));

    const otherMarkers = markers.filter(m => m.videoId !== draggedMarker.videoId);
    const finalMarkers = [...otherMarkers, ...updatedVideoMarkers];

    try {
      await fetch('/api/markers/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markerIds: updatedVideoMarkers.map(m => m.id),
        }),
      });
    } catch (err) {
      console.error('排序更新失败:', err);
    }

    onMarkersReordered(finalMarkers);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDeleteMarker = async (markerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个标记吗？')) return;

    try {
      const res = await fetch(`/api/markers/${markerId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onMarkerDeleted(markerId);
      }
    } catch (err) {
      console.error('删除标记失败:', err);
    }
  };

  const videoEntries = Object.entries(markersByVideo);

  return (
    <div className="marker-panel">
      <div className="panel-header">
        <h3 className="panel-title">标记列表</h3>
        <button
          className="select-all-button"
          onClick={onSelectAll}
          disabled={markers.length === 0}
        >
          {selectedMarkerIds.length === markers.length && markers.length > 0 ? '取消全选' : '全选'}
        </button>
      </div>

      <div className="marker-list">
        {videoEntries.length === 0 && (
          <div className="empty-markers">
            <p>暂无标记</p>
            <p className="empty-hint">播放视频并按 M 键添加标记</p>
          </div>
        )}

        {videoEntries.map(([videoId, videoMarkers]) => {
          const video = getVideoById(videoId);
          if (!video) return null;

          return (
            <div key={videoId} className="video-group">
              <div className="video-group-header">
                <span className="video-group-name" title={video.name}>
                  {video.name}
                </span>
                <span className="video-group-count">
                  {videoMarkers.length}
                </span>
              </div>
              <div className="marker-items">
                {videoMarkers.map(marker => (
                  <div
                    key={marker.id}
                    className={`marker-item ${selectedMarkerIds.includes(marker.id) ? 'selected' : ''} ${draggedId === marker.id ? 'dragging' : ''} ${dragOverId === marker.id ? 'drag-over' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, marker.id)}
                    onDragOver={(e) => handleDragOver(e, marker.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, marker.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onToggleSelect(marker.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMarkerIds.includes(marker.id)}
                      onChange={() => onToggleSelect(marker.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="marker-checkbox"
                    />
                    <div
                      className="marker-thumbnail"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayMarker(video, marker.timestamp);
                      }}
                      style={{ borderLeftColor: marker.color }}
                    >
                      <div className="thumbnail-placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </div>
                    </div>
                    <div className="marker-info">
                      <span className="marker-label" style={{ color: marker.color }}>
                        {marker.label}
                      </span>
                      <span className="marker-time">{formatTime(marker.timestamp)}</span>
                    </div>
                    <button
                      className="delete-marker-button"
                      onClick={(e) => handleDeleteMarker(marker.id, e)}
                      title="删除标记"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel-footer">
        <span className="selected-count">
          已选择 {selectedMarkerIds.length} 个标记
        </span>
      </div>
    </div>
  );
}

export default MarkerPanel;
