import { useState, useEffect } from 'react';
import { Film } from 'lucide-react';
import { VideoUploader } from './VideoUploader';
import { VideoPlayer } from './VideoPlayer';
import { MarkerPanel } from './MarkerPanel';
import { TimelineExporter } from './TimelineExporter';
import { api } from './api';
import { useAppStore } from './store';
import type { Video } from './types';

export default function App() {
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const setVideos = useAppStore(s => s.setVideos);
  const setMarkers = useAppStore(s => s.setMarkers);
  const setPlayingVideoId = useAppStore(s => s.setPlayingVideo);
  const setSeekTimestamp = useAppStore(s => s.setSeekTimestamp);
  const videos = useAppStore(s => s.videos);

  useEffect(() => {
    const load = async () => {
      try {
        const vs = await api.getVideos();
        setVideos(vs);
        const allMarkers = [];
        for (const v of vs) {
          const ms = await api.getMarkers(v.id);
          allMarkers.push(...ms);
        }
        setMarkers(allMarkers);
      } catch (e) {
        console.error('加载数据失败', e);
      }
    };
    load();
  }, [setVideos, setMarkers]);

  const handlePlay = (video: Video) => {
    setPlayingVideo(video);
    setPlayingVideoId(video.id);
  };

  const handleClosePlayer = () => {
    setPlayingVideo(null);
    setPlayingVideoId(null);
  };

  const handlePlayMarker = (video: Video, timestamp: number) => {
    setPlayingVideo(video);
    setPlayingVideoId(video.id);
    setSeekTimestamp(timestamp);
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row" style={{ background: '#121212' }}>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-2 px-6 py-3 border-b border-[#333]">
          <Film size={22} color="#ff5722" />
          <h1 className="font-semibold text-lg">ClipMarker</h1>
          <span className="text-xs text-gray-400 ml-2">视频素材标记工具</span>
        </header>
        <TimelineExporter />
        <div className="flex-1 overflow-y-auto">
          <VideoUploader onPlay={handlePlay} />
        </div>
      </div>

      <div className="border-t md:border-t-0 md:border-l border-[#333] flex-shrink-0 md:h-auto h-1/2 overflow-hidden">
        <MarkerPanel onPlayMarker={handlePlayMarker} />
      </div>

      {playingVideo && (
        <VideoPlayer video={playingVideo} onClose={handleClosePlayer} />
      )}
    </div>
  );
}
