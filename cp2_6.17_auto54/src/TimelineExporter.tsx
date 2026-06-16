import React from 'react';
import { Download } from 'lucide-react';
import { useStore } from './store';
import type { TimelineExport, TimelineClip } from './types';

const FPS = 30;

const TimelineExporter: React.FC = () => {
  const { videos, markers, selectedMarkers, clearSelection } = useStore();

  const handleExport = () => {
    const markersToExport = selectedMarkers.length > 0
      ? markers.filter(m => selectedMarkers.includes(m.id))
      : markers;

    if (markersToExport.length === 0) {
      alert('没有可导出的标记，请先添加或选择标记');
      return;
    }

    const sortedMarkers = [...markersToExport].sort((a, b) => {
      if (a.videoId !== b.videoId) {
        return a.videoId.localeCompare(b.videoId);
      }
      return a.order - b.order;
    });

    const clips: TimelineClip[] = sortedMarkers.map((marker, index) => {
      const video = videos.find(v => v.id === marker.videoId);
      const nextMarker = sortedMarkers
        .filter(m => m.videoId === marker.videoId && m.order > marker.order)
        .sort((a, b) => a.order - b.order)[0];
      
      const startTime = Math.floor(marker.timestamp * FPS) / FPS;
      const endTime = nextMarker 
        ? Math.floor(nextMarker.timestamp * FPS) / FPS
        : (video?.duration || marker.timestamp + 5);
      
      return {
        videoId: marker.videoId,
        videoPath: video?.filePath || '',
        videoName: video?.originalName || '',
        startTime,
        endTime,
        duration: Math.floor((endTime - startTime) * FPS) / FPS,
        label: marker.label,
        color: marker.color,
        order: index + 1
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

  const hasMarkers = markers.length > 0;
  const hasSelection = selectedMarkers.length > 0;

  return (
    <button
      className={`btn-primary flex items-center gap-2 w-full justify-center ${
        !hasMarkers ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={handleExport}
      disabled={!hasMarkers}
    >
      <Download size={18} />
      {hasSelection 
        ? `导出选中的 ${selectedMarkers.length} 个片段`
        : '导出全部时间线'
      }
    </button>
  );
};

export default TimelineExporter;
