import { useState, useEffect, useCallback } from 'react';
import VideoUploader from './VideoUploader';
import VideoPlayer from './VideoPlayer';
import MarkerPanel from './MarkerPanel';
import TimelineExporter from './TimelineExporter';
import type { Video, Marker } from './types';

interface PlayerState {
  video: Video;
  initialTime?: number;
}

function App() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selectedMarkerIds, setSelectedMarkerIds] = useState<Set<string>>(new Set());
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [videosRes, markersRes] = await Promise.all([
        fetch('/api/videos'),
        fetch('/api/markers'),
      ]);
      if (videosRes.ok) {
        const videosData = await videosRes.json();
        setVideos(videosData);
      }
      if (markersRes.ok) {
        const markersData = await markersRes.json();
        setMarkers(markersData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVideoUploaded = (video: Video) => {
    setVideos((prev) => [...prev, video]);
  };

  const handleVideoDeleted = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    setMarkers((prev) => prev.filter((m) => m.videoId !== videoId));
    if (playerState?.video.id === videoId) {
      setPlayerState(null);
    }
  };

  const handlePlayVideo = (video: Video, timestamp?: number) => {
    setPlayerState({ video, initialTime: timestamp });
  };

  const handleClosePlayer = () => {
    setPlayerState(null);
  };

  const handleMarkerAdded = (marker: Marker) => {
    setMarkers((prev) => [...prev, marker]);
  };

  const handleMarkerDeleted = (markerId: string) => {
    setMarkers((prev) => prev.filter((m) => m.id !== markerId));
    setSelectedMarkerIds((prev) => {
      const next = new Set(prev);
      next.delete(markerId);
      return next;
    });
  };

  const handleMarkersReordered = (reorderedMarkers: Marker[]) => {
    setMarkers(reorderedMarkers);
  };

  const handleToggleMarkerSelection = (markerId: string) => {
    setSelectedMarkerIds((prev) => {
      const next = new Set(prev);
      if (next.has(markerId)) {
        next.delete(markerId);
      } else {
        next.add(markerId);
      }
      return next;
    });
  };

  const handleSelectAllMarkers = () => {
    if (selectedMarkerIds.size === markers.length) {
      setSelectedMarkerIds(new Set());
    } else {
      setSelectedMarkerIds(new Set(markers.map((m) => m.id)));
    }
  };

  const handleVideoDurationUpdate = (videoId: string, duration: number) => {
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId
          ? {
              ...v,
              duration,
              durationFormatted: `${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(
                Math.floor(duration % 60)
              ).padStart(2, '0')}`,
            }
          : v
      )
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1 style={{ fontSize: '24px', color: '#ff5722', fontWeight: 600 }}>ClipMarker</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleSelectAllMarkers}
            style={{
              padding: '8px 16px',
              backgroundColor: '#333',
              color: '#e0e0e0',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            {selectedMarkerIds.size === markers.length && markers.length > 0
              ? '取消全选'
              : '全选标记'}
          </button>
          <TimelineExporter
            videos={videos}
            markers={markers}
            selectedMarkerIds={selectedMarkerIds}
          />
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          width: '100%',
          overflow: 'hidden',
          flexDirection: 'row',
        }}
        className="main-layout"
      >
        <div
          style={{
            width: '75%',
            overflowY: 'auto',
            padding: '20px',
            minWidth: 0,
          }}
          className="main-content"
        >
          <VideoUploader
            videos={videos}
            onVideoUploaded={handleVideoUploaded}
            onVideoDeleted={handleVideoDeleted}
            onPlayVideo={handlePlayVideo}
            onDurationUpdate={handleVideoDurationUpdate}
          />
        </div>

        <div
          style={{
            width: '240px',
            backgroundColor: '#252525',
            borderLeft: '1px solid #333',
            flexShrink: 0,
          }}
          className="sidebar"
        >
          <MarkerPanel
            videos={videos}
            markers={markers}
            selectedMarkerIds={selectedMarkerIds}
            onToggleSelection={handleToggleMarkerSelection}
            onPlayMarker={handlePlayVideo}
            onDeleteMarker={handleMarkerDeleted}
            onReorderMarkers={handleMarkersReordered}
          />
        </div>
      </div>

      {playerState && (
        <VideoPlayer
          video={playerState.video}
          initialTime={playerState.initialTime}
          markers={markers.filter((m) => m.videoId === playerState.video.id)}
          onClose={handleClosePlayer}
          onMarkerAdded={handleMarkerAdded}
          onDurationLoaded={handleVideoDurationUpdate}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .main-layout {
            flex-direction: column !important;
            overflow-y: auto !important;
          }
          .main-content {
            width: 100% !important;
            min-height: 50vh;
          }
          .sidebar {
            width: 100% !important;
            min-height: 50vh;
            border-left: none !important;
            border-top: 1px solid #333;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
