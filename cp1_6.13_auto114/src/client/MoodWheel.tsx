import React, { useEffect, useRef, useState, useCallback } from 'react';

export type MoodType = 'happy' | 'calm' | 'sad' | 'angry' | 'anxious';

interface MoodInfo {
  key: MoodType;
  name: string;
  color: string;
  emoji: string;
}

const MOODS: MoodInfo[] = [
  { key: 'happy', name: '开心', color: '#f59e0b', emoji: '😊' },
  { key: 'calm', name: '平静', color: '#6366f1', emoji: '😌' },
  { key: 'sad', name: '悲伤', color: '#8b5cf6', emoji: '😢' },
  { key: 'angry', name: '愤怒', color: '#ef4444', emoji: '😠' },
  { key: 'anxious', name: '焦虑', color: '#f97316', emoji: '😰' },
];

const WHEEL_SIZE = 360;
const RING_WIDTH = 20;
const CENTER_RADIUS = 80;
const OUTER_RADIUS = WHEEL_SIZE / 2;
const INNER_RADIUS = OUTER_RADIUS - RING_WIDTH;

interface FlyingBall {
  id: number;
  mood: MoodInfo;
  progress: number;
}

interface MoodWheelProps {
  onMoodSelect: (mood: MoodType) => void;
  selectedMood?: MoodType;
  onlineCount: number;
  atmosphereText: string;
}

