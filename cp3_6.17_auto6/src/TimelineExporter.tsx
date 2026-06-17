import type { VideoMeta, Marker, TimelineDraft } from './types';
import { FPS, timeToFrame } from './constants';

interface Props {
  selectedMarkers: Marker[];
  videos: VideoMeta[];
  onExported: () => void;
}

function buildDraft(selected: Marker[], videos: VideoMeta[]): TimelineDraft {
  const byVideo = new Map<string, Marker[]>();
  selected.forEach((m) => {
    const arr = byVideo.get(m.videoId) || [];
    arr.push(m);
    byVideo.set(m.videoId, arr);
  });

  const segments = [] as TimelineDraft['segments'];

  byVideo.forEach((items, videoId) => {
    const sorted = [...items].sort((a, b) => a.order - b.order || a.time - b.time);
    const video = videos.find((v) => v.id === videoId);
    const fileName = video?.fileName || '';
    const filePath = video?.filePath || '';
    const videoDuration = video?.duration || 0;

    sorted.forEach((m, i) => {
      const next = sorted[i + 1];
      const startTime = m.time;
      let endTime = next ? next.time : videoDuration;
      if (endTime <= startTime) endTime = startTime + 1;
      segments.push({
        videoId,
        fileName,
        filePath,
        startTime,
        endTime,
        startFrame: timeToFrame(startTime),
        endFrame: timeToFrame(endTime),
        label: m.label,
        color: m.color,
        order: m.order,
      });
    });
  });

  segments.sort((a, b) => a.order - b.order || a.startTime - b.startTime);

  return {
    exportedAt: new Date().toISOString(),
    fps: FPS,
    segments,
  };
}

function downloadJson(data: TimelineDraft) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'timeline.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function TimelineExporter({
  selectedMarkers,
  videos,
  onExported,
}: Props) {
  const disabled = selectedMarkers.length === 0;

  const handleExport = () => {
    if (disabled) return;
    const draft = buildDraft(selectedMarkers, videos);
    downloadJson(draft);
    onExported();
  };

  return (
    <button
      className="export-btn pressable"
      onClick={handleExport}
      disabled={disabled}
      title={disabled ? '请先在右侧边栏选择标记片段' : '导出时间线草稿'}
    >
      导出时间线
      <span className="export-count">{selectedMarkers.length}</span>
    </button>
  );
}
