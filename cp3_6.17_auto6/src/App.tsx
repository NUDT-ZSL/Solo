import { useState, useEffect } from 'react';
import VideoUploader from './VideoUploader';
import VideoPlayer from './VideoPlayer';
import MarkerPanel from './MarkerPanel';
import TimelineExporter from './TimelineExporter';
import type { Video, Marker } from './types';
import './App.css';

function App() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [selectedMarkerIds, setSelectedMarkerIds] = useState<string[]>([]);
  const [initialTimestamp, setInitialTimestamp] = useState<number | null>(null);

  useEffect(() => {
    fetchVideos();
    fetchMarkers();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/videos');
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      console.error('获取视频列表失败:', err);
    }
  };

  const fetchMarkers = async () => {
    try {
      const res = await fetch('/api/markers');
      const data = await res.json();
      setMarkers(data);
    } catch (err) {
      console.error('获取标记列表失败:', err);
    }
  };

  const handleVideoUploaded = (video: Video) => {
    setVideos(prev => [...prev, video]);
  };

  const handlePlayVideo = (video: Video, timestamp?: number) => {
    setSelectedVideo(video);
    setIsPlayerOpen(true);
    if (timestamp !== undefined) {
      setInitialTimestamp(timestamp);
    } else {
      setInitialTimestamp(null);
    }
  };

  const handleClosePlayer = () => {
    setIsPlayerOpen(false);
    setSelectedVideo(null);
    setInitialTimestamp(null);
  };

  const handleMarkerAdded = (marker: Marker) => {
    setMarkers(prev => [...prev, marker]);
  };

  const handleMarkerDeleted = (markerId: string) => {
    setMarkers(prev => prev.filter(m => m.id !== markerId));
    setSelectedMarkerIds(prev => prev.filter(id => id !== markerId));
  };

  const handleMarkersReordered = (newMarkers: Marker[]) => {
    setMarkers(newMarkers);
  };

  const handleToggleMarkerSelect = (markerId: string) => {
    setSelectedMarkerIds(prev =>
      prev.includes(markerId)
        ? prev.filter(id => id !== markerId)
        : [...prev, markerId]
    );
  };

  const handleSelectAllMarkers = () => {
    if (selectedMarkerIds.length === markers.length) {
      setSelectedMarkerIds([]);
    } else {
      setSelectedMarkerIds(markers.map(m => m.id));
    }
  };

  const markersByVideo = videos.reduce((acc, video) => {
    const videoMarkers = markers
      .filter(m => m.videoId === video.id)
      .sort((a, b) => a.timestamp - b.timestamp);
    if (videoMarkers.length > 0) {
      acc[video.id] = videoMarkers;
    }
    return acc;
  }, {} as Record<string, Marker[]>);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title">
          <div className="app-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <h1>ClipMarker</h1>
        </div>
        <TimelineExporter
          videos={videos}
          markers={markers}
          selectedMarkerIds={selectedMarkerIds}
          disabled={selectedMarkerIds.length === 0}
        />
      </header>

      <div className="app-content">
        <main className="main-content">
          <VideoUploader
            videos={videos}
            onVideoUploaded={handleVideoUploaded}
            onPlayVideo={handlePlayVideo}
          />
        </main>

        <aside className="sidebar">
          <MarkerPanel
            videos={videos}
            markers={markers}
            markersByVideo={markersByVideo}
            selectedMarkerIds={selectedMarkerIds}
            onToggleSelect={handleToggleMarkerSelect}
            onSelectAll={handleSelectAllMarkers}
            onPlayMarker={handlePlayVideo}
            onMarkerDeleted={handleMarkerDeleted}
            onMarkersReordered={handleMarkersReordered}
          />
        </aside>
      </div>

      {isPlayerOpen && selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          markers={markers.filter(m => m.videoId === selectedVideo.id)}
          initialTimestamp={initialTimestamp}
          onClose={handleClosePlayer}
          onMarkerAdded={handleMarkerAdded}
          onMarkerDeleted={handleMarkerDeleted}
        />
      )}
    </div>
  );
}

export default App;
