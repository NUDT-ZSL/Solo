import { Download, CheckSquare, Square } from 'lucide-react';
import { useAppStore } from './store';
import type { TimelineExport, TimelineClip, Video, Marker } from './types';

interface TimelineExporterProps {}

const FPS = 30;

export function TimelineExporter({}: TimelineExporterProps) {
  const videos = useAppStore(s => s.videos);
  const markers = useAppStore(s => s.markers);
  const selectedMarkerIds = useAppStore(s => s.selectedMarkerIds);
  const toggleMarkerSelection = useAppStore(s => s.toggleMarkerSelection);
  const clearMarkerSelection = useAppStore(s => s.clearMarkerSelection);

  const videoMap = new Map(videos.map(v => [v.id, v]));

  const exportTimeline = () => {
    const selectedMarkers = markers
      .filter(m => selectedMarkerIds.has(m.id))
      .sort((a, b) => {
        const aIdx = markers.findIndex(m => m.id === a.id);
        const bIdx = markers.findIndex(m => m.id === b.id);
        return aIdx - bIdx;
      });

    if (selectedMarkers.length === 0) {
      alert('请先选择要导出的标记');
      return;
    }

    const clips: TimelineClip[] = selectedMarkers.map((marker, idx) => {
      const video = videoMap.get(marker.videoId);
      const startFrame = Math.floor(marker.timestamp * FPS);
      const defaultDuration = 5;
      const endTime = marker.timestamp + defaultDuration;
      const endFrame = Math.floor(endTime * FPS);
      return {
        videoId: marker.videoId,
        videoPath: video?.path || '',
        startFrame,
        endFrame,
        startTime: marker.timestamp,
        endTime,
        label: marker.label,
        color: marker.color,
        order: idx
      };
    });

    const exportData: TimelineExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      clips
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectAll = () => {
    if (selectedMarkerIds.size === markers.length && markers.length > 0) {
      clearMarkerSelection();
    } else {
      markers.forEach(m => {
        if (!selectedMarkerIds.has(m.id)) toggleMarkerSelection(m.id);
      });
    }
  };

  const allSelected = markers.length > 0 && selectedMarkerIds.size === markers.length;

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-[#333]">
      <button
        onClick={selectAll}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-[#252525] text-sm text-gray-300"
      >
        {allSelected ? <CheckSquare size={16} color="#ff5722" /> : <Square size={16} />}
        全选
      </button>
      <div className="flex-1" />
      <button
        onClick={exportTimeline}
        disabled={selectedMarkerIds.size === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: '#ff5722' }}
      >
        <Download size={14} />
        导出时间线
      </button>
    </div>
  );
}
