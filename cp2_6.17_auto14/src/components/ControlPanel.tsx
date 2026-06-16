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

const WindowIcon: React.FC<{ type: WindowType; size?: number }> = ({ type, size = 32 }) => {
  const common: React.CSSProperties = { width: size, height: size, fill: 'none', strokeWidth: 1.5, display: 'block' };
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
      <svg width="56" height="56" viewBox="0 0 64 64" style={styles.compassSvg}>
        <circle cx="32" cy="32" r="28" fill="rgba(30,30,50,0.6)" stroke="#4a4a6a" strokeWidth="1.5" />
        <text x="32" y="10" fill="#818cf8" fontSize="10" textAnchor="middle" fontWeight="600">N</text>
        <text x="56" y="35" fill="#6a6a8a" fontSize="9" textAnchor="middle">E</text>
        <text x="32" y="60" fill="#6a6a8a" fontSize="9" textAnchor="middle">S</text>
        <text x="8" y="35" fill="#6a6a8a" fontSize="9" textAnchor="middle">W</text>
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '32px 32px', transition: 'transform 0.25s ease-out' }}>
          <polygon points="32,14 36,28 32,25 28,28" fill="#ef4444" />
          <polygon points="32,50 36,36 32,39 28,36" fill="#6a6a8a" />
          <circle cx="32" cy="32" r="3" fill="#ffffff" />
        </g>
      </svg>
      <div style={styles.compassValue}>
        <span style={styles.compassAngle}>{angle}°</span>
        <span style={styles.compassDirText}>{direction}</span>
      </div>
    </div>
  );
};

const SliderWithValue: React.FC<{
  min: number;
  max: number;
  step: number;
  value: number;
  label: string;
  valueText: string;
  onChange: (v: number) => void;
  labels?: string[];
}> = ({ min, max, step, value, label, valueText, onChange, labels }) => {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div style={styles.sliderWithValue}>
      <div style={styles.sliderHeader}>
        <span style={styles.sliderLabel}>{label}</span>
        <span style={styles.sliderValueBadge}>{valueText}</span>
      </div>
      <div style={styles.sliderTrackContainer}>
        <div style={{ ...styles.sliderTrackFill, width: `${percent}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={styles.slider as React.CSSProperties}
        />
      </div>
      {labels && (
        <div style={styles.sliderLabels}>
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
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
        <div style={{ ...styles.summaryIcon, color: '#818cf8' }}>
          <WindowIcon type={windowType} size={28} />
        </div>
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
        <div style={styles.windowCardGrid}>
          {WINDOW_TYPES.map((type) => {
            const isActive = windowType === type;
            return (
              <button
                key={type}
                style={{
                  ...styles.windowCard,
                  ...(isActive ? styles.windowCardActive : {}),
                  borderColor: isActive ? '#3b82f6' : 'transparent',
                  transform: isActive ? 'scale(1.03)' : 'scale(1)',
                }}
                onClick={() => onWindowTypeChange(type)}
              >
                <div style={{ ...styles.windowCardIcon, color: isActive ? '#ffffff' : '#818cf8' }}>
                  <WindowIcon type={type} size={32} />
                </div>
                <span style={{ ...styles.windowCardLabel, color: isActive ? '#ffffff' : '#a0a0c0' }}>
                  {WINDOW_CONFIGS[type].label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={styles.controlGroup}>
        <CompassIndicator angle={orientation} />
        <SliderWithValue
          min={0}
          max={360}
          step={1}
          value={orientation}
          label="朝向"
          valueText={`${orientation}°`}
          onChange={onOrientationChange}
          labels={['北', '东', '南', '西']}
        />
      </div>

      <div style={styles.controlGroup}>
        <SliderWithValue
          min={6}
          max={18}
          step={0.25}
          value={time}
          label="时间"
          valueText={timeStr}
          onChange={onTimeChange}
          labels={['6:00', '12:00', '18:00']}
        />
        <div style={styles.altitudeTag}>
          <span style={styles.altitudeTagLabel}>预估太阳高度角</span>
          <span style={styles.altitudeTagValue}>{estimatedAltitude.toFixed(1)}°</span>
        </div>
      </div>

      <div style={styles.controlGroup}>
        <label style={styles.label}>季节</label>
        <div style={styles.seasonTagGroup}>
          {SEASONS.map((s) => {
            const isActive = season === s;
            return (
              <button
                key={s}
                style={{
                  ...styles.seasonTag,
                  ...(isActive ? styles.seasonTagActive : {}),
                }}
                onClick={() => onSeasonChange(s)}
              >
                {SEASON_SOLAR_DATA[s].label}
              </button>
            );
          })}
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
  windowCardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
  windowCard: {
    padding: '14px 10px',
    borderRadius: 12,
    border: '2px solid transparent',
    background: '#2a2a4a',
    cursor: 'pointer',
    transition: 'all 0.25s ease-out',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  },
  windowCardActive: {
    background: '#4f46e5',
    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.35)',
  },
  windowCardIcon: {
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.25s ease-out',
  },
  windowCardLabel: {
    fontSize: 13,
    fontWeight: 500,
    transition: 'color 0.25s ease-out',
  },
  compassContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '6px 4px',
  },
  compassSvg: {
    display: 'block',
    flexShrink: 0,
  },
  compassValue: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  compassAngle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 700,
    fontFamily: '"Courier New", monospace',
  },
  compassDirText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: 500,
  },
  sliderWithValue: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    color: '#e0e0e0',
    fontSize: 13,
    fontWeight: 500,
  },
  sliderValueBadge: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: '"Courier New", monospace',
    background: 'rgba(99, 102, 241, 0.25)',
    padding: '2px 8px',
    borderRadius: 6,
    border: '1px solid rgba(99, 102, 241, 0.4)',
  },
  sliderTrackContainer: {
    position: 'relative' as const,
    height: 6,
    background: '#3a3a5a',
    borderRadius: 3,
    width: '100%',
  },
  sliderTrackFill: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #818cf8)',
    borderRadius: 3,
    pointerEvents: 'none',
    transition: 'width 0.1s ease-out',
  },
  slider: {
    position: 'absolute' as const,
    top: '50%',
    left: 0,
    transform: 'translateY(-50%)',
    width: '100%',
    height: 6,
    appearance: 'none' as any,
    WebkitAppearance: 'none' as any,
    background: 'transparent',
    outline: 'none',
    cursor: 'pointer',
    margin: 0,
    padding: 0,
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#6a6a8a',
    fontSize: 10,
    marginTop: 2,
  },
  altitudeTag: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '7px 12px',
    background: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    border: '1px solid rgba(34, 197, 94, 0.3)',
    marginTop: 2,
  },
  altitudeTagLabel: {
    color: '#86efac',
    fontSize: 12,
  },
  altitudeTagValue: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: '"Courier New", monospace',
  },
  seasonTagGroup: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap' as const,
  },
  seasonTag: {
    flex: 1,
    minWidth: 'auto',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #3a3a5a',
    background: 'transparent',
    color: '#a0a0c0',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.25s ease-out',
    textAlign: 'center' as const,
  },
  seasonTagActive: {
    background: '#3b82f6',
    borderColor: '#60a5fa',
    color: '#ffffff',
    boxShadow: '0 2px 10px rgba(59, 130, 246, 0.3)',
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