export const MoodWheel: React.FC<MoodWheelProps> = ({
  onMoodSelect,
  selectedMood,
  onlineCount,
  atmosphereText,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredMood, setHoveredMood] = useState<MoodType | null>(null);
  const [flyingBalls, setFlyingBalls] = useState<FlyingBall[]>([]);
  const ballIdRef = useRef(0);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<Record<number, number>>({});

  const getMoodAtPosition = useCallback((x: number, y: number): MoodInfo | null => {
    const cx = WHEEL_SIZE / 2;
    const cy = WHEEL_SIZE / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < INNER_RADIUS - RING_WIDTH || dist > OUTER_RADIUS) {
      return null;
    }

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = (angle + 360 + 90) % 360;
    const segmentAngle = 360 / MOODS.length;
    const index = Math.floor(angle / segmentAngle) % MOODS.length;
    return MOODS[index];
  }, []);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WHEEL_SIZE * dpr;
    canvas.height = WHEEL_SIZE * dpr;
    ctx.scale(dpr, dpr);

    const cx = WHEEL_SIZE / 2;
    const cy = WHEEL_SIZE / 2;
    const segmentAngle = (2 * Math.PI) / MOODS.length;
    const startAngle = -Math.PI / 2 - segmentAngle / 2;

    for (let i = 0; i < MOODS.length; i++) {
      const mood = MOODS[i];
      const a1 = startAngle + i * segmentAngle + 0.02;
      const a2 = startAngle + (i + 1) * segmentAngle - 0.02;
      const isHovered = hoveredMood === mood.key;
      const isSelected = selectedMood === mood.key;
      const ringOuter = OUTER_RADIUS;
      const ringInner = INNER_RADIUS + (isHovered || isSelected ? -3 : 0);

      ctx.beginPath();
      ctx.arc(cx, cy, ringOuter, a1, a2);
      ctx.arc(cx, cy, ringInner, a2, a1, true);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(cx, cy, ringInner, cx, cy, ringOuter);
      gradient.addColorStop(0, mood.color + (isHovered || isSelected ? 'ff' : 'cc'));
      gradient.addColorStop(1, mood.color + (isHovered || isSelected ? 'ff' : 'aa'));
      ctx.fillStyle = gradient;
      ctx.fill();

      if (isSelected) {
        ctx.shadowColor = mood.color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      const labelAngle = startAngle + (i + 0.5) * segmentAngle;
      const labelRadius = (ringOuter + ringInner) / 2;
      const lx = cx + Math.cos(labelAngle) * labelRadius;
      const ly = cy + Math.sin(labelAngle) * labelRadius;

      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(mood.emoji, lx, ly - 8);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#ffffffee';
      ctx.fillText(mood.name, lx, ly + 12);
    }
  }, [hoveredMood, selectedMood]);

  const animateBalls = useCallback(() => {
    setFlyingBalls((prev) => {
      const now = performance.now();
      return prev
        .map((ball) => {
          const start = startTimeRef.current[ball.id] || now;
          const elapsed = now - start;
          const duration = 300;
          const t = Math.min(elapsed / duration, 1);
          const elasticT = t < 0.5
            ? 2 * t * t
            : -1 + (4 - 2 * t) * t;
          return { ...ball, progress: elasticT };
        })
        .filter((ball) => ball.progress < 1 || performance.now() - (startTimeRef.current[ball.id] || 0) < 350);
    });
    animationRef.current = requestAnimationFrame(animateBalls);
  }, []);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animateBalls);
    return () => cancelAnimationFrame(animationRef.current);
  }, [animateBalls]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WHEEL_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * WHEEL_SIZE;
    const mood = getMoodAtPosition(x, y);
    if (mood) {
      const id = ballIdRef.current++;
      startTimeRef.current[id] = performance.now();
      setFlyingBalls((prev) => [...prev, { id, mood, progress: 0 }]);
      onMoodSelect(mood.key);
      setTimeout(() => {
        delete startTimeRef.current[id];
      }, 400);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WHEEL_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * WHEEL_SIZE;
    const mood = getMoodAtPosition(x, y);
    setHoveredMood(mood ? mood.key : null);
    canvas.style.cursor = mood ? 'pointer' : 'default';
  };

  const getBallPosition = (ball: FlyingBall) => {
    const cx = WHEEL_SIZE / 2;
    const cy = WHEEL_SIZE / 2;
    const idx = MOODS.findIndex((m) => m.key === ball.mood.key);
    const segmentAngle = (2 * Math.PI) / MOODS.length;
    const startAngle = -Math.PI / 2 - segmentAngle / 2;
    const midAngle = startAngle + (idx + 0.5) * segmentAngle;
    const startRadius = (OUTER_RADIUS + INNER_RADIUS) / 2;
    const startX = cx + Math.cos(midAngle) * startRadius;
    const startY = cy + Math.sin(midAngle) * startRadius;

    const t = ball.progress;
    const x = startX + (cx - startX) * t;
    const y = startY + (cy - startY) * t;
    const scale = 1 + Math.sin(t * Math.PI) * 0.5;
    const opacity = t < 0.8 ? 1 : 1 - (t - 0.8) * 5;

    return { x, y, scale, opacity };
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: WHEEL_SIZE,
        height: WHEEL_SIZE,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        boxShadow: '0 0 60px rgba(99, 102, 241, 0.2), inset 0 0 40px rgba(0,0,0,0.3)',
      }}
    >
      <canvas
        ref={canvasRef}
        width={WHEEL_SIZE}
        height={WHEEL_SIZE}
        style={{ width: WHEEL_SIZE, height: WHEEL_SIZE, position: 'absolute', top: 0, left: 0 }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredMood(null)}
      />
      <div
        style={{
          position: 'absolute',
          left: WHEEL_SIZE / 2 - CENTER_RADIUS,
          top: WHEEL_SIZE / 2 - CENTER_RADIUS,
          width: CENTER_RADIUS * 2,
          height: CENTER_RADIUS * 2,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #1e293b 0%, #0f172a 70%)',
          border: '2px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 20px rgba(99, 102, 241, 0.1)',
        }}
      >
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>当前房间</div>
        <div style={{ fontSize: 28, fontWeight: 'bold', color: '#e2e8f0' }}>
          {onlineCount}
          <span style={{ fontSize: 14, color: '#64748b', marginLeft: 4 }}>人在线</span>
        </div>
        <div style={{ fontSize: 12, color: '#a5b4fc', marginTop: 6, textAlign: 'center', padding: '0 10px' }}>
          {atmosphereText}
        </div>
      </div>
      {flyingBalls.map((ball) => {
        const pos = getBallPosition(ball);
        return (
          <div
            key={ball.id}
            style={{
              position: 'absolute',
              left: pos.x - 10,
              top: pos.y - 10,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: ball.mood.color,
              transform: `scale(${pos.scale})`,
              opacity: pos.opacity,
              boxShadow: `0 0 20px ${ball.mood.color}`,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </div>
  );
};
