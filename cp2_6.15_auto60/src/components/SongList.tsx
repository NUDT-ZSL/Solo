import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotionStore } from '../stores/motionStore';
import { useSongStore, SongWithMatch } from '../stores/songStore';

function getHeartRateColor(hr: number): string {
  if (hr < 120) return '#4caf50';
  if (hr <= 150) return '#ff9800';
  return '#f44336';
}

function getMatchGradient(matchScore: number): string {
  if (matchScore > 0.85) {
    return 'linear-gradient(135deg, #1a237e, #4a148c)';
  }
  if (matchScore > 0.6) {
    return 'linear-gradient(135deg, #1a1a3e, #3a1a4c)';
  }
  return 'linear-gradient(135deg, #1e1e1e, #2a2a2a)';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface SongListProps {
  onSongClick: (song: SongWithMatch) => void;
}

export default function SongList({ onSongClick }: SongListProps) {
  const heartRate = useMotionStore((s) => s.heartRate);
  const cadence = useMotionStore((s) => s.cadence);
  const isRunning = useMotionStore((s) => s.isRunning);
  const sortedSongs = useSongStore((s) => s.sortedSongs);
  const updateSortByBPM = useSongStore((s) => s.updateSortByBPM);
  const [hrPulse, setHrPulse] = useState(false);
  const prevHR = React.useRef(heartRate);

  useEffect(() => {
    if (prevHR.current !== heartRate) {
      setHrPulse(true);
      const timer = setTimeout(() => setHrPulse(false), 300);
      prevHR.current = heartRate;
      return () => clearTimeout(timer);
    }
  }, [heartRate]);

  useEffect(() => {
    if (isRunning) {
      updateSortByBPM(heartRate, cadence);
    }
  }, [heartRate, cadence, isRunning, updateSortByBPM]);

  const hrColor = getHeartRateColor(heartRate);

  return (
    <div className="song-list-container">
      <div className="motion-card">
        <div className="motion-card-inner">
          <div className="motion-stat">
            <div className="motion-stat-label">心率</div>
            <motion.div
              className="motion-stat-value"
              style={{ color: hrColor }}
              animate={{
                scale: hrPulse ? [1, 1.15, 1] : 1
              }}
              transition={{ duration: 0.3 }}
            >
              {heartRate}
              <span className="motion-stat-unit">bpm</span>
            </motion.div>
          </div>
          <div className="motion-divider" />
          <div className="motion-stat">
            <div className="motion-stat-label">步频</div>
            <div className="motion-stat-value" style={{ color: '#00bcd4' }}>
              {cadence}
              <span className="motion-stat-unit">spm</span>
            </div>
          </div>
        </div>
      </div>

      <div className="song-list">
        <AnimatePresence mode="popLayout">
          {sortedSongs.map((song, index) => {
            const isTop3 = index < 3 && song.matchScore > 0.5;
            return (
              <motion.div
                key={song.id}
                layout
                initial={{ opacity: 0, x: -60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{
                  layout: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 0.3 },
                  x: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
                }}
                className="song-card"
                style={{
                  background: getMatchGradient(song.matchScore),
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => onSongClick(song)}
                whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                whileTap={{ scale: 0.98 }}
              >
                {isTop3 && (
                  <motion.div
                    className="glow-border"
                    animate={{
                      boxShadow: [
                        '0 0 8px rgba(0,188,212,0.3), inset 0 0 8px rgba(0,188,212,0.1)',
                        '0 0 20px rgba(224,64,251,0.6), inset 0 0 12px rgba(224,64,251,0.2)',
                        '0 0 8px rgba(0,188,212,0.3), inset 0 0 8px rgba(0,188,212,0.1)'
                      ]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                <div className="song-card-rank">
                  <span
                    style={{
                      color: isTop3 ? '#e040fb' : '#555',
                      fontWeight: 700
                    }}
                  >
                    {index + 1}
                  </span>
                </div>

                <div className="song-card-info">
                  <div className="song-card-title">{song.title}</div>
                  <div className="song-card-artist">{song.artist}</div>
                </div>

                <div className="song-card-meta">
                  <div className="song-card-bpm">
                    <span className="bpm-badge">{song.bpm} BPM</span>
                  </div>
                  <div className="song-card-duration">
                    {formatDuration(song.duration)}
                  </div>
                  {song.matchScore > 0 && (
                    <div className="song-card-match">
                      <div className="match-bar-bg">
                        <motion.div
                          className="match-bar-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${song.matchScore * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="match-text">
                        {Math.round(song.matchScore * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <style>{`
        .song-list-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px;
          overflow-y: auto;
          gap: 16px;
        }
        .motion-card {
          width: 280px;
          height: 120px;
          background: #1e1e1e;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.3);
          border: 1px solid #2a2a2a;
          flex-shrink: 0;
        }
        .motion-card-inner {
          display: flex;
          align-items: center;
          gap: 24px;
          width: 100%;
          justify-content: center;
        }
        .motion-stat {
          text-align: center;
        }
        .motion-stat-label {
          font-size: 11px;
          color: #777;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .motion-stat-value {
          font-size: 36px;
          font-weight: 800;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .motion-stat-unit {
          font-size: 12px;
          color: #555;
          margin-left: 2px;
          font-weight: 400;
        }
        .motion-divider {
          width: 1px;
          height: 40px;
          background: #333;
        }
        .song-list {
          width: 60%;
          min-width: 320px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .song-card {
          width: 100%;
          height: 70px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 12px;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .glow-border {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          pointer-events: none;
          border: 1px solid transparent;
        }
        .song-card-rank {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          border-radius: 6px;
          background: rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .song-card-info {
          flex: 1;
          min-width: 0;
        }
        .song-card-title {
          color: #e0e0e0;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .song-card-artist {
          color: #888;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .song-card-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          flex-shrink: 0;
        }
        .bpm-badge {
          background: rgba(0,188,212,0.15);
          color: #00bcd4;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
          font-family: 'JetBrains Mono', monospace;
        }
        .song-card-duration {
          color: #666;
          font-size: 11px;
          font-family: monospace;
        }
        .song-card-match {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .match-bar-bg {
          width: 50px;
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
          overflow: hidden;
        }
        .match-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00bcd4, #e040fb);
          border-radius: 2px;
        }
        .match-text {
          font-size: 10px;
          color: #999;
          font-family: monospace;
          min-width: 30px;
          text-align: right;
        }
        @media (max-width: 768px) {
          .song-list {
            width: 100%;
            min-width: 0;
          }
          .motion-card {
            width: 100%;
            max-width: 320px;
          }
          .motion-stat-value {
            font-size: 28px;
          }
          .song-card {
            height: 60px;
            padding: 0 10px;
          }
          .song-card-title {
            font-size: 13px;
          }
          .song-card-artist {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}
