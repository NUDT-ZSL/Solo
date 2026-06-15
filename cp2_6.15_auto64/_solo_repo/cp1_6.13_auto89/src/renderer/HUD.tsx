import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useSim } from '../core/SimContext';

const RADAR_RADIUS = 80;
const RADAR_CENTER = { x: RADAR_RADIUS + 10, y: RADAR_RADIUS + 10 };
const MAX_MAP_RADIUS = 400;
const HUD_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 10,
};

const CONTAINER_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 20,
  left: 20,
  display: 'flex',
  gap: 20,
  pointerEvents: 'auto',
};

const RADAR_CONTAINER_STYLE: React.CSSProperties = {
  position: 'relative',
  width: (RADAR_RADIUS + 10) * 2,
  height: (RADAR_RADIUS + 10) * 2,
  background: 'rgba(0, 0, 0, 0.5)',
  borderRadius: '50%',
  border: '2px solid #00d4ff',
  boxShadow: '0 0 15px rgba(0, 212, 255, 0.4), inset 0 0 20px rgba(0, 212, 255, 0.1)',
  overflow: 'hidden',
};

const LIST_CONTAINER_STYLE: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.5)',
  border: '2px solid #00d4ff',
  borderRadius: 8,
  padding: '12px 16px',
  minWidth: 240,
  boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)',
};

const LIST_TITLE_STYLE: React.CSSProperties = {
  color: '#00d4ff',
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 8,
  textShadow: '0 0 8px rgba(0, 212, 255, 0.8)',
  borderBottom: '1px solid rgba(0, 212, 255, 0.3)',
  paddingBottom: 6,
  letterSpacing: 1,
};

const LIST_ITEM_STYLE: React.CSSProperties = {
  color: '#e0f7fa',
  fontSize: 12,
  padding: '4px 0',
  fontFamily: 'Consolas, Monaco, monospace',
  display: 'flex',
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
  transition: 'all 0.3s ease',
};

const COUNT_STYLE: React.CSSProperties = {
  color: '#e0f7fa',
  fontSize: 13,
  marginBottom: 10,
  fontFamily: 'Consolas, Monaco, monospace',
};

const EMPTY_STYLE: React.CSSProperties = {
  color: 'rgba(224, 247, 250, 0.4)',
  fontSize: 12,
  fontStyle: 'italic',
  padding: '10px 0',
  textAlign: 'center',
};

interface DetectedFishInfo {
  index: number;
  distance: number;
  azimuth: number;
}

function computeAzimuth(x: number, z: number): number {
  let angle = Math.atan2(x, -z) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  return angle;
}

function RadarMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { fishManager, sonarSystem } = useSim();
  const animRef = useRef<number>(0);
  const sweepAngleRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = (RADAR_RADIUS + 10) * 2;
    canvas.width = size * window.devicePixelRatio;
    canvas.height = size * window.devicePixelRatio;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.beginPath();
      ctx.arc(RADAR_CENTER.x, RADAR_CENTER.y, RADAR_RADIUS, 0, Math.PI * 2);
      ctx.clip();

      const pulseProgress = sonarSystem.getPulseProgress();
      if (pulseProgress > 0 && pulseProgress < 1) {
        const pulseR = pulseProgress * RADAR_RADIUS;
        const pulseAlpha = (1 - pulseProgress) * 0.5;
        const gradient = ctx.createRadialGradient(
          RADAR_CENTER.x, RADAR_CENTER.y, pulseR - 15,
          RADAR_CENTER.x, RADAR_CENTER.y, pulseR
        );
        gradient.addColorStop(0, `rgba(0, 212, 255, 0)`);
        gradient.addColorStop(1, `rgba(0, 212, 255, ${pulseAlpha})`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(RADAR_CENTER.x, RADAR_CENTER.y, pulseR, 0, Math.PI * 2);
        ctx.fill();
      }

      sweepAngleRef.current = (sweepAngleRef.current + 0.02) % (Math.PI * 2);
      const sweepGradient = ctx.createConicGradient
        ? ctx.createConicGradient(sweepAngleRef.current - Math.PI / 3, RADAR_CENTER.x, RADAR_CENTER.y)
        : null;
      if (sweepGradient) {
        sweepGradient.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
        sweepGradient.addColorStop(0.15, 'rgba(0, 212, 255, 0)');
        sweepGradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
        ctx.fillStyle = sweepGradient;
        ctx.beginPath();
        ctx.arc(RADAR_CENTER.x, RADAR_CENTER.y, RADAR_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        const r = (RADAR_RADIUS / 4) * i;
        ctx.beginPath();
        ctx.arc(RADAR_CENTER.x, RADAR_CENTER.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(RADAR_CENTER.x - RADAR_RADIUS, RADAR_CENTER.y);
      ctx.lineTo(RADAR_CENTER.x + RADAR_RADIUS, RADAR_CENTER.y);
      ctx.moveTo(RADAR_CENTER.x, RADAR_CENTER.y - RADAR_RADIUS);
      ctx.lineTo(RADAR_CENTER.x, RADAR_CENTER.y + RADAR_RADIUS);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
      ctx.lineWidth = 1.5;
      const coneAngle = sonarSystem.getConeAngle();
      const leftAngle = -Math.PI / 2 - coneAngle;
      const rightAngle = -Math.PI / 2 + coneAngle;
      ctx.beginPath();
      ctx.moveTo(RADAR_CENTER.x, RADAR_CENTER.y);
      ctx.lineTo(
        RADAR_CENTER.x + Math.cos(leftAngle) * RADAR_RADIUS,
        RADAR_CENTER.y + Math.sin(leftAngle) * RADAR_RADIUS
      );
      ctx.moveTo(RADAR_CENTER.x, RADAR_CENTER.y);
      ctx.lineTo(
        RADAR_CENTER.x + Math.cos(rightAngle) * RADAR_RADIUS,
        RADAR_CENTER.y + Math.sin(rightAngle) * RADAR_RADIUS
      );
      ctx.stroke();

      const positions = fishManager.getFishPositions();
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const status = fishManager.getFishStatus(i);

        const dx = pos.x;
        const dz = pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const mappedDist = Math.min(dist, MAX_MAP_RADIUS) / MAX_MAP_RADIUS * RADAR_RADIUS;
        const angle = Math.atan2(dx, -dz) - Math.PI / 2;

        const px = RADAR_CENTER.x + Math.cos(angle) * mappedDist;
        const py = RADAR_CENTER.y + Math.sin(angle) * mappedDist;

        const isDetected = status.detected;
        const echoProgress = sonarSystem.getEchoProgress(i);
        const isFlashing = echoProgress > 0 && echoProgress < 1;

        if (isFlashing) {
          const flashR = 2 + echoProgress * 8;
          ctx.beginPath();
          ctx.arc(px, py, flashR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 136, 0, ${(1 - echoProgress) * 0.6})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(px, py, isDetected ? 3.5 : 2.5, 0, Math.PI * 2);
        if (isDetected) {
          ctx.fillStyle = '#ffcc00';
          ctx.shadowColor = '#ffcc00';
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(RADAR_CENTER.x, RADAR_CENTER.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00d4ff';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [fishManager, sonarSystem]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  );
}

function FishList() {
  const { fishManager, sonarSystem } = useSim();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTick(t => (t + 1) % 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const detectedFishes = useMemo<DetectedFishInfo[]>(() => {
    const result: DetectedFishInfo[] = [];
    const positions = fishManager.getFishPositions();
    for (let i = 0; i < positions.length; i++) {
      const status = fishManager.getFishStatus(i);
      if (status.detected) {
        const pos = positions[i];
        const dx = pos.x;
        const dz = pos.z;
        const distance = Math.sqrt(dx * dx + dz * dz + pos.y * pos.y);
        const azimuth = computeAzimuth(dx, dz);
        result.push({ index: i, distance, azimuth });
      }
    }
    result.sort((a, b) => a.distance - b.distance);
    return result;
  }, [tick, fishManager, sonarSystem]);

  return (
    <div style={LIST_CONTAINER_STYLE}>
      <div style={LIST_TITLE_STYLE}>声纳探测信息 / TARGET INFO</div>
      <div style={COUNT_STYLE}>
        已探测目标: <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>{detectedFishes.length}</span> / {fishManager.getFishCount()}
      </div>
      {detectedFishes.length === 0 ? (
        <div style={EMPTY_STYLE}>等待声纳扫描中...</div>
      ) : (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {detectedFishes.map(fish => (
            <div key={fish.index} style={LIST_ITEM_STYLE}>
              <span style={{ color: '#00d4ff' }}>#{String(fish.index + 1).padStart(2, '0')}</span>
              <span>距离: <span style={{ color: '#ffcc00' }}>{fish.distance.toFixed(1)}m</span></span>
              <span>方位: <span style={{ color: '#e0f7fa' }}>{fish.azimuth.toFixed(0)}°</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HUD() {
  return (
    <div style={HUD_STYLE}>
      <div style={CONTAINER_STYLE}>
        <div style={RADAR_CONTAINER_STYLE}>
          <RadarMap />
        </div>
        <FishList />
      </div>
    </div>
  );
}
