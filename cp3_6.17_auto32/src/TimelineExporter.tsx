import type { Video, Marker } from './types';

interface TimelineExporterProps {
  videos: Video[];
  markers: Marker[];
  selectedMarkerIds: Set<string>;
}

interface TimelineClip {
  id: string;
  videoFilePath: string;
  videoFileName: string;
  videoId: string;
  startTime: number;
  endTime: number;
  startTimeFrames: number;
  endTimeFrames: number;
  label: string;
  color: string;
  order: number;
  thumbnail: string;
}

interface TimelineExport {
  version: string;
  createdAt: string;
  clips: TimelineClip[];
  totalClips: number;
  totalVideos: number;
  fps: number;
}

const FPS = 30;

function secondsToFrames(seconds: number): number {
  return Math.round(seconds * FPS);
}

function getMarkerEndTime(marker: Marker, allMarkers: Marker[], videoDuration: number): number {
  const sameVideoMarkers = allMarkers
    .filter((m) => m.videoId === marker.videoId)
    .sort((a, b) => a.order - b.order);
  
  const sortedByTime = sameVideoMarkers.sort((a, b) => a.timestamp - b.timestamp);
  const currentIdx = sortedByTime.findIndex((m) => m.id === marker.id);
  
  if (currentIdx === -1) return videoDuration;
  if (currentIdx < sortedByTime.length - 1) {
    return sortedByTime[currentIdx + 1].timestamp;
  }
  return videoDuration;
}

function TimelineExporter({ videos, markers, selectedMarkerIds }: TimelineExporterProps) {
  const getVideoById = (id: string): Video | undefined => {
    return videos.find((v) => v.id === id);
  };

  const handleExport = () => {
    let markersToExport = markers;

    if (selectedMarkerIds.size > 0) {
      markersToExport = markers.filter((m) => selectedMarkerIds.has(m.id));
    }

    if (markersToExport.length === 0) {
      alert('没有可导出的标记。请先添加标记或选择标记。');
      return;
    }

    markersToExport = [...markersToExport].sort((a, b) => {
      if (a.videoId !== b.videoId) {
        const videoA = getVideoById(a.videoId)?.originalName || '';
        const videoB = getVideoById(b.videoId)?.originalName || '';
        return videoA.localeCompare(videoB);
      }
      return a.order - b.order;
    });

    const usedVideoIds = new Set(markersToExport.map((m) => m.videoId));

    const clips: TimelineClip[] = markersToExport.map((marker, index) => {
      const video = getVideoById(marker.videoId);
      const videoDuration = video?.duration || marker.timestamp + 10;
      const endTime = getMarkerEndTime(marker, markers, videoDuration);

      return {
        id: marker.id,
        videoFilePath: video?.path || '',
        videoFileName: video?.originalName || '',
        videoId: marker.videoId,
        startTime: parseFloat(marker.timestamp.toFixed(3)),
        endTime: parseFloat(endTime.toFixed(3)),
        startTimeFrames: secondsToFrames(marker.timestamp),
        endTimeFrames: secondsToFrames(endTime),
        label: marker.label,
        color: marker.color,
        order: index,
        thumbnail: marker.thumbnail,
      };
    });

    const exportData: TimelineExport = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      clips,
      totalClips: clips.length,
      totalVideos: usedVideoIds.size,
      fps: FPS,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Exported timeline:', exportData);
  };

  const totalCount = selectedMarkerIds.size > 0 ? selectedMarkerIds.size : markers.length;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleExport}
        disabled={markers.length === 0}
        style={{
          padding: '8px 16px',
          backgroundColor: markers.length > 0 ? '#ff5722' : '#444',
          color: markers.length > 0 ? '#fff' : '#888',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: markers.length > 0 ? 'pointer' : 'not-allowed',
          opacity: markers.length > 0 ? 1 : 0.6,
        }}
        title={
          selectedMarkerIds.size > 0
            ? `导出选中的 ${selectedMarkerIds.size} 个标记`
            : markers.length > 0
            ? `导出全部 ${markers.length} 个标记`
            : '请先添加标记'
        }
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        导出时间线
        {totalCount > 0 && (
          <span
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '12px',
            }}
          >
            {totalCount}
          </span>
        )}
      </button>
    </div>
  );
}

export default TimelineExporter;
