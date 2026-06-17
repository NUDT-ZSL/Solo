import { useState, useRef, useCallback, useEffect } from 'react';
import type { Video, Marker } from './types';
import { formatTimestamp } from './types';

interface MarkerPanelProps {
  videos: Video[];
  markers: Marker[];
  selectedMarkerIds: Set<string>;
  onToggleSelection: (markerId: string) => void;
  onPlayMarker: (video: Video, timestamp: number) => void;
  onDeleteMarker: (markerId: string) => void;
  onReorderMarkers: (markers: Marker[]) => void;
}

function MarkerPanel({
  videos,
  markers,
  selectedMarkerIds,
  onToggleSelection,
  onPlayMarker,
  onDeleteMarker,
  onReorderMarkers,
}: MarkerPanelProps) {
  const [draggedMarkerId, setDraggedMarkerId] = useState<string | null>(null);
  const [dragOverMarkerId, setDragOverMarkerId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const getVideoById = useCallback(
    (id: string): Video | undefined => {
      return videos.find((v) => v.id === id);
    },
    [videos]
  );

  const groupedMarkers = markers.reduce(
    (acc, marker) => {
      if (!acc[marker.videoId]) {
        acc[marker.videoId] = [];
      }
      acc[marker.videoId].push(marker);
      return acc;
    },
    {} as Record<string, Marker[]>
  );

  Object.keys(groupedMarkers).forEach((videoId) => {
    groupedMarkers[videoId].sort((a, b) => a.order - b.order);
  });

  const handleDragStart = (e: React.DragEvent, markerId: string) => {
    setDraggedMarkerId(markerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', markerId);
  };

  const handleDragOver = (e: React.DragEvent, markerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverMarkerId !== markerId) {
      setDragOverMarkerId(markerId);
    }
  };

  const handleDragLeave = () => {
    setDragOverMarkerId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetMarkerId: string) => {
    e.preventDefault();
    if (!draggedMarkerId || draggedMarkerId === targetMarkerId) {
      setDraggedMarkerId(null);
      setDragOverMarkerId(null);
      return;
    }

    const draggedMarker = markers.find((m) => m.id === draggedMarkerId);
    const targetMarker = markers.find((m) => m.id === targetMarkerId);
    if (!draggedMarker || !targetMarker || draggedMarker.videoId !== targetMarker.videoId) {
      setDraggedMarkerId(null);
      setDragOverMarkerId(null);
      return;
    }

    const videoMarkers = [...groupedMarkers[draggedMarker.videoId]];
    const draggedIdx = videoMarkers.findIndex((m) => m.id === draggedMarkerId);
    const targetIdx = videoMarkers.findIndex((m) => m.id === targetMarkerId);

    videoMarkers.splice(draggedIdx, 1);
    videoMarkers.splice(targetIdx, 0, draggedMarker);

    const reordered: Marker[] = [];
    Object.keys(groupedMarkers).forEach((vid) => {
      if (vid === draggedMarker.videoId) {
        videoMarkers.forEach((m, idx) => {
          reordered.push({ ...m, order: idx });
        });
      } else {
        groupedMarkers[vid].forEach((m) => reordered.push(m));
      }
    });

    const allMarkersWithOrder = markers.map((m) => {
      const updated = reordered.find((r) => r.id === m.id);
      return updated ? { id: m.id, order: updated.order } : { id: m.id, order: m.order };
    });

    try {
      await fetch('/api/markers/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markers: allMarkersWithOrder }),
      });
    } catch (err) {
      console.error('Failed to reorder markers:', err);
    }

    onReorderMarkers(
      markers.map((m) => {
        const updated = reordered.find((r) => r.id === m.id);
        return updated ? updated : m;
      })
    );

    setDraggedMarkerId(null);
    setDragOverMarkerId(null);
  };

  const handleDragEnd = () => {
    setDraggedMarkerId(null);
    setDragOverMarkerId(null);
  };

  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const handleDelete = async (markerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个标记吗？')) {
      try {
        const res = await fetch(`/api/markers/${markerId}`, { method: 'DELETE' });
        if (res.ok) {
          onDeleteMarker(markerId);
        }
      } catch (err) {
        console.error('Failed to delete marker:', err);
      }
    }
  };

  const handlePlay = (marker: Marker) => {
    const video = getVideoById(marker.videoId);
    if (video) {
      onPlayMarker(video, marker.timestamp);
    }
  };

  const totalMarkers = markers.length;
  const selectedCount = selectedMarkerIds.size;

  return (
    <div
      ref={panelRef}
      style={{
        width: '100%',
        height: '100%',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#e0e0e0',
            marginBottom: '4px',
          }}
        >
          标记列表
        </h3>
        <p style={{ fontSize: '12px', color: '#888' }}>
          共 {totalMarkers} 个标记
          {selectedCount > 0 && <span style={{ color: '#ff5722' }}>（已选 {selectedCount}）</span>}
        </p>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {totalMarkers === 0 ? (
          <div
            style={{
              padding: '40px 12px',
              textAlign: 'center',
              color: '#666',
              fontSize: '13px',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#444"
              strokeWidth="1.5"
              style={{ margin: '0 auto 12px', display: 'block' }}
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            暂无标记
            <br />
            在播放器中按 M 键添加
          </div>
        ) : (
          Object.keys(groupedMarkers).map((videoId) => {
            const video = getVideoById(videoId);
            if (!video) return null;
            return (
              <div key={videoId} style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#888',
                    marginBottom: '8px',
                    paddingBottom: '6px',
                    borderBottom: '1px solid #333',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      width: '4px',
                      height: '12px',
                      backgroundColor: '#ff5722',
                      borderRadius: '2px',
                    }}
                  />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                    title={video.originalName}
                  >
                    {video.originalName}
                  </span>
                  <span style={{ color: '#555', flexShrink: 0 }}>
                    ({groupedMarkers[videoId].length})
                  </span>
                </div>

                {groupedMarkers[videoId].map((marker) => (
                  <div
                    key={marker.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, marker.id)}
                    onDragOver={(e) => handleDragOver(e, marker.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, marker.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handlePlay(marker)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      cursor: 'pointer',
                      backgroundColor: selectedMarkerIds.has(marker.id)
                        ? 'rgba(255, 87, 34, 0.15)'
                        : dragOverMarkerId === marker.id
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'transparent',
                      border: selectedMarkerIds.has(marker.id)
                        ? '1px solid rgba(255, 87, 34, 0.4)'
                        : '1px solid transparent',
                      opacity: draggedMarkerId === marker.id ? 0.5 : 1,
                      transition: 'all 0.15s ease',
                    }}
                    title="点击播放"
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelection(marker.id);
                      }}
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '3px',
                        border: `1.5px solid ${
                          selectedMarkerIds.has(marker.id) ? '#ff5722' : '#555'
                        }`,
                        backgroundColor: selectedMarkerIds.has(marker.id)
                          ? '#ff5722'
                          : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {selectedMarkerIds.has(marker.id) && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>

                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '4px',
                        backgroundColor: '#1a1a1a',
                        flexShrink: 0,
                        border: `1px solid ${marker.color}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: '3px',
                          height: '100%',
                          backgroundColor: marker.color,
                          position: 'absolute',
                          left: 0,
                          top: 0,
                        }}
                      />
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={marker.color} strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginBottom: '2px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 5px',
                            borderRadius: '8px',
                            backgroundColor: marker.color,
                            color: '#fff',
                            fontWeight: 500,
                            flexShrink: 0,
                          }}
                        >
                          {marker.label}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: '11px',
                          color: '#888',
                          fontFamily: 'monospace',
                        }}
                      >
                        {formatTimestamp(marker.timestamp)}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDelete(marker.id, e)}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        backgroundColor: 'transparent',
                        color: '#666',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        padding: 0,
                        opacity: 0,
                      }}
                      className="delete-btn"
                      title="删除标记"
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.opacity = '1';
                        (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(229, 57, 53, 0.2)';
                        (e.target as HTMLButtonElement).style.color = '#e53935';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.opacity = '0';
                        (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                        (e.target as HTMLButtonElement).style.color = '#666';
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .sidebar [draggable="true"]:hover .delete-btn {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}

export default MarkerPanel;
