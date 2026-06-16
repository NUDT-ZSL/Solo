import React, { useState, useEffect, useCallback } from 'react';
import { useDataStore, MusicItem, ExplorationRecord } from '../data/DataStore';
import { audioEngine } from '../audio/AudioEngine';
import { PuzzleGame } from '../game/PuzzleGame';

export const MapScene: React.FC = () => {
  const { currentMusicianId, musicItems, musicians, getItemRecord, addExplorationTime, resetLock } = useDataStore();
  const [selectedItem, setSelectedItem] = useState<MusicItem | null>(null);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [, forceUpdate] = useState(0);

  const currentMusician = musicians.find(m => m.id === currentMusicianId);
  const items = musicItems.filter(item => item.musicianId === currentMusicianId);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentMusicianId) {
        addExplorationTime(currentMusicianId, 1);
        forceUpdate(n => n + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentMusicianId, addExplorationTime]);

  const handleItemClick = useCallback(async (item: MusicItem) => {
    const record = getItemRecord(item.id);
    const now = Date.now();

    if (record?.lockedUntil && record.lockedUntil > now) {
      const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      alert(`该物件已锁定，请${remainingMinutes}分钟后再试`);
      return;
    }

    if (record?.lockedUntil && record.lockedUntil <= now) {
      resetLock(item.id);
    }

    await audioEngine.playByItemId(item.id);
    setSelectedItem(item);
    setShowPuzzle(true);
  }, [getItemRecord, resetLock]);

  const handlePuzzleClose = useCallback(() => {
    setShowPuzzle(false);
    setSelectedItem(null);
  }, []);

  const handlePuzzleComplete = useCallback((correct: boolean, attempts: number) => {
    if (selectedItem) {
      forceUpdate(n => n + 1);
    }
  }, [selectedItem]);

  const getItemStatus = (item: MusicItem): 'unlocked' | 'locked' | 'available' => {
    const record = getItemRecord(item.id);
    if (!record) return 'available';
    if (record.unlocked) return 'unlocked';
    if (record.lockedUntil && record.lockedUntil > Date.now()) return 'locked';
    return 'available';
  };

  const getItemUnlockIcon = (item: MusicItem) => {
    const record = getItemRecord(item.id);
    if (record?.unlocked) {
      return <span className="unlock-star">⭐</span>;
    }
    return null;
  };

  const getWallpaperStyle = () => {
    if (!currentMusician) return {};
    const wallpapers: Record<string, string> = {
      galaxy: 'radial-gradient(ellipse at center, rgba(179, 136, 255, 0.15) 0%, transparent 70%)',
      jazzCat: 'repeating-linear-gradient(0deg, rgba(191, 54, 12, 0.1) 0px, rgba(191, 54, 12, 0.1) 2px, transparent 2px, transparent 4px)',
      electronicRain: 'linear-gradient(45deg, rgba(0, 229, 255, 0.1) 25%, transparent 25%, transparent 75%, rgba(0, 229, 255, 0.1) 75%)',
      mountainWind: 'linear-gradient(180deg, rgba(139, 195, 74, 0.1) 0%, transparent 100%)',
      lonelyStar: 'radial-gradient(circle at 80% 20%, rgba(100, 181, 246, 0.2) 0%, transparent 50%)'
    };
    return {
      background: currentMusician.wallColor,
      backgroundImage: wallpapers[currentMusician.id] || 'none'
    };
  };

  if (!currentMusician) return null;

  return (
    <div className="map-scene">
      <div className="scene-header">
        <h2 className="musician-title" style={{ color: currentMusician.accentColor }}>
          {currentMusician.name}的工作室
        </h2>
        <p className="musician-subtitle">{currentMusician.style}</p>
      </div>

      <div className="room-container">
        <div className="room" style={getWallpaperStyle()}>
          <div className="room-floor" style={{ background: currentMusician.floorColor }}>
            <div className="room-grid">
              {items.map(item => {
                const status = getItemStatus(item);
                return (
                  <div
                    key={item.id}
                    className={`room-item ${status}`}
                    onClick={() => status !== 'locked' && handleItemClick(item)}
                    title={status === 'locked' ? '已锁定' : `点击探索${item.name}`}
                  >
                    <div className="item-icon">{item.icon}</div>
                    <div className="item-glow" style={{ boxShadow: `0 0 20px ${currentMusician.accentColor}` }}></div>
                    <div className="item-label">{item.name}</div>
                    {getItemUnlockIcon(item)}
                    {status === 'locked' && <div className="lock-icon">🔒</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="scene-legend">
        <div className="legend-item">
          <span className="legend-dot available"></span>
          <span>待探索</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot unlocked"></span>
          <span>已解锁</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot locked"></span>
          <span>已锁定</span>
        </div>
      </div>

      {showPuzzle && selectedItem && (
        <PuzzleGame
          item={selectedItem}
          onClose={handlePuzzleClose}
          onComplete={handlePuzzleComplete}
        />
      )}

      <style>{`
        .map-scene {
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .scene-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .musician-title {
          font-size: 28px;
          margin: 0 0 8px 0;
        }

        .musician-subtitle {
          color: #9E9E9E;
          margin: 0;
        }

        .room-container {
          width: 100%;
          max-width: 1200px;
          display: flex;
          justify-content: center;
        }

        .room {
          width: 100%;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          position: relative;
        }

        .room::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 100%);
          z-index: 1;
        }

        .room-floor {
          padding: 40px;
          position: relative;
        }

        .room-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, 80px);
          gap: 16px;
          justify-content: center;
        }

        .room-item {
          width: 80px;
          height: 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
          transition: all 0.3s ease-out;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.2);
          border: 2px solid transparent;
        }

        .room-item:hover:not(.locked) {
          transform: scale(1.1);
          border-color: #FFD54F;
        }

        .room-item:hover:not(.locked) .item-glow {
          opacity: 1;
        }

        .item-icon {
          font-size: 36px;
          z-index: 2;
          transition: transform 0.3s ease;
        }

        .room-item:hover:not(.locked) .item-icon {
          transform: scale(1.1);
        }

        .item-glow {
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          opacity: 0;
          animation: pulse 2s ease-in-out infinite;
          z-index: 1;
          transition: opacity 0.3s ease;
        }

        .room-item:not(.locked):not(.unlocked) .item-glow {
          opacity: 0.6;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }

        .item-label {
          position: absolute;
          bottom: -20px;
          font-size: 11px;
          color: #E0E0E0;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .room-item:hover .item-label {
          opacity: 1;
        }

        .room-item.unlocked {
          background: rgba(102, 187, 106, 0.3);
          border-color: #66BB6A;
        }

        .room-item.unlocked .item-icon {
          filter: brightness(1.3);
        }

        .unlock-star {
          position: absolute;
          top: -8px;
          right: -8px;
          font-size: 20px;
          animation: spin 3s linear infinite;
          z-index: 3;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .room-item.locked {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(0.8);
        }

        .lock-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 24px;
          z-index: 3;
        }

        .scene-legend {
          display: flex;
          gap: 24px;
          margin-top: 40px;
          padding: 16px 24px;
          background: #1E1E2E;
          border-radius: 8px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #9E9E9E;
          font-size: 14px;
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .legend-dot.available {
          background: #FFD54F;
          box-shadow: 0 0 8px #FFD54F;
        }

        .legend-dot.unlocked {
          background: #66BB6A;
        }

        .legend-dot.locked {
          background: #E53935;
        }

        @media (max-width: 768px) {
          .map-scene {
            padding: 16px;
          }

          .musician-title {
            font-size: 22px;
          }

          .room-floor {
            padding: 20px;
          }

          .room-grid {
            grid-template-columns: repeat(2, 80px);
            gap: 12px;
          }

          .scene-legend {
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};
