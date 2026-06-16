import React from 'react';
import { WINDOW_CONFIGS, WINDOW_TYPES, SEASONS, SEASON_SOLAR_DATA, type WindowType, type Season } from '@/data/roomConfig';

interface ControlPanelProps {
  windowType: WindowType;
  orientation: number;
  time: number;
  season: Season;
  sunAltitude: number;
  sunAzimuth: number;
  onWindowTypeChange: (type: WindowType) => void;
  onOrientationChange: (value: number) => void;
  onTimeChange: (value: number) => void;
  onSeasonChange: (season: Season) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  windowType,
  orientation,
  time,
  season,
  sunAltitude,
  sunAzimuth,
  onWindowTypeChange,
  onOrientationChange,
  onTimeChange,
  onSeasonChange,
}) => {
  const hours = Math.floor(time);
  const minutes = Math.round((time - hours) * 60);
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const currentConfig = WINDOW_CONFIGS[windowType];

  return (
    <div style={styles.panel}>
      <div style={styles.summary}>
        <div style={styles.summaryIcon}>{currentConfig.icon}</div>
        <div style={styles.summaryText}>
          <div style={styles.summaryType}>{currentConfig.label}</div>
          <div style={styles.summaryMeta}>
            {timeStr} · {SEASON_SOLAR_DATA[season].label}
          </div>
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.controlGroup}>
        <label style={styles.label}>窗户类型</label>
        <div style={styles.buttonGroup}>
          {WINDOW_TYPES.map((type) => (
            <button
              key={type}
              style={{
                ...styles.typeButton,
                ...(windowType === type ? styles.typeButtonActive : {}),
              }}
              onClick={() => onWindowTypeChange(type)}
            >
              {WINDOW_CONFIGS[type].icon} {WINDOW_CONFIGS[type].label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.controlGroup}>
        <label style={styles.label}>朝向角度: {orientation}°</label>
        <div style={styles.sliderContainer}>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={orientation}
            onChange={(e) => onOrientationChange(Number(e.target.value))}
            style={styles.slider as React.CSSProperties}
          />
          <div style={styles.sliderLabels}>
            <span>0° 北</span>
            <span>90° 东</span>
            <span>180° 南</span>
            <span>270° 西</span>
          </div>
        </div>
      </div>

      <div style={styles.controlGroup}>
        <label style={styles.label}>时间: {timeStr}</label>
        <input
          type="range"
          min={6}
          max={18}
          step={0.25}
          value={time}
          onChange={(e) => onTimeChange(Number(e.target.value))}
          style={styles.slider as React.CSSProperties}
        />
        <div style={styles.sliderLabels}>
          <span>6:00</span>
          <span>12:00</span>
          <span>18:00</span>
        </div>
      </div>

      <div style={styles.controlGroup}>
        <label style={styles.label}>季节</label>
        <div style={styles.buttonGroup}>
          {SEASONS.map((s) => (
            <button
              key={s}
              style={{
                ...styles.seasonButton,
                ...(season === s ? styles.seasonButtonActive : {}),
              }}
              onClick={() => onSeasonChange(s)}
            >
              {SEASON_SOLAR_DATA[s].label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.stats}>
        <div style={styles.statRow}>
          <span style={styles.statLabel}>太阳高度角</span>
          <span style={styles.statValue}>{sunAltitude.toFixed(1)}°</span>
        </div>
        <div style={styles.statRow}>
          <span style={styles.statLabel}>太阳方位角</span>
          <span style={styles.statValue}>{sunAzimuth.toFixed(1)}°</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 280,
    minWidth: 280,
    height: '100%',
    background: 'rgba(30, 30, 50, 0.85)',
    borderRadius: 12,
    border: '1px solid #4a4a6a',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    fontSize: 32,
    color: '#818cf8',
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 10,
    border: '1px solid rgba(99, 102, 241, 0.3)',
  },
  summaryText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  summaryType: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 600,
  },
  summaryMeta: {
    color: '#a0a0c0',
    fontSize: 13,
  },
  divider: {
    height: 1,
    background: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: 500,
  },
  buttonGroup: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap' as const,
  },
  typeButton: {
    padding: '6px 10px',
    borderRadius: 8,
    border: 'none',
    background: '#2a2a4a',
    color: '#a0a0c0',
    cursor: 'pointer',
    fontSize: 12,
    transition: 'all 0.2s ease-out',
    flex: '1 1 auto',
    minWidth: 0,
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
  },
  typeButtonActive: {
    background: '#4f46e5',
    color: '#ffffff',
  },
  seasonButton: {
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    background: '#2a2a4a',
    color: '#a0a0c0',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'all 0.2s ease-out',
    flex: 1,
    textAlign: 'center' as const,
  },
  seasonButtonActive: {
    background: '#4f46e5',
    color: '#ffffff',
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  slider: {
    width: '100%',
    height: 6,
    appearance: 'none' as any,
    WebkitAppearance: 'none' as any,
    background: '#3a3a5a',
    borderRadius: 3,
    outline: 'none',
    cursor: 'pointer',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#6a6a8a',
    fontSize: 10,
  },
  stats: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#8080a0',
    fontSize: 13,
  },
  statValue: {
    color: '#22c55e',
    fontSize: 14,
    fontFamily: '"Courier New", monospace',
    fontWeight: 600,
  },
};

export default ControlPanel;
