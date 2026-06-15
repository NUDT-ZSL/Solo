import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import SongList from './components/SongList';
import SongDetail from './components/SongDetail';
import { useMotionStore } from './stores/motionStore';
import { useSongStore, SongWithMatch } from './stores/songStore';

function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="hamburger-icon">
      <span
        className="hamburger-line"
        style={{
          transform: isOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none',
          top: isOpen ? '6px' : '0'
        }}
      />
      <span
        className="hamburger-line"
        style={{
          opacity: isOpen ? 0 : 1,
          top: '6px'
        }}
      />
      <span
        className="hamburger-line"
        style={{
          transform: isOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none',
          top: isOpen ? '6px' : '12px'
        }}
      />
    </div>
  );
}

export default function App() {
  const isRunning = useMotionStore((s) => s.isRunning);
  const startSimulation = useMotionStore((s) => s.startSimulation);
  const stopSimulation = useMotionStore((s) => s.stopSimulation);
  const fetchSongs = useSongStore((s) => s.fetchSongs);
  const initWorker = useSongStore((s) => s.initWorker);
  const terminateWorker = useSongStore((s) => s.terminateWorker);
  const currentSong = useSongStore((s) => s.currentSong);
  const isDetailOpen = useSongStore((s) => s.isDetailOpen);
  const openDetail = useSongStore((s) => s.openDetail);
  const closeDetail = useSongStore((s) => s.closeDetail);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchSongs();
    initWorker();
    return () => {
      terminateWorker();
    };
  }, [fetchSongs, initWorker, terminateWorker]);

  const handleToggleSimulation = useCallback(() => {
    if (isRunning) {
      stopSimulation();
    } else {
      startSimulation();
    }
  }, [isRunning, startSimulation, stopSimulation]);

  const handleSongClick = useCallback(
    (song: SongWithMatch) => {
      openDetail(song);
    },
    [openDetail]
  );

  const handleBack = useCallback(() => {
    closeDetail();
  }, [closeDetail]);

  return (
    <div className="app-root">
      {isMobile && (
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <HamburgerIcon isOpen={sidebarOpen} />
        </button>
      )}

      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} />

        <div className="main-area" style={{ position: 'relative' }}>
          <SongList onSongClick={handleSongClick} />

          <div className="control-area">
            <motion.button
              className={`sim-btn ${isRunning ? 'sim-btn-stop' : 'sim-btn-start'}`}
              onClick={handleToggleSimulation}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isRunning ? '停止' : '开始模拟运动'}
            </motion.button>
          </div>

          <AnimatePresence>
            {isDetailOpen && currentSong && (
              <SongDetail song={currentSong} onBack={handleBack} />
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          background: #121212;
          color: #e0e0e0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
        }
        #root {
          height: 100vh;
          width: 100vw;
        }
        .app-root {
          height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
          background: #121212;
          position: relative;
        }
        .app-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .main-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .control-area {
          display: flex;
          justify-content: center;
          padding: 16px;
          flex-shrink: 0;
        }
        .sim-btn {
          width: 200px;
          height: 48px;
          border: none;
          border-radius: 24px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          color: #fff;
          transition: box-shadow 0.3s;
          letter-spacing: 0.5px;
        }
        .sim-btn-start {
          background: linear-gradient(135deg, #ff4081, #e040fb);
          box-shadow: 0 4px 20px rgba(255, 64, 129, 0.3);
        }
        .sim-btn-start:hover {
          box-shadow: 0 6px 28px rgba(255, 64, 129, 0.45);
        }
        .sim-btn-stop {
          background: linear-gradient(135deg, #f44336, #ff5722);
          box-shadow: 0 4px 20px rgba(244, 67, 54, 0.3);
        }
        .sim-btn-stop:hover {
          box-shadow: 0 6px 28px rgba(244, 67, 54, 0.45);
        }
        .hamburger-btn {
          position: fixed;
          top: 12px;
          left: 12px;
          z-index: 100;
          width: 36px;
          height: 36px;
          background: rgba(30, 30, 30, 0.9);
          border: 1px solid #333;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
        }
        .hamburger-icon {
          width: 24px;
          height: 18px;
          position: relative;
        }
        .hamburger-line {
          position: absolute;
          left: 0;
          width: 100%;
          height: 2px;
          background: #e0e0e0;
          border-radius: 1px;
          transition: all 0.3s ease;
        }
        @media (min-width: 769px) {
          .hamburger-btn {
            display: none;
          }
        }
        @media (max-width: 768px) {
          .control-area {
            padding: 12px;
          }
          .sim-btn {
            width: 180px;
            height: 44px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
