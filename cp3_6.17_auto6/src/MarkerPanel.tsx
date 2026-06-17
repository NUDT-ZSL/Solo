import { useState, useRef } from 'react';
import { Play, Trash2, GripVertical, ImageIcon } from 'lucide-react';
import { api } from './api';
import { useAppStore } from './store';
import { formatDuration } from './types';
import type { Video, Marker } from './types';

interface MarkerPanelProps {
  onPlayMarker: (video: Video, timestamp: number) => void;
}

export function MarkerPanel({ onPlayMarker }: MarkerPanelProps) {
  const videos = useAppStore(s => s.videos);
  const markers = useAppStore(s => s.markers);
  const removeMarker = useAppStore(s => s.removeMarker);
  const updateMarker = useAppStore(s => s.updateMarker);
  const selectedMarkerIds = useAppStore(s => s.selectedMarkerIds);
  const toggleMarkerSelection = useAppStore(s => s.toggleMarkerSelection);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const thumbCache = useRef<Map<string, string>>(new Map());

  const grouped = videos.map(v => ({
    video: v,
    markers: markers.filter(m => m.videoId === v.id)
  })).filter(g => g.markers.length > 0);

  const allVideoMap = new Map(videos.map(v => [v.id, v]));

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteMarker(id);
    removeMarker(id);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setOverId(id);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const currentList = markers.map(m => m.id);
    const fromIdx = currentList.indexOf(dragId);
    const toIdx = currentList.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const newList = [...currentList];
    const [removed] = newList.splice(fromIdx, 1);
    newList.splice(toIdx, 0, removed);
    await api.reorderMarkers(newList);
    const dragMarker = markers.find(m => m.id === dragId);
    const overMarker = markers.find(m => m.id === targetId);
    if (dragMarker && overMarker) {
      const tempOrder = [...markers];
      const fIdx = tempOrder.findIndex(m => m.id === dragId);
      const tIdx = tempOrder.findIndex(m => m.id === targetId);
      const [mov] = tempOrder.splice(fIdx, 1);
      tempOrder.splice(tIdx, 0, mov);
      useAppStore.setState({ markers: tempOrder });
    }
    setDragId(null);
    setOverId(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setOverId(null);
  };

  const getThumbnail = (video: Video): string => {
    const cached = thumbCache.current.get(video.id);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, 32, 32);
    }
    const url = canvas.toDataURL();
    thumbCache.current.set(video.id, url);
    return url;
  };

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ width: 240, background: '#252525', padding: 12 }}
    >
      <h3 className="font-medium mb-3 text-sm">标记列表</h3>
      {grouped.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-8">
          暂无标记<br />播放视频时按 M 键添加
        </p>
      )}
      {grouped.map(({ video, markers: vMarkers }) => (
        <div key={video.id} className="mb-4">
          <p className="text-xs text-gray-400 mb-2 truncate" title={video.originalName}>
            {video.originalName}
          </p>
          <div className="space-y-2">
            {vMarkers.map((marker) => (
              <div
                key={marker.id}
                draggable
                onDragStart={(e) => handleDragStart(e, marker.id)}
                onDragOver={(e) => handleDragOver(e, marker.id)}
                onDrop={(e) => handleDrop(e, marker.id)}
                onDragEnd={handleDragEnd}
                onClick={() => onPlayMarker(video, marker.timestamp)}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                  dragId === marker.id ? 'opacity-50' : ''
                } ${overId === marker.id ? 'border border-[#ff5722]' : 'hover:bg-[#1e1e1e]'} ${
                  selectedMarkerIds.has(marker.id) ? 'bg-[#2a2a2a] ring-1 ring-[#ff5722]' : 'bg-[#1a1a1a]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedMarkerIds.has(marker.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleMarkerSelection(marker.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-3.5 h-3.5 accent-[#ff5722] flex-shrink-0"
                />
                <GripVertical size={14} className="text-gray-500 flex-shrink-0 cursor-grab" />
                <img
                  src={getThumbnail(video)}
                  alt=""
                  className="rounded flex-shrink-0 bg-black"
                  style={{ width: 32, height: 32 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: marker.color }}
                    />
                    <span className="text-xs truncate">{marker.label}</span>
                  </div>
                  <p className="text-xs text-gray-400">{formatDuration(marker.timestamp)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayMarker(video, marker.timestamp);
                  }}
                  className="p-1 rounded hover:bg-[#333] flex-shrink-0"
                  title="跳转到此处"
                >
                  <Play size={12} fill="white" />
                </button>
                <button
                  onClick={(e) => handleDelete(marker.id, e)}
                  className="p-1 rounded hover:bg-[#333] text-gray-400 hover:text-red-400 flex-shrink-0"
                  title="删除"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {markers.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#333]">
          <p className="text-xs text-gray-400 mb-2">
            共 {markers.length} 个标记，已选 {selectedMarkerIds.size} 个
          </p>
        </div>
      )}
    </div>
  );
}
