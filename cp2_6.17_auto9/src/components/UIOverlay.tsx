import { useEffect, useRef } from 'react';
import type { SeasonName, SeasonConfig } from '../utils/seasonConfig';
import { SEASON_CONFIGS, SEASON_ORDER, TOTAL_PARTICLES } from '../utils/seasonConfig';
import { animateValue, easeOutCubic } from '../utils/interpolate';

interface UIOverlayProps {
  currentSeason: SeasonName;
  onSeasonChange: (season: SeasonName) => void;
  isTransitioning: boolean;
  transitionKey: number;
}

export function UIOverlay({
  currentSeason,
  onSeasonChange,
  isTransitioning,
  transitionKey,
}: UIOverlayProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const animHandleRef = useRef<{ cancel: () => void } | null>(null);

  const config: SeasonConfig = SEASON_CONFIGS[currentSeason];

  useEffect(() => {
    if (!progressBarRef.current) return;
    if (animHandleRef.current) {
      animHandleRef.current.cancel();
    }
    progressBarRef.current.style.width = '0px';
    animHandleRef.current = animateValue(
      800,
      (_, eased) => {
        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${eased * 300}px`;
        }
      },
      undefined,
      easeOutCubic,
    );
    return () => {
      if (animHandleRef.current) {
        animHandleRef.current.cancel();
      }
    };
  }, [transitionKey]);

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 10,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  };

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 200,
    padding: 16,
    background: '#ffffff80',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
    pointerEvents: 'auto',
  };

  const buttonRowStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 20,
    pointerEvents: 'auto',
  };

  const buttonStyle = (color: string, isActive: boolean): React.CSSProperties => ({
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: `3px solid ${isActive ? '#fff' : 'rgba(255,255,255,0.3)'}`,
    background: color,
    cursor: isTransitioning ? 'wait' : 'pointer',
    transition: 'transform 0.2s ease-out, box-shadow 0.2s ease, border-color 0.2s ease',
    transform: isActive ? 'scale(1.1)' : 'scale(1)',
    boxShadow: isActive
      ? `0 0 0 4px ${color}33, 0 6px 16px rgba(0,0,0,0.3)`
      : '0 2px 8px rgba(0,0,0,0.15)',
    boxSizing: 'border-box',
    opacity: isTransitioning ? 0.7 : 1,
  });

  const progressWrapStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 44,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 300,
    height: 6,
    background: '#cbd5e1',
    borderRadius: 3,
    overflow: 'hidden',
    pointerEvents: 'none',
  };

  const progressFillStyle: React.CSSProperties = {
    height: '100%',
    background: config.canopyColor,
    borderRadius: 3,
    width: '100%',
    transition: 'background-color 1.5s ease',
  };

  const paramRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 12,
    color: '#334155',
    padding: '4px 0',
    lineHeight: 1.6,
  };

  const seasonTitleStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const colorDotStyle: React.CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: config.canopyColor,
    border: '1px solid rgba(0,0,0,0.1)',
    transition: 'background-color 1.5s ease',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isTransitioning) return;
    e.currentTarget.style.transform = 'scale(1.05)';
    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>, isActive: boolean) => {
    e.currentTarget.style.transform = isActive ? 'scale(1.1)' : 'scale(1)';
    e.currentTarget.style.boxShadow = isActive
      ? `0 0 0 4px ${e.currentTarget.style.background}33, 0 6px 16px rgba(0,0,0,0.3)`
      : '0 2px 8px rgba(0,0,0,0.15)';
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isTransitioning) return;
    e.currentTarget.style.transform = 'scale(0.95)';
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>, isActive: boolean) => {
    e.currentTarget.style.transform = isActive ? 'scale(1.1)' : 'scale(1.05)';
  };

  return (
    <div style={containerStyle}>
      <div style={panelStyle}>
        <div style={seasonTitleStyle}>
          <span style={colorDotStyle} />
          <span>{config.name}</span>
        </div>
        <div style={{ ...paramRowStyle, borderTop: '1px solid rgba(148,163,184,0.25)', paddingTop: 8, marginTop: 4 }}>
          <span style={{ color: '#64748b' }}>主色调</span>
          <span style={{ fontWeight: 600, color: config.canopyColor, letterSpacing: 0.5 }}>
            {config.canopyColor.toUpperCase()}
          </span>
        </div>
        <div style={paramRowStyle}>
          <span style={{ color: '#64748b' }}>环境光强度</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>
            {(config.ambientIntensity * 100).toFixed(0)}%
          </span>
        </div>
        <div style={paramRowStyle}>
          <span style={{ color: '#64748b' }}>粒子数量</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>
            {TOTAL_PARTICLES.toLocaleString()}
          </span>
        </div>
      </div>

      <div style={buttonRowStyle}>
        {SEASON_ORDER.map((sn) => {
          const sc = SEASON_CONFIGS[sn];
          const active = currentSeason === sn;
          return (
            <button
              key={sn}
              aria-label={sc.name}
              title={sc.name}
              disabled={isTransitioning}
              style={buttonStyle(sc.canopyColor, active)}
              onClick={() => !isTransitioning && onSeasonChange(sn)}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={(e) => handleMouseLeave(e, active)}
              onMouseDown={handleMouseDown}
              onMouseUp={(e) => handleMouseUp(e, active)}
            />
          );
        })}
      </div>

      <div style={progressWrapStyle}>
        <div ref={progressBarRef} style={progressFillStyle} />
      </div>
    </div>
  );
}
