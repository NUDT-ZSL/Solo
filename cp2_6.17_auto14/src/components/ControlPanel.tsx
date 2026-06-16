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

const seasonIcons: Record<Season, { icon: string; color: string }> = {
  spring: { icon: '✿', color: '#86efac' },
  summer: { icon: '☀', color: '#fbbf24' },
  autumn: { icon: '🍂', color: '#f97316' },
  winter: { icon: '❄', color: '#93c5fd' },
};

const WindowIcon: React.FC<{ type: WindowType; size?: number }> = ({ type, size = 28 }) => {
  const common = { width: size, height: size, fill: 'none', strokeWidth: 1.5 };
  if (type === 'circle') {
    return (
      <svg viewBox="0 0 24 24" style={{ ...common, stroke: 'currentColor' }}>
        <circle cx="12" cy="12" r="7" />
        <line x1="5" y1="12" x2="19" y2="12" />
        <line x1="12" y1="5" x2="12" y2="19" />
      </svg>
    );
  }
  if (type === 'arch') {
    return (
      <svg viewBox="0 0 24 24" style={{ ...common, stroke: 'currentColor' }}>
        <path d="M 5 19 L 5 10 A 7 7 0 0 1 19 10 L 19 19 Z" />
        <line x1="12" y1="19" x2="12" y2="10" />
        <line x1="5" y1="14.5" x2="19" y2="14.5" />
      </svg>
    );
  }
  if (type === 'fullLength') {
    return (
      <svg viewBox="0 0 24 24" style={{ ...common, stroke: 'currentColor' }}>
        <rect x="4" y="3" width="16" height="18" rx="0.5" />
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="4" y1="12" x2="20" y2="12" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" style={{ ...common, stroke: 'currentColor' }}>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <line x1="4" y1="4" x2="20" y2="20" strokeDasharray="2,1.5" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
};

const CompassIndicator: React.FC<{ angle: number }> = ({ angle }) => {
  const rotation = angle - 90;
  const getDirection = (deg: number): string => {
    const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
    return dirs[idx];
  };
  const direction = getDirection(angle);

  return (
    <div style={styles.compassContainer}>
      <svg width="64" height="64" viewBox="0 0 64 64" style={styles.compassSvg}>
        <circle cx="32" cy="32" r="28" fill="rgba(30,30,50,0.6)" stroke="#4a4a6a" strokeWidth="1.5" />
        <text x="32" y="10" fill="#818cf8" fontSize="10" textAnchor="middle" fontWeight="600">N</text>
        <text x="56" y="35" fill="#6a6a8a" fontSize="9" textAnchor="middle">E</text>
        <text x="32" y="60" fill="#6a6a8a" fontSize="9" textAnchor="middle">S</text>
        <text x="8" y="35" fill="#6a6a8a" fontSize="9" textAnchor="middle">W</text>
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '32px 32px', transition: 'transform 0.3s ease-out' }}>
          <polygon points="32,14 36,28 32,25 28,28" fill="#ef4444" />
          <polygon points="32,50 36,36 32,39 28,36" fill="#6a6a8a" />
          <circle cx="32" cy="32" r="3" fill="#ffffff" />
        </g>
      </svg>
      <span style={styles.compassDirection}>{direction}</span>
    </div>
  );
};

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

  const getAltitudeForTime = (t: number, s: Season): number => {
    const solarData = SEASON_SOLAR_DATA[s];
    const dayProgress = ((t - 6) / 12);
    if (dayProgress < 0 || dayProgress > 1) return 0;
    const maxAlt = solarData.maxAltitude;
    const minAlt = solarData.minAltitude;
    return minAlt + (maxAlt - minAlt) * Math.sin(dayProgress * Math.PI);
  };

  const estimatedAltitude = getAltitudeForTime(time, season);

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
        <div style={styles.windowButtonGrid}>
          {WINDOW_TYPES.map((type) => (
            <button
              key={type}
              style={{
                ...styles.windowButton,
                ...(windowType === type ? styles.windowButtonActive : {}),
              }}
              onClick={() => onWindowTypeChange(type)}
            >
              <div style={{ ...styles.windowIconWrapper, color: windowType === type ? '#ffffff' : '#818cf8' }}>
                <WindowIcon type={type} size={28} />
              </div>
              <span style={{ ...styles.windowButtonLabel, color: windowType === type ? '#ffffff' : '#a0a0c0' }}>
                {WINDOW_CONFIGS[type].label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.controlGroup}>
        <label style={styles.label}>朝向角度: {orientation}°</label>
        <CompassIndicator angle={orientation} />
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
        <div style={styles.altitudeTag}>
          <span style={styles.altitudeTagLabel}>预估太阳高度角</span>
          <span style={styles.altitudeTagValue}>{estimatedAltitude.toFixed(1)}°</span>
        </div>
      </div>

      <div style={styles.controlGroup}>
        <label style={styles.label}>季节</label>
        <div style={styles.seasonCardGrid}>
          {SEASONS.map((s) => (
            <button
              key={s}
              style={{
                ...styles.seasonCard,
                ...(season === s ? styles.seasonCardActive : {}),
                borderColor: season === s ? '#3b82f6' : 'transparent',
              }}
              onClick={() => onSeasonChange(s)}
            >
              <div style={{ ...styles.seasonIcon, color: seasonIcons[s].color }}>
                {seasonIcons[s].icon}
              </div>
              <span style={{ ...styles.seasonLabel, color: season === s ? '#ffffff' : '#a0a0c0' }}>
                {SEASON_SOLAR_DATA[s].label}
              </span>
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
  windowButtonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
  },
  windowButton: {
    padding: '10px 8px',
    borderRadius: 10,
    border: '2px solid transparent',
    background: '#2a2a4a',
    cursor: 'pointer',
    fontSize: 12,
    transition: 'all 0.25s ease-out',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  windowButtonActive: {
    background: '#4f46e5',
    borderColor: '#818cf8',
  },
  windowIconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    transition: 'color 0.25s ease-out',
  },
  windowButtonLabel: {
    fontSize: 12,
    fontWeight: 500,
    transition: 'color 0.25s ease-out',
  },
  compassContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '4px 0',
  },
  compassSvg: {
    display: 'block',
  },
  compassDirection: {
    color: '#818cf8',
    fontSize: 18,
    fontWeight: 600,
    minWidth: 36,
    textAlign: 'center' as const,
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
  altitudeTag: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 10px',
    background: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 6,
    border: '1px solid rgba(34, 197, 94, 0.3)',
    marginTop: 4,
  },
  altitudeTagLabel: {
    color: '#86efac',
    fontSize: 11,
  },
  altitudeTagValue: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: '"Courier New", monospace',
  },
  seasonCardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
  },
  seasonCard: {
    padding: '12px 8px',
    borderRadius: 10,
    border: '2px solid transparent',
    background: '#2a2a4a',
    cursor: 'pointer',
    transition: 'all 0.25s ease-out',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  seasonCardActive: {
    background: '#1e1e3a',
  },
  seasonIcon: {
    fontSize: 24,
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
  },
  seasonLabel: {
    fontSize: 13,
    fontWeight: 500,
    transition: 'color 0.25s ease-out',
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
