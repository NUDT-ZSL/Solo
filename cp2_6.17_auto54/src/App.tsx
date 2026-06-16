import React, { useEffect, useRef } from 'react';
import { Film } from 'lucide-react';
import { useStore } from './store';
import VideoUploader from './VideoUploader';
import VideoPlayer from './VideoPlayer';
import MarkerPanel from './MarkerPanel';
import TimelineExporter from './TimelineExporter';
import type { Video as VideoType } from './types';

const App: React.FC = () => {
  const { 
    videos,
    currentVideo, 
    isPlayerOpen, 
    setCurrentVideo, 
    setIsPlayerOpen,
    setCurrentTime,
    fetchVideos,
    fetchMarkers,
    fetchPresetLabels
  } = useStore();

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    fetchVideos();
    fetchMarkers();
    fetchPresetLabels();
  }, [fetchVideos, fetchMarkers, fetchPresetLabels]);

  const handlePlayVideo = (video: VideoType, startTime?: number) => {
    setCurrentVideo(video);
    setIsPlayerOpen(true);
    if (startTime !== undefined) {
      setCurrentTime(startTime);
      setTimeout(() => {
        const videoEl = document.querySelector('.modal-player video') as HTMLVideoElement;
        if (videoEl) {
          videoEl.currentTime = startTime;
        }
      }, 100);
    }
  };

  const handleClosePlayer = () => {
    setIsPlayerOpen(false);
    setCurrentVideo(null);
  };

  const handlePlayMarker = (video: VideoType, timestamp: number) => {
    handlePlayVideo(video, timestamp);
  };

  return (
    <div className="app-container flex min-h-screen bg-[#121212] text-[#e0e0e0]">
      <div className="main-content flex-1 p-6 md:pr-[260px]">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Film className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ClipMarker</h1>
              <p className="text-sm text-gray-500">视频素材标记与管理工具</p>
            </div>
          </div>
        </header>

        <VideoUploader onPlayVideo={handlePlayVideo} />

        {videos.length > 0 && (
          <div className="mt-8 max-w-xs">
            <TimelineExporter />
          </div>
        )}

        <footer className="mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-600">
          <p>快捷键：播放时按 <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">M</kbd> 添加标记 | <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">Space</kbd> 播放/暂停 | <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">←</kbd> <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">→</kbd> 快进快退</p>
        </footer>
      </div>

      <MarkerPanel onPlayMarker={handlePlayMarker} />

      {isPlayerOpen && currentVideo && (
        <VideoPlayer video={currentVideo} onClose={handleClosePlayer} />
      )}
    </div>
  );
};

export default App;
