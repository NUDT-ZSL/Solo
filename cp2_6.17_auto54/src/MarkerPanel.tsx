import React, { useState, useRef } from 'react';
import { Trash2, Play, GripVertical, CheckSquare, Square } from 'lucide-react';
import { useStore, formatTime } from './store';
import type { Video, Marker } from './types';

interface MarkerPanelProps {
  onPlayMarker: (video: Video, timestamp: number) => void;
}

const MarkerPanel: React.FC<MarkerPanelProps> = ({ onPlayMarker }) => {
  const { 
    videos, 
    markers, 
    selectedMarkers, 
    toggleMarkerSelection,
    clearSelection,
    selectAllMarkers,
    deleteMarker,
    reorderMarker
  } = useStore();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragOverOrderRef = useRef<number>(0);

  const markersByVideo = videos.reduce((acc, video) => {
    const videoMarkers = markers
      .filter(m => m.videoId === video.id)
      .sort((a, b) => a.order - b.order);
    if (videoMarkers.length > 0) {
      acc[video.id] = { video, markers: videoMarkers };
    }
    return acc;
  }, {} as Record<string, { video: Video; markers: Marker[] }>);

  const handleDragStart = (e: React.DragEvent, marker: Marker) => {
    setDraggedId(marker.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', marker.id);
  };

  const handleDragOver = (e: React.DragEvent, targetMarker: Marker) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(targetMarker.id);
    dragOverOrderRef.current = targetMarker.order;
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetMarker: Marker) => {
    e.preventDefault();
    const draggedMarkerId = e.dataTransfer.getData('text/plain');
    
    if (draggedMarkerId && draggedMarkerId !== targetMarker.id) {
      await reorderMarker(draggedMarkerId, dragOverOrderRef.current);
    }
    
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handlePlayMarker = (video: Video, timestamp: number) => {
    onPlayMarker(video, timestamp);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这个标记吗？')) {
      deleteMarker(id);
    }
  };

  const totalMarkers = markers.length;
  const selectedCount = selectedMarkers.length;

  return (
    <div className="sidebar custom-scrollbar">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">标记列表</h2>
        <p className="text-xs text-gray-500">
          共 {totalMarkers} 个标记
          {selectedCount > 0 && `，已选择 ${selectedCount} 个`}
        </p>
      </div>

      {totalMarkers > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1"
            onClick={selectAllMarkers}
          >
            <CheckSquare size={14} />
            全选
          </button>
          <button
            className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1"
            onClick={clearSelection}
          >
            <Square size={14} />
            取消
          </button>
        </div>
      )}

      {totalMarkers === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">暂无标记</p>
          <p className="text-xs mt-2">播放视频时按 M 键添加标记</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(markersByVideo).map(({ video, markers: videoMarkers }) => (
            <div key={video.id}>
              <h3 className="text-sm font-medium text-gray-400 mb-2 truncate" title={video.originalName}>
                {video.originalName}
              </h3>
              <div className="space-y-1">
                {videoMarkers.map((marker) => (
                  <div
                    key={marker.id}
                    className={`marker-row ${
                      draggedId === marker.id ? 'dragging' : ''
                    } ${dragOverId === marker.id ? 'drag-over' : ''} ${
                      selectedMarkers.includes(marker.id) ? 'bg-orange-500/10' : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, marker)}
                    onDragOver={(e) => handleDragOver(e, marker)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, marker)}
                    onDragEnd={handleDragEnd}
                    onClick={() => toggleMarkerSelection(marker.id)}
                  >
                    <div className="text-gray-600 cursor-grab active:cursor-grabbing">
                      <GripVertical size={16} />
                    </div>

                    <div
                      className="w-4 h-4 rounded flex items-center justify-center cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMarkerSelection(marker.id);
                      }}
                    >
                      {selectedMarkers.includes(marker.id) ? (
                        <CheckSquare size={16} className="text-orange-500" />
                      ) : (
                        <Square size={16} className="text-gray-600" />
                      )}
                    </div>

                    <div className="thumbnail">
                      {marker.thumbnail ? (
                        <img
                          src={marker.thumbnail}
                          alt={marker.label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full" 
                          style={{ backgroundColor: marker.color + '40' }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: marker.color }}
                        />
                        <span className="text-xs font-medium truncate">
                          {marker.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTime(marker.timestamp)}
                      </span>
                    </div>

                    <button
                      className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayMarker(video, marker.timestamp);
                      }}
                      title="跳转到此处播放"
                    >
                      <Play size={12} />
                    </button>

                    <button
                      className="w-6 h-6 rounded hover:bg-red-500/20 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                      onClick={(e) => handleDelete(e, marker.id)}
                      title="删除标记"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarkerPanel;
