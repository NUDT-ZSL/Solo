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
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  targetScale: number;
  opacity: number;
  phase: number;
}

interface MoodWheelProps {
  onMoodSelect: (mood: MoodType) => void;
  selectedMood?: MoodType;
  onlineCount: number;
  atmosphereText: string;
}

const SPRING_K = 0.12;
const DAMPING = 0.82;

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
  const flyingBallsRef = useRef<FlyingBall[]>([]);

  flyingBallsRef.current = flyingBalls;

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
    const cx = WHEEL_SIZE / 2;
    const cy = WHEEL_SIZE / 2;
    const updated = flyingBallsRef.current
      .map((ball) => {
        const dx = cx - ball.x;
        const dy = cy - ball.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let ax = dx * SPRING_K;
        let ay = dy * SPRING_K;

        if (ball.phase < 0.3) {
          ball.phase += 1 / 60;
          ball.vx += ax * 2;
          ball.vy += ay * 2;
        } else if (dist > 3) {
          ball.vx += ax;
          ball.vy += ay;
          ball.vx *= DAMPING;
          ball.vy *= DAMPING;
        } else {
          const overshoot = 1 - ball.phase;
          if (overshoot > 0) {
            ball.vx = -dx * 0.08 * overshoot;
            ball.vy = -dy * 0.08 * overshoot;
            ball.phase += 0.02;
          } else {
            ball.vx *= 0.7;
            ball.vy *= 0.7;
          }
        }

        ball.x += ball.vx;
        ball.y += ball.vy;

        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        ball.scale += (1 + Math.min(speed * 0.03, 0.6) - ball.scale) * 0.2;
        ball.opacity = Math.max(0, ball.opacity - 0.008);

        return ball;
      })
      .filter((ball) => ball.opacity > 0.01);

    if (updated.length !== flyingBallsRef.current.length ||
        updated.some((b, i) =>
          Math.abs(b.x - flyingBallsRef.current[i]?.x) > 0.1 ||
          Math.abs(b.y - flyingBallsRef.current[i]?.y) > 0.1 ||
          b.scale !== flyingBallsRef.current[i]?.scale ||
          b.opacity !== flyingBallsRef.current[i]?.opacity
        )) {
      setFlyingBalls(updated.map((b) => ({ ...b })));
    }

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
      const cx = WHEEL_SIZE / 2;
      const cy = WHEEL_SIZE / 2;
      const idx = MOODS.findIndex((m) => m.key === mood.key);
      const segmentAngle = (2 * Math.PI) / MOODS.length;
      const startAngle = -Math.PI / 2 - segmentAngle / 2;
      const midAngle = startAngle + (idx + 0.5) * segmentAngle;
      const startRadius = (OUTER_RADIUS + INNER_RADIUS) / 2;
      const startX = cx + Math.cos(midAngle) * startRadius;
      const startY = cy + Math.sin(midAngle) * startRadius;

      const id = ballIdRef.current++;
      const newBall: FlyingBall = {
        id,
        mood,
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        scale: 1,
        targetScale: 1,
        opacity: 1,
        phase: 0,
      };
      setFlyingBalls((prev) => [...prev, newBall]);
      onMoodSelect(mood.key);
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
      {flyingBalls.map((ball) => (
        <div
          key={ball.id}
          style={{
            position: 'absolute',
            left: ball.x - 10,
            top: ball.y - 10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${ball.mood.color}ff, ${ball.mood.color}88)`,
            transform: `scale(${ball.scale})`,
            opacity: ball.opacity,
            boxShadow: `0 0 ${15 * ball.scale}px ${ball.mood.color}`,
            pointerEvents: 'none',
            willChange: 'transform, opacity, left, top',
          }}
        />
      ))}
    </div>
  );
};
