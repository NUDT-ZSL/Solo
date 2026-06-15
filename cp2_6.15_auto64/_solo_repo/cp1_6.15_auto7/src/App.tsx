import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Player from './player/Player';
import SummaryPanel from './summary/SummaryPanel';
import type {
  VideoMetadata,
  SummaryItem,
  Bookmark,
  Speaker,
  AppContextType
} from './types';
import { generateAISummaries, getDefaultSpeakers } from './summary/AISummaryEngine';
import { v4 as uuidv4 } from 'uuid';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

const App: React.FC = () => {
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [speakers] = useState<Speaker[]>(getDefaultSpeakers());
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setPanelCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'VIDEO_SEEK' && typeof event.data.time === 'number') {
        setCurrentTime(event.data.time);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      const stored = sessionStorage.getItem('video_seek_time');
      if (stored) {
        const t = parseFloat(stored);
        if (!isNaN(t)) {
          setCurrentTime(t);
          sessionStorage.removeItem('video_seek_time');
        }
      }
    };
    handleStorage();
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 800);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const handleVideoLoaded = useCallback((metadata: VideoMetadata) => {
    setVideoMetadata(metadata);
    setCurrentTime(0);
    setBookmarks([]);
    setSummaries([]);
    setIsLoadingSummaries(true);

    setTimeout(() => {
      const generated = generateAISummaries(metadata);
      setSummaries(generated);
      setIsLoadingSummaries(false);
    }, 800);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const addBookmark = useCallback(
    (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
      setBookmarks((prev) => [
        ...prev,
        {
          ...bookmark,
          id: uuidv4(),
          createdAt: Date.now()
        }
      ]);
    },
    []
  );

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const togglePanel = useCallback(() => {
    setPanelCollapsed((prev) => !prev);
  }, []);

  const contextValue: AppContextType = {
    videoMetadata,
    summaries,
    bookmarks,
    currentTime,
    speakers,
    setVideoMetadata,
    setSummaries,
    addBookmark,
    removeBookmark,
    setCurrentTime,
    seekTo: handleSeek
  };

  const playerWidth = isMobile
    ? '100%'
    : panelCollapsed
    ? 'calc(100% - 32px)'
    : '70%';

  const panelWidth = isMobile
    ? '0px'
    : panelCollapsed
    ? '32px'
    : 'calc(30% - 12px)';

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app-container">
        <header className="app-header">
          <div className="header-logo">
            <span className="logo-icon">🎬</span>
            <span className="logo-text">视频会议智能摘要系统</span>
          </div>
          <div className="header-tip">
            <span className="tip-badge">💡</span>
            <span className="tip-text">Shift+点击进度条可快速添加备注</span>
          </div>
        </header>

        <main className="app-main">
          <div className="player-area" style={{ width: playerWidth }}>
            <Player
              onVideoLoaded={handleVideoLoaded}
            />
          </div>

          {!isMobile && (
            <div className="panel-area" style={{ width: panelWidth }}>
              <SummaryPanel
                isLoading={isLoadingSummaries}
                isCollapsed={panelCollapsed}
                onToggleCollapse={togglePanel}
                isMobile={false}
              />
            </div>
          )}
        </main>

        {isMobile && (
          <SummaryPanel
            isLoading={isLoadingSummaries}
            isCollapsed={panelCollapsed}
            onToggleCollapse={togglePanel}
            isMobile={true}
          />
        )}

        <style>{`
          .app-container {
            min-height: 100vh;
            background: #1a1a2e;
            display: flex;
            flex-direction: column;
          }
          .app-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 24px;
            background: rgba(15, 52, 96, 0.6);
            border-bottom: 2px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
          }
          .header-logo {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .logo-icon {
            font-size: 26px;
          }
          .logo-text {
            font-size: 18px;
            font-weight: 700;
            background: linear-gradient(135deg, #e94560, #ff6b8a);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .header-tip {
            display: flex;
            align-items: center;
            gap: 8px;
            color: rgba(255,255,255,0.6);
            font-size: 13px;
          }
          .tip-badge {
            background: rgba(233, 69, 96, 0.2);
            padding: 4px 8px;
            border-radius: 6px;
            border: 2px solid rgba(233, 69, 96, 0.4);
          }
          .app-main {
            flex: 1;
            display: flex;
            gap: 12px;
            padding: 16px;
            height: calc(100vh - 60px);
            overflow: hidden;
          }
          .player-area {
            height: 100%;
            transition: width 0.3s ease;
            min-width: 0;
          }
          .panel-area {
            height: 100%;
            transition: width 0.3s ease;
            flex-shrink: 0;
          }
          @media (max-width: 768px) {
            .app-header {
              padding: 10px 16px;
            }
            .logo-text {
              font-size: 15px;
            }
            .header-tip {
              display: none;
            }
            .app-main {
              padding: 8px;
              gap: 0;
              height: calc(100vh - 52px);
            }
            .player-area {
              width: 100% !important;
            }
          }
        `}</style>
      </div>
    </AppContext.Provider>
  );
};

export default App;
