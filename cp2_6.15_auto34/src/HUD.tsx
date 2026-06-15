import { useGameStore } from './useGameStore';
import type { Asteroid, Vector3 } from './gameLogic';
import { v3 } from './gameLogic';

interface HUDProps {
  formatTime: (seconds: number) => string;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`heart-icon ${filled ? '' : 'lost'}`}
      viewBox="0 0 24 24"
      fill={filled ? '#ff3355' : 'none'}
      stroke={filled ? '#ff3355' : '#666'}
      strokeWidth="2"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function computeRadarDots(
  asteroids: Asteroid[],
  shipPos: Vector3,
  shipYaw: number,
  radarRadius: number,
  range: number,
): { x: number; y: number }[] {
  const cos = Math.cos(-shipYaw);
  const sin = Math.sin(-shipYaw);
  return asteroids
    .map(a => {
      const dx = a.position.x - shipPos.x;
      const dz = a.position.z - shipPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > range) return null;
      const rx = (dx * cos - dz * sin) / range;
      const rz = (dx * sin + dz * cos) / range;
      const scale = radarRadius - 6;
      return {
        x: radarRadius + rx * scale,
        y: radarRadius + rz * scale,
      };
    })
    .filter((v): v is { x: number; y: number } => v !== null);
}

function HUD({ formatTime }: HUDProps) {
  const {
    shipHealth,
    score,
    elapsedTime,
    asteroids,
    shipPosition,
    shipRotation,
    showWarning,
  } = useGameStore();

  const radarSize = typeof window !== 'undefined' && window.innerWidth < 768 ? 90 : 120;
  const radarRadius = radarSize / 2;
  const radarDots = computeRadarDots(asteroids, shipPosition, shipRotation.y, radarRadius, 40);

  return (
    <div className="hud">
      <div className="hud-top-left">
        <div className="hearts">
          {[0, 1, 2].map(i => (
            <HeartIcon key={i} filled={i < shipHealth} />
          ))}
        </div>
        <div className="score-display">得分: {score}</div>
        <div className="time-display">时间: {formatTime(elapsedTime)}</div>
      </div>

      <div className="hud-top-right">
        <div className="radar" style={{ width: radarSize, height: radarSize }}>
          <div className="radar-sweep" />
          {radarDots.map((dot, idx) => (
            <div
              key={idx}
              className="radar-dot"
              style={{ left: `${(dot.x / radarSize) * 100}%`, top: `${(dot.y / radarSize) * 100}%` }}
            />
          ))}
          <div className="radar-ship" />
        </div>
      </div>

      {showWarning && <div className="warning-border" key={Date.now()} />}
    </div>
  );
}

export default HUD;
