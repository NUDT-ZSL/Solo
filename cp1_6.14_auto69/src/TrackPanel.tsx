import React from 'react';
import type { Track, InstrumentType } from './types';
import { INSTRUMENT_COLORS, GRID_HEIGHT } from './types';

interface TrackPanelProps {
  tracks: Track[];
  onVolumeChange: (trackId: string, volume: number) => void;
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onTransposeChange: (trackId: string, transpose: number) => void;
  onSpeedChange: (trackId: string, speed: number) => void;
}

const instrumentIcons: Record<InstrumentType, string> = {
  piano: '🎹',
  drums: '🥁',
  bass: '🎸',
};

const instrumentNames: Record<InstrumentType, string> = {
  piano: '钢琴',
  drums: '鼓',
  bass: '贝司',
};

export const TrackPanel: React.FC<TrackPanelProps> = ({
  tracks,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onTransposeChange,
  onSpeedChange,
}) => {
  const transposeOptions = Array.from({ length: 25 }, (_, i) => i - 12);
  const speedOptions = [0.5, 1, 2];

  return (
    <div style={styles.trackPanel}>
      <div style={styles.header}>
        <span style={styles.headerText}>轨道</span>
      </div>
      <div style={styles.trackList}>
        {tracks.map((track, trackIndex) => (
          <div
            key={track.id}
            style={{
              ...styles.trackItem,
              height: `${GRID_HEIGHT}px`,
              borderBottom: trackIndex < tracks.length - 1 ? '1px solid #2a2a3e' : 'none',
            }}
          >
            <div style={styles.iconContainer}>
              <span style={{ ...styles.instrumentIcon, color: INSTRUMENT_COLORS[track.instrument] }}>
                {instrumentIcons[track.instrument]}
              </span>
              <span style={styles.trackName}>{instrumentNames[track.instrument]}</span>
            </div>

            <div style={styles.controlsRow}>
              <button
                style={{
                  ...styles.controlButton,
                  backgroundColor: track.muted ? '#ff6b6b' : '#3a3a4e',
                }}
                onClick={() => onMuteToggle(track.id)}
                title="静音"
              >
                M
              </button>
              <button
                style={{
                  ...styles.controlButton,
                  backgroundColor: track.solo ? '#ff6b6b' : '#3a3a4e',
                }}
                onClick={() => onSoloToggle(track.id)}
                title="独奏"
              >
                S
              </button>
            </div>

            <div style={styles.volumeContainer}>
              <input
                type="range"
                min="0"
                max="100"
                value={track.volume}
                onChange={(e) => onVolumeChange(track.id, parseInt(e.target.value, 10))}
                style={styles.volumeSlider}
              />
              <span style={styles.volumeValue}>{track.volume}</span>
            </div>

            <div style={styles.selectContainer}>
              <select
                value={track.transpose}
                onChange={(e) => onTransposeChange(track.id, parseInt(e.target.value, 10))}
                style={styles.select}
                title="移调"
              >
                {transposeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t > 0 ? `+${t}` : t}
                  </option>
                ))}
              </select>
              <select
                value={track.speedMultiplier}
                onChange={(e) => onSpeedChange(track.id, parseFloat(e.target.value))}
                style={styles.select}
                title="速度"
              >
                {speedOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}x
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  trackPanel: {
    width: '260px',
    backgroundColor: '#12122a',
    borderRight: '1px solid #2a2a3e',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  header: {
    height: '40px',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #2a2a3e',
    backgroundColor: '#0b0b1a',
  },
  headerText: {
    color: '#e0e0e0',
    fontSize: '14px',
    fontWeight: 600,
  },
  trackList: {
    flex: 1,
    overflowY: 'auto',
  },
  trackItem: {
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  instrumentIcon: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  trackName: {
    color: '#e0e0e0',
    fontSize: '12px',
    fontWeight: 500,
  },
  controlsRow: {
    display: 'flex',
    gap: '6px',
  },
  controlButton: {
    width: '24px',
    height: '20px',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  volumeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  volumeSlider: {
    flex: 1,
    height: '4px',
    WebkitAppearance: 'none',
    appearance: 'none',
    background: '#2a2a3e',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
  },
  volumeValue: {
    color: '#888899',
    fontSize: '10px',
    width: '24px',
    textAlign: 'right',
  },
  selectContainer: {
    display: 'flex',
    gap: '6px',
  },
  select: {
    flex: 1,
    height: '22px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a3e',
    borderRadius: '4px',
    color: '#e0e0e0',
    fontSize: '11px',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
};
