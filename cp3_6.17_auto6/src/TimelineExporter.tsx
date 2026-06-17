import { useState } from 'react';
import type { Video, Marker, TimelineExport, TimelineClip } from './types';
import './TimelineExporter.css';

interface TimelineExporterProps {
  videos: Video[];
  markers: Marker[];
  selectedMarkerIds: string[];
  disabled: boolean;
}

const FPS = 30;

function secondsToFrames(seconds: number): number {
  return Math.round(seconds * FPS);
}

function TimelineExporter({ videos, markers, selectedMarkerIds, disabled }: TimelineExporterProps) {
  const [isExporting, setIsExporting] = useState(false);

  const getVideoById = (id: string): Video | undefined => {
    return videos.find(v => v.id === id);
  };

  const generateTimeline = (): TimelineExport => {
    const selectedMarkers = markers
      .filter(m => selectedMarkerIds.includes(m.id))
      .sort((a, b) => {
        if (a.videoId !== b.videoId) return a.videoId.localeCompare(b.videoId);
        return a.order - b.order;
      });

    const clips: TimelineClip[] = selectedMarkers.map((marker, index) => {
      const video = getVideoById(marker.videoId);
      const nextMarker = selectedMarkers[index + 1];
      const isLastOfVideo = !nextMarker || nextMarker.videoId !== marker.videoId;

      let endTime: number;
      if (isLastOfVideo && video && video.duration > 0) {
        endTime = video.duration;
      } else if (nextMarker && nextMarker.videoId === marker.videoId) {
        endTime = nextMarker.timestamp;
      } else {
        endTime = marker.timestamp + 5;
      }

      return {
        videoPath: video?.path || '',
        videoName: video?.name || '',
        startTime: Number(marker.timestamp.toFixed(3)),
        endTime: Number(endTime.toFixed(3)),
        startFrame: secondsToFrames(marker.timestamp),
        endFrame: secondsToFrames(endTime),
        label: marker.label,
        color: marker.color,
      };
    }) as (TimelineClip & { startFrame: number; endFrame: number })[];

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      fps: FPS,
      clips,
    } as TimelineExport & { fps: number; clips: (TimelineClip & { startFrame: number; endFrame: number })[] };
  };

  const handleExport = async () => {
    if (selectedMarkerIds.length === 0) return;

    setIsExporting(true);

    try {
      const timeline = generateTimeline();
      const jsonStr = JSON.stringify(timeline, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'timeline.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      className={`export-button ${disabled ? 'disabled' : ''}`}
      onClick={handleExport}
      disabled={disabled || isExporting}
      title={disabled ? '请先选择要导出的标记' : '导出时间线'}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span>{isExporting ? '导出中...' : '导出时间线'}</span>
    </button>
  );
}

export default TimelineExporter;
