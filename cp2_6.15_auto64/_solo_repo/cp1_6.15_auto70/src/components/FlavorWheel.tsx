import { useRef, useEffect, useCallback, useState } from 'react';
import {
  FlavorProfile,
  FLAVOR_KEYS,
  FLAVOR_LABELS,
  FLAVOR_COLORS,
} from '../utils/types';

interface FlavorWheelProps {
  flavorProfile: FlavorProfile;
  onChange: (profile: FlavorProfile) => void;
}

interface SectorState {
  hoverIndex: number;
  animProgress: number[];
}

const DIAMETER = 120;
const RADIUS = DIAMETER / 2;
const EXPAND_RATIO = 0.1;
const NUM_SECTORS = 5;
const SECTOR_ANGLE = (2 * Math.PI) / NUM_SECTORS;

export default function FlavorWheel({ flavorProfile, onChange }: FlavorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [editingIndex, setEditingIndex] = useState(-1);
  const sectorAngles = useRef<{ start: number; end: number }[]>([]);
  const animRef = useRef<number>(0);
  const expandRef = useRef<number[]>(new Array(NUM_SECTORS).fill(0));
  const targetExpandRef = useRef<number[]>(new Array(NUM_SECTORS).fill(0));
  const profileRef = useRef(flavorProfile);
  profileRef.current = flavorProfile;

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = DIAMETER * dpr;
    canvas.height = DIAMETER * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, DIAMETER, DIAMETER);
    const cx = RADIUS;
    const cy = RADIUS;

    sectorAngles.current = [];

    for (let i = 0; i < NUM_SECTORS; i++) {
      const key = FLAVOR_KEYS[i];
      const startAngle = -Math.PI / 2 + i * SECTOR_ANGLE;
      const endAngle = startAngle + SECTOR_ANGLE;
      sectorAngles.current.push({ start: startAngle, end: endAngle });

      const expand = expandRef.current[i];
      const r = RADIUS + expand * RADIUS * EXPAND_RATIO;
      const value = profileRef.current[key];
      const fillRadius = (value / 100) * r;

      const color = FLAVOR_COLORS[key];
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradient.addColorStop(0, color + '33');
      gradient.addColorStop(fillRadius / r * 0.9, color + 'AA');
      gradient.addColorStop(1, color);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.strokeStyle = '#3E272320';
      ctx.lineWidth = 1;
      ctx.stroke();

      const midAngle = (startAngle + endAngle) / 2;
      const labelR = r * 0.65;
      const lx = cx + Math.cos(midAngle) * labelR;
      const ly = cy + Math.sin(midAngle) * labelR;

      ctx.fillStyle = '#3E2723';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(FLAVOR_LABELS[key], lx, ly - 6);

      ctx.font = '8px sans-serif';
      ctx.fillText(`${Math.round(value)}%`, lx, ly + 6);
    }
  }, []);

  const animate = useCallback(() => {
    let needsUpdate = false;
    for (let i = 0; i < NUM_SECTORS; i++) {
      const diff = targetExpandRef.current[i] - expandRef.current[i];
      if (Math.abs(diff) > 0.01) {
        expandRef.current[i] += diff * 0.2;
        needsUpdate = true;
      } else {
        expandRef.current[i] = targetExpandRef.current[i];
      }
    }
    drawWheel();
    if (needsUpdate) {
      animRef.current = requestAnimationFrame(animate);
    }
  }, [drawWheel]);

  useEffect(() => {
    drawWheel();
    return () => cancelAnimationFrame(animRef.current);
  }, [drawWheel, flavorProfile]);

  useEffect(() => {
    targetExpandRef.current = FLAVOR_KEYS.map((_, i) =>
      i === hoverIndex ? 1 : 0
    );
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);
  }, [hoverIndex, animate]);

  const getSectorIndex = useCallback(
    (x: number, y: number): number => {
      const cx = RADIUS;
      const cy = RADIUS;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > RADIUS * 1.15 || dist < 5) return -1;

      let angle = Math.atan2(dy, dx);
      if (angle < -Math.PI / 2) angle += 2 * Math.PI;

      for (let i = 0; i < sectorAngles.current.length; i++) {
        const s = sectorAngles.current[i];
        let start = s.start;
        let end = s.end;
        if (angle >= start && angle <= end) return i;
      }
      return -1;
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const idx = getSectorIndex(x, y);
      setHoverIndex(idx);
      canvas.style.cursor = idx >= 0 ? 'pointer' : 'default';
    },
    [getSectorIndex]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(-1);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const idx = getSectorIndex(x, y);
      if (idx >= 0) {
        setEditingIndex(idx);
      }
    },
    [getSectorIndex]
  );

  const handleSliderChange = useCallback(
    (value: number) => {
      if (editingIndex < 0) return;
      const key = FLAVOR_KEYS[editingIndex];
      onChange({ ...flavorProfile, [key]: value });
    },
    [editingIndex, flavorProfile, onChange]
  );

  const closeSlider = useCallback(() => {
    setEditingIndex(-1);
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={DIAMETER}
        height={DIAMETER}
        style={{ width: DIAMETER, height: DIAMETER }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      {editingIndex >= 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#FFF',
            borderRadius: 8,
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(62,39,35,0.2)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            minWidth: 160,
          }}
        >
          <div style={{ fontWeight: 'bold', color: '#3E2723', fontSize: 13 }}>
            {FLAVOR_LABELS[FLAVOR_KEYS[editingIndex]]}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={flavorProfile[FLAVOR_KEYS[editingIndex]]}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            style={{ width: 130, accentColor: FLAVOR_COLORS[FLAVOR_KEYS[editingIndex]] }}
          />
          <div style={{ fontSize: 12, color: '#6F4E37' }}>
            {Math.round(flavorProfile[FLAVOR_KEYS[editingIndex]])}%
          </div>
          <button
            onClick={closeSlider}
            style={{
              border: 'none',
              background: '#6F4E37',
              color: '#FFF',
              borderRadius: 4,
              padding: '2px 12px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            确定
          </button>
        </div>
      )}
    </div>
  );
}
