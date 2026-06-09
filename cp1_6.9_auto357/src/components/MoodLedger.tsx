import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Entry, ChipState, EMOTION_CONFIG } from '../types';

interface MoodLedgerProps {
  entries: Entry[];
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MAX_CHIPS = 80;
const DIRECTION_CHANGE_INTERVAL = 5000;
const OPACITY_CHANGE_INTERVAL = 30000;
const MIN_OPACITY = 0.2;

const getRadiusFromAmount = (amount: number): number => {
  const normalized = Math.min(amount / 1000, 1);
  return 20 + normalized * 40;
};

const MoodLedger: React.FC<MoodLedgerProps> = ({ entries }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chipsRef = useRef<Map<string, ChipState>>(new Map());
  const animFrameRef = useRef<number>(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(Date.now());

  const createChip = useCallback((entry: Entry): ChipState => {
    const radius = getRadiusFromAmount(entry.amount);
    const now = Date.now();
    return {
      id: entry.id,
      x: radius + Math.random() * (CANVAS_WIDTH - 2 * radius),
      y: radius + Math.random() * (CANVAS_HEIGHT - 2 * radius),
      dx: (Math.random() - 0.5),
      dy: (Math.random() - 0.5),
      baseRadius: radius,
      opacity: 1,
      createdAt: now,
      lastDirectionChange: now,
      lastOpacityChange: now,
      pausedUntil: 0,
      entry,
    };
  }, []);

  useEffect(() => {
    const existingIds = new Set(chipsRef.current.keys());
    const newEntries = entries.filter((e) => !existingIds.has(e.id));

    newEntries.forEach((entry) => {
      const chip = createChip(entry);
      chipsRef.current.set(entry.id, chip);
    });

    if (chipsRef.current.size > MAX_CHIPS) {
      const sorted = Array.from(chipsRef.current.values()).sort(
        (a, b) => a.createdAt - b.createdAt
      );
      const toRemove = sorted.slice(0, chipsRef.current.size - MAX_CHIPS);
      toRemove.forEach((chip) => chipsRef.current.delete(chip.id));
    }
  }, [entries, createChip]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const now = Date.now();
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawBackground(ctx);

      const chips = Array.from(chipsRef.current.values());

      chips.forEach((chip) => {
        if (chip.id !== draggingId && now > chip.pausedUntil) {
          if (now - chip.lastDirectionChange > DIRECTION_CHANGE_INTERVAL) {
            chip.dx = (Math.random() - 0.5);
            chip.dy = (Math.random() - 0.5);
            chip.lastDirectionChange = now;
          }

          const brownianX = (Math.random() - 0.5) * 0.3;
          const brownianY = (Math.random() - 0.5) * 0.3;

          chip.x += (chip.dx + brownianX) * (dt / 16);
          chip.y += (chip.dy + brownianY) * (dt / 16);

          const r = chip.baseRadius;
          if (chip.x < r) { chip.x = r; chip.dx = Math.abs(chip.dx); }
          if (chip.x > CANVAS_WIDTH - r) { chip.x = CANVAS_WIDTH - r; chip.dx = -Math.abs(chip.dx); }
          if (chip.y < r) { chip.y = r; chip.dy = Math.abs(chip.dy); }
          if (chip.y > CANVAS_HEIGHT - r) { chip.y = CANVAS_HEIGHT - r; chip.dy = -Math.abs(chip.dy); }
        }

        if (now - chip.lastOpacityChange > OPACITY_CHANGE_INTERVAL) {
          chip.opacity = Math.max(MIN_OPACITY, chip.opacity - 0.1);
          chip.lastOpacityChange = now;
        }
      });

      for (let i = 0; i < chips.length; i++) {
        for (let j = i + 1; j < chips.length; j++) {
          const a = chips[i];
          const b = chips[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = 40;

          if (dist < minDist && dist > 0) {
            const overlap = (minDist - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;

            if (a.id !== draggingId) {
              a.x -= nx * overlap;
              a.y -= ny * overlap;
            }
            if (b.id !== draggingId) {
              b.x += nx * overlap;
              b.y += ny * overlap;
            }
          }
        }
      }

      const toRemove: string[] = [];
      chips.forEach((chip) => {
        if (chip.opacity <= MIN_OPACITY) {
          toRemove.push(chip.id);
        } else {
          drawChip(ctx, chip, now, hoveredId === chip.id);
        }
      });

      toRemove.forEach((id) => chipsRef.current.delete(id));

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [hoveredId, draggingId]);

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 50,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 1.5
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  };

  const drawChip = (
    ctx: CanvasRenderingContext2D,
    chip: ChipState,
    now: number,
    isHovered: boolean
  ) => {
    const config = EMOTION_CONFIG[chip.entry.emotion];
    const breathScale = 1 + 0.025 * Math.sin(now / 1000 * Math.PI);
    const hoverScale = isHovered ? 1.3 : 1;
    const scale = breathScale * hoverScale;
    const radius = chip.baseRadius * scale;

    ctx.save();
    ctx.globalAlpha = chip.opacity;

    ctx.shadowColor = config.color;
    ctx.shadowBlur = isHovered ? 8 : 4;

    const gradient = ctx.createRadialGradient(
      chip.x - radius * 0.3, chip.y - radius * 0.3, 0,
      chip.x, chip.y, radius
    );
    gradient.addColorStop(0, lightenColor(config.color, 30));
    gradient.addColorStop(0.7, config.color);
    gradient.addColorStop(1, darkenColor(config.color, 20));

    ctx.beginPath();
    ctx.arc(chip.x, chip.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(chip.x, chip.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const fontSize = Math.max(10, radius * 0.35);
    ctx.font = `bold ${fontSize}px -apple-system, sans-serif`;
    const textPreview = chip.entry.text.slice(0, 5);
    ctx.fillText(textPreview, chip.x, chip.y - radius * 0.15);

    ctx.font = `${fontSize * 0.85}px -apple-system, sans-serif`;
    ctx.fillStyle = darkenColor('#1a1a2e', 10);
    ctx.fillText(`¥${chip.entry.amount}`, chip.x, chip.y + radius * 0.35);

    if (isHovered) {
      ctx.globalAlpha = 1;
      const tooltipX = chip.x;
      const tooltipY = chip.y - radius - 30;
      const fullText = chip.entry.text.length > 12
        ? chip.entry.text.slice(0, 12) + '...'
        : chip.entry.text;
      const tooltipText = `${fullText}（¥${chip.entry.amount}元）`;

      ctx.font = '13px -apple-system, sans-serif';
      const textWidth = ctx.measureText(tooltipText).width;
      const boxWidth = textWidth + 24;
      const boxHeight = 32;
      const boxX = tooltipX - boxWidth / 2;
      const boxY = tooltipY - boxHeight / 2;

      ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 1;
      roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tooltipText, tooltipX, tooltipY);
    }

    ctx.restore();
  };

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const lightenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `rgb(${R}, ${G}, ${B})`;
  };

  const darkenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `rgb(${R}, ${G}, ${B})`;
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const findChipAt = (x: number, y: number): ChipState | null => {
    const chips = Array.from(chipsRef.current.values()).reverse();
    for (const chip of chips) {
      const dx = x - chip.x;
      const dy = y - chip.y;
      if (dx * dx + dy * dy <= chip.baseRadius * chip.baseRadius) {
        return chip;
      }
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (draggingId) {
      const chip = chipsRef.current.get(draggingId);
      if (chip) {
        chip.x = Math.max(chip.baseRadius, Math.min(CANVAS_WIDTH - chip.baseRadius, pos.x - dragOffsetRef.current.x));
        chip.y = Math.max(chip.baseRadius, Math.min(CANVAS_HEIGHT - chip.baseRadius, pos.y - dragOffsetRef.current.y));
      }
      return;
    }

    const chip = findChipAt(pos.x, pos.y);
    setHoveredId(chip ? chip.id : null);
    (e.currentTarget as HTMLCanvasElement).style.cursor = chip ? 'grab' : 'default';
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const chip = findChipAt(pos.x, pos.y);
    if (chip) {
      setDraggingId(chip.id);
      dragOffsetRef.current = {
        x: pos.x - chip.x,
        y: pos.y - chip.y,
      };
      (e.currentTarget as HTMLCanvasElement).style.cursor = 'grabbing';
    }
  };

  const handleMouseUp = () => {
    if (draggingId) {
      const chip = chipsRef.current.get(draggingId);
      if (chip) {
        chip.pausedUntil = Date.now() + 5000;
      }
      setDraggingId(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredId(null);
    if (draggingId) {
      const chip = chipsRef.current.get(draggingId);
      if (chip) {
        chip.pausedUntil = Date.now() + 5000;
      }
      setDraggingId(null);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            display: 'block',
            background: 'linear-gradient(145deg, rgba(26, 26, 46, 0.8) 0%, rgba(22, 33, 62, 0.9) 100%)',
            cursor: 'default',
            maxWidth: '100%',
            height: 'auto',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.entries(EMOTION_CONFIG).map(([key, config]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: config.color,
                boxShadow: `0 0 8px ${config.color}88`,
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
              {config.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoodLedger;
