import { useEffect, useState } from 'react';
import { useGameStore } from './useGameStore';
import type { Asteroid, Vector3 } from './gameLogic';

interface HUDProps {
  formatTime: (seconds: number) => string;
}

function HeartIcon({ filled, scale }: { filled: boolean; scale: number }) {
  return (
    <svg
      className={`heart-icon ${filled ? '' : 'lost'}`}
      viewBox="0 0 24 24"
      fill={filled ? '#ff3355' : 'none'}
      stroke={filled ? '#ff3355' : '#666'}
      strokeWidth="2"
      style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function computeRadarDots(
  asteroids: Asteroid[],
  shipPos: Vector3,
  shipYaw: number,
  radarSize: number,
  range: number,
): { x: number; y: number }[] {
  const radarRadius = radarSize / 2;
  const cos = Math.cos(-shipYaw);
  const sin = Math.sin(-shipYaw);
  const scale = radarRadius - 10;

  return asteroids
    .map(a => {
      const dx = a.position.x - shipPos.x;
      const dz = a.position.z - shipPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > range) return null;

      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;

      const normX = localX / range;
      const normZ = localZ / range;

      return {
        x: radarRadius + normX * scale,
        y: radarRadius - normZ * scale,
      };
    })
    .filter((v): v is { x: number; y: number } => v !== null);
}

function HUD({ formatTime }: HUDProps) {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [warningKey, setWarningKey] = useState(0);

  useEffect(() => {
    const checkSize = () => setIsSmallScreen(window.innerWidth < 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const {
    shipHealth,
    score,
    elapsedTime,
    asteroids,
    shipPosition,
    shipRotation,
    showWarning,
  } = useGameStore();

  useEffect(() => {
    if (showWarning) setWarningKey(k => k + 1);
  }, [showWarning]);

  const scale = isSmallScreen ? 0.8 : 1;
  const radarSize = isSmallScreen ? 90 : 120;
  const radarDots = computeRadarDots(asteroids, shipPosition, shipRotation.y, radarSize, 40);

  return (
    <div className="hud">
      <div
        className="hud-top-left"
        style={{
          left: isSmallScreen ? 12 : 20,
          top: isSmallScreen ? 12 : 20,
          gap: isSmallScreen ? 8 : 12,
        }}
      >
        <div className="hearts" style={{ gap: isSmallScreen ? 6 : 8 }}>
          {[0, 1, 2].map(i => (
            <HeartIcon key={i} filled={i < shipHealth} scale={scale} />
          ))}
        </div>
        <div
          className="score-display"
          style={{
            fontSize: (isSmallScreen ? 16 : 20) * scale,
          }}
        >
          得分: {score}
        </div>
        <div
          className="time-display"
          style={{
            fontSize: (isSmallScreen ? 13 : 16) * scale,
          }}
        >
          时间: {formatTime(elapsedTime)}
        </div>
      </div>

      <div
        className="hud-top-right"
        style={{
          right: isSmallScreen ? 12 : 20,
          top: isSmallScreen ? 12 : 20,
        }}
      >
        <div className="radar" style={{ width: radarSize, height: radarSize }}>
          <div className="radar-sweep" />
          {radarDots.map((dot, idx) => (
            <div
              key={idx}
              className="radar-dot"
              style={{
                left: `${(dot.x / radarSize) * 100}%`,
                top: `${(dot.y / radarSize) * 100}%`,
                width: isSmallScreen ? 5 : 6,
                height: isSmallScreen ? 5 : 6,
              }}
            />
          ))}
          <div className="radar-ship" />
        </div>
      </div>

      {showWarning && <div className="warning-border" key={warningKey} />}
    </div>
  );
}

export default HUD;
