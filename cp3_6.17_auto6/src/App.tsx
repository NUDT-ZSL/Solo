import { useCallback, useEffect, useState } from 'react';
import VideoUploader from './VideoUploader';
import VideoPlayer from './VideoPlayer';
import MarkerPanel from './MarkerPanel';
import TimelineExporter from './TimelineExporter';
import type { VideoMeta, Marker } from './types';
import {
  fetchVideos,
  fetchMarkers,
  deleteVideo as apiDeleteVideo,
  deleteMarker as apiDeleteMarker,
  reorderMarkers as apiReorderMarkers,
} from './api';

export default function App() {
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoMeta | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string>('');
  const [seekToken, setSeekToken] = useState<number>(0);
  const [seekTarget, setSeekTarget] = useState<{ videoId: string; time: number } | null>(null);

  const refreshVideos = useCallback(async () => {
    try {
      const list = await fetchVideos();
      setVideos(list);
    } catch {
      showToast('获取视频列表失败');
    }
  }, []);

  const refreshMarkers = useCallback(async () => {
    try {
      const list = await fetchMarkers();
      setMarkers(list);
    } catch {
      showToast('获取标记列表失败');
    }
  }, []);

  useEffect(() => {
    refreshVideos();
    refreshMarkers();
  }, [refreshVideos, refreshMarkers]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  }, []);

  const handleUploaded = useCallback(
    (video: VideoMeta) => {
      setVideos((prev) => [video, ...prev]);
    },
    []
  );

  const handleVideoDeleted = useCallback(
    async (id: string) => {
      await apiDeleteVideo(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
      setMarkers((prev) => prev.filter((m) => m.videoId !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        markers.filter((m) => m.videoId === id).forEach((m) => next.delete(m.id));
        return next;
      });
      showToast('视频已删除');
    },
    [markers, showToast]
  );

  const handleMarkerAdded = useCallback(
    (marker: Marker) => {
      setMarkers((prev) => [...prev, marker]);
    },
    []
  );

  const handleMarkerDeleted = useCallback(
    async (id: string) => {
      await apiDeleteMarker(id);
      setMarkers((prev) => prev.filter((m) => m.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    []
  );

  const handleReorder = useCallback(
    async (orderedIds: string[]) => {
      setMarkers((prev) => {
        const orderMap = new Map(orderedIds.map((id, i) => [id, i + 1]));
        return prev.map((m) =>
          orderMap.has(m.id) ? { ...m, order: orderMap.get(m.id)! } : m
        );
      });
      try {
        await apiReorderMarkers(orderedIds);
      } catch {
        showToast('排序保存失败');
      }
    },
    [showToast]
  );

  const handleJumpToTime = useCallback(
    (videoId: string, time: number) => {
      const video = videos.find((v) => v.id === videoId);
      if (!video) return;
      setActiveVideo(video);
      setSeekTarget({ videoId, time });
      setSeekToken((t) => t + 1);
    },
    [videos]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectedMarkers = markers.filter((m) => selectedIds.has(m.id));

  return (
    <div className="app">
      <div className="main">
        <div className="topbar">
          <div className="brand">
            <span className="dot" />
            ClipMarker
          </div>
          <TimelineExporter
            selectedMarkers={selectedMarkers}
            videos={videos}
            onExported={() => {
              showToast('已导出 timeline.json');
              clearSelection();
            }}
          />
        </div>
        <div className="main-scroll">
          <VideoUploader
            videos={videos}
            onUploaded={handleUploaded}
            onPlay={setActiveVideo}
            onDelete={handleVideoDeleted}
            showToast={showToast}
          />
        </div>
      </div>
      <MarkerPanel
        videos={videos}
        markers={markers}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onClearSelection={clearSelection}
        onJump={handleJumpToTime}
        onDelete={handleMarkerDeleted}
        onReorder={handleReorder}
      />
      {activeVideo && (
        <VideoPlayer
          video={activeVideo}
          markers={markers.filter((m) => m.videoId === activeVideo.id)}
          seekTarget={seekTarget?.videoId === activeVideo.id ? seekTarget : null}
          seekToken={seekToken}
          onClose={() => {
            setActiveVideo(null);
            setSeekTarget(null);
          }}
          onMarkerAdded={handleMarkerAdded}
          showToast={showToast}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
