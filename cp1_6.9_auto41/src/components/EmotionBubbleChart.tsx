import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { EmotionRecord, EmotionType } from '../types';
import { EMOTION_CONFIG, INTENSITY_LABELS, EMOTION_TYPES } from '../types';

interface EmotionBubbleChartProps {
  records: EmotionRecord[];
  onUpdate: (
    id: string,
    data: { type?: EmotionType; intensity?: number }
  ) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

interface Bubble {
  id: string;
  record: EmotionRecord;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  targetRadius: number;
  color: string;
  opacity: number;
  targetOpacity: number;
  deleting: boolean;
  createdAt: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

interface HoverState {
  bubbleId: string | null;
  lineIndex: number | null;
  x: number;
  y: number;
}

const EMOTION_ORDER: Record<EmotionType, number> = {
  happy: 0,
  calm: 1,
  surprised: 2,
  anxious: 3,
  sad: 4,
  angry: 5,
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function mixColors(hex1: string, hex2: string, ratio: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

function intensityToRadius(intensity: number): number {
  return 20 + (intensity / 5) * 40;
}

function getDateDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs(
    Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function computeInitialPositions(
  records: EmotionRecord[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const padding = 80;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  const dates = Array.from(new Set(records.map((r) => r.date))).sort();
  const totalDates = Math.max(dates.length, 1);

  records.forEach((record, idx) => {
    const rand = seededRandom(
      record.timestamp + record.date.split('-').reduce((a, b) => a + parseInt(b), 0)
    );
    const dateIdx = dates.indexOf(record.date);
    const typeBias = EMOTION_ORDER[record.type] / (EMOTION_TYPES.length - 1);

    const xBase = padding + (dateIdx / (totalDates - 1 || 1)) * usableW;
    const yBase = padding + typeBias * usableH;

    const jitterX = (rand() - 0.5) * usableW * 0.25;
    const jitterY = (rand() - 0.5) * usableH * 0.25;

    let x = Math.max(padding, Math.min(width - padding, xBase + jitterX));
    let y = Math.max(padding, Math.min(height - padding, yBase + jitterY));

    const r = intensityToRadius(record.intensity);
    let attempts = 0;
    while (attempts < 50) {
      let overlaps = false;
      for (const [id, pos] of positions) {
        const otherRecord = records.find((rr) => rr.id === id);
        if (!otherRecord) continue;
        const otherR = intensityToRadius(otherRecord.intensity);
        const dx = x - pos.x;
        const dy = y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = r + otherR + 8;
        if (dist < minDist) {
          const ang = Math.atan2(dy, dx) + rand() * 0.5;
          const push = minDist - dist + 2;
          x += Math.cos(ang) * push;
          y += Math.sin(ang) * push;
          x = Math.max(padding, Math.min(width - padding, x));
          y = Math.max(padding, Math.min(height - padding, y));
          overlaps = true;
          break;
        }
      }
      if (!overlaps) break;
      attempts++;
    }

    positions.set(record.id, { x, y });
  });

  return positions;
}

function createParticles(width: number, height: number, count: number): Particle[] {
  const particles: Particle[] = [];
  const rand = seededRandom(width * height + count);
  for (let i = 0; i < count; i++) {
    particles.push({
      x: rand() * width,
      y: rand() * height,
      vx: (rand() - 0.5) * 0.3,
      vy: (rand() - 0.5) * 0.3,
      radius: 1 + rand() * 2,
      opacity: 0.08 + rand() * 0.07,
    });
  }
  return particles;
}

export default function EmotionBubbleChart({
  records,
  onUpdate,
  onDelete,
}: EmotionBubbleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<Map<string, Bubble>>(new Map());
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const hoverRef = useRef<HoverState>({ bubbleId: null, lineIndex: null, x: 0, y: 0 });
  const sizeRef = useRef<{ width: number; height: number }>({ width: 800, height: 500 });
  const prevRecordsIdsRef = useRef<Set<string>>(new Set());

  const [selectedBubble, setSelectedBubble] = useState<EmotionRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<EmotionRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EmotionRecord | null>(null);
  const [editType, setEditType] = useState<EmotionType>('happy');
  const [editIntensity, setEditIntensity] = useState<number>(3);
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: React.ReactNode;
  }>({ visible: false, x: 0, y: 0, content: null });

  const recordsById = useMemo(() => {
    const map = new Map<string, EmotionRecord>();
    records.forEach((r) => map.set(r.id, r));
    return map;
  }, [records]);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => a.timestamp - b.timestamp),
    [records]
  );

  const initBubbles = useCallback(
    (width: number, height: number) => {
      const positions = computeInitialPositions(records, width, height);
      const newBubbles = new Map<string, Bubble>();
      const now = Date.now();

      records.forEach((record) => {
        const pos = positions.get(record.id) || { x: width / 2, y: height / 2 };
        const existing = bubblesRef.current.get(record.id);
        const targetRadius = intensityToRadius(record.intensity);

        if (existing && !existing.deleting) {
          newBubbles.set(record.id, {
            ...existing,
            record,
            targetX: pos.x,
            targetY: pos.y,
            targetRadius,
            color: EMOTION_CONFIG[record.type].color,
            targetOpacity: 1,
          });
        } else {
          newBubbles.set(record.id, {
            id: record.id,
            record,
            x: pos.x,
            y: pos.y,
            targetX: pos.x,
            targetY: pos.y,
            radius: 0,
            targetRadius,
            color: EMOTION_CONFIG[record.type].color,
            opacity: 0,
            targetOpacity: 1,
            deleting: false,
            createdAt: now,
          });
        }
      });

      bubblesRef.current.forEach((bubble, id) => {
        if (!recordsById.has(id) && !bubble.deleting) {
          newBubbles.set(id, {
            ...bubble,
            deleting: true,
            targetOpacity: 0,
            targetRadius: 0,
          });
        }
      });

      bubblesRef.current = newBubbles;
      prevRecordsIdsRef.current = new Set(records.map((r) => r.id));
      startTimeRef.current = now;
    },
    [records, recordsById]
  );

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    const bubble = bubblesRef.current.get(confirmDelete.id);
    if (bubble) {
      bubble.deleting = true;
      bubble.targetOpacity = 0;
      bubble.targetRadius = 0;
    }
    const id = confirmDelete.id;
    setConfirmDelete(null);
    setSelectedBubble(null);
    await onDelete(id);
  }, [confirmDelete, onDelete]);

  const handleUpdate = useCallback(async () => {
    if (!editingRecord) return;
    const success = await onUpdate(editingRecord.id, {
      type: editType,
      intensity: editIntensity,
    });
    if (success) {
      setEditingRecord(null);
    }
  }, [editingRecord, editType, editIntensity, onUpdate]);

  const openEdit = useCallback((record: EmotionRecord) => {
    setEditingRecord(record);
    setEditType(record.type);
    setEditIntensity(record.intensity);
    setSelectedBubble(null);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, 400);
      const height =
        window.innerWidth < 768
          ? Math.max(window.innerHeight * 0.5, 350)
          : Math.max(rect.height, 500);
      sizeRef.current = { width, height };
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particlesRef.current = createParticles(width, height, 20);
      initBubbles(width, height);
    };

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(containerRef.current);

    const render = () => {
      const { width, height } = sizeRef.current;
      const now = Date.now();
      const animDuration = 1000;
      const timeSinceStart = now - startTimeRef.current;
      const enterProgress = Math.min(timeSinceStart / animDuration, 1);
      const enterEase = 1 - Math.pow(1 - enterProgress, 3);

      ctx.clearRect(0, 0, width, height);

      const bgGradient = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        0,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.7
      );
      bgGradient.addColorStop(0, 'rgba(108, 99, 255, 0.03)');
      bgGradient.addColorStop(1, 'rgba(74, 144, 217, 0.01)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.fill();
      });

      const bubblesArr = Array.from(bubblesRef.current.values()).filter(
        (b) => b.opacity > 0.01 || b.targetOpacity > 0
      );

      const bubbleMap = new Map(bubblesArr.map((b) => [b.id, b]));

      for (let i = 0; i < sortedRecords.length - 1; i++) {
        const r1 = sortedRecords[i];
        const r2 = sortedRecords[i + 1];
        const b1 = bubbleMap.get(r1.id);
        const b2 = bubbleMap.get(r2.id);
        if (!b1 || !b2) continue;

        const dayDiff = getDateDifference(r1.date, r2.date);
        const lineOpacity = Math.max(0.05, 0.3 - dayDiff * 0.05) * enterEase;
        const isHovered = hoverRef.current.lineIndex === i;
        const finalOpacity = isHovered ? 0.8 : lineOpacity;

        const mixedColor = mixColors(b1.color, b2.color, 0.5);

        ctx.beginPath();
        ctx.strokeStyle = hexToRgba(mixedColor, finalOpacity);
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.lineCap = 'round';

        const midX = (b1.x + b2.x) / 2;
        const midY = (b1.y + b2.y) / 2 - 30;
        ctx.moveTo(b1.x, b1.y);
        ctx.quadraticCurveTo(midX, midY, b2.x, b2.y);

        if (isHovered) {
          ctx.shadowColor = mixedColor;
          ctx.shadowBlur = 12;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (isHovered) {
          ctx.beginPath();
          ctx.fillStyle = hexToRgba(mixedColor, 0.95);
          const labelX = midX;
          const labelY = midY - 8;
          const text = `间隔 ${dayDiff} 天`;
          ctx.font = 'bold 11px -apple-system, sans-serif';
          const tw = ctx.measureText(text).width;
          const padX = 8;
          const padY = 4;
          ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
          roundRect(ctx, labelX - tw / 2 - padX, labelY - 10 - padY, tw + padX * 2, 20, 6);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, labelX, labelY);
        }
      }

      const breathPhase = (now % 2000) / 2000;
      const breathPulse = 5 + Math.sin(breathPhase * Math.PI * 2) * 5;

      const hoveredId = hoverRef.current.bubbleId;

      bubblesArr.forEach((b) => {
        const easeK = 0.08;
        b.radius += (b.targetRadius - b.radius) * easeK;
        b.opacity += (b.targetOpacity - b.opacity) * easeK;
        b.x += (b.targetX - b.x) * easeK * 0.5;
        b.y += (b.targetY - b.y) * easeK * 0.5;

        if (b.opacity < 0.02 && b.targetOpacity === 0) {
          bubblesRef.current.delete(b.id);
          return;
        }

        const isHovered = hoveredId === b.id;
        const displayRadius = b.radius * (isHovered ? 1.2 : 1) * enterEase;

        if (displayRadius < 1) return;

        const glowRadius = breathPulse + (isHovered ? 10 : 0);
        ctx.save();
        ctx.shadowColor = b.color;
        ctx.shadowBlur = glowRadius * (0.5 + b.record.intensity * 0.1);

        const gradient = ctx.createRadialGradient(
          b.x,
          b.y,
          displayRadius * 0.1,
          b.x,
          b.y,
          displayRadius
        );
        gradient.addColorStop(0, hexToRgba(b.color, 0.9 * b.opacity));
        gradient.addColorStop(1, hexToRgba(b.color, 0.3 * b.opacity));

        ctx.beginPath();
        ctx.arc(b.x, b.y, displayRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(b.x, b.y, displayRadius, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(b.color, 0.4 * b.opacity);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(
          b.x - displayRadius * 0.25,
          b.y - displayRadius * 0.25,
          displayRadius * 0.25,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${0.2 * b.opacity})`;
        ctx.fill();

        ctx.restore();
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      ro.disconnect();
    };
  }, [sortedRecords, initBubbles]);

  useEffect(() => {
    initBubbles(sizeRef.current.width, sizeRef.current.height);
  }, [records, initBubbles]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    hoverRef.current.x = x;
    hoverRef.current.y = y;

    let foundBubble: Bubble | null = null;
    let minDist = Infinity;

    bubblesRef.current.forEach((b) => {
      if (b.opacity < 0.3 || b.deleting) return;
      const dx = x - b.x;
      const dy = y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = b.radius * 1.1;
      if (dist < hitRadius && dist < minDist) {
        minDist = dist;
        foundBubble = b;
      }
    });

    if (foundBubble) {
      hoverRef.current.bubbleId = foundBubble.id;
      hoverRef.current.lineIndex = null;
      setTooltipState({
        visible: true,
        x: x + 12,
        y: y + 12,
        content: (
          <div style={{ lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, color: foundBubble.color, marginBottom: 4 }}>
              {EMOTION_CONFIG[foundBubble.record.type].label}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              强度: {foundBubble.record.intensity} - {INTENSITY_LABELS[foundBubble.record.intensity]}
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
              {foundBubble.record.date}
            </div>
          </div>
        ),
      });
      return;
    }

    let foundLine: number | null = null;
    const bubbleMap = new Map(
      Array.from(bubblesRef.current.values()).map((b) => [b.id, b])
    );
    for (let i = 0; i < sortedRecords.length - 1; i++) {
      const r1 = sortedRecords[i];
      const r2 = sortedRecords[i + 1];
      const b1 = bubbleMap.get(r1.id);
      const b2 = bubbleMap.get(r2.id);
      if (!b1 || !b2) continue;
      const dist = distToBezier(x, y, b1.x, b1.y, (b1.x + b2.x) / 2, (b1.y + b2.y) / 2 - 30, b2.x, b2.y);
      if (dist < 6) {
        foundLine = i;
        break;
      }
    }

    hoverRef.current.lineIndex = foundLine;
    hoverRef.current.bubbleId = null;

    if (foundLine === null) {
      setTooltipState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    }
  }, [sortedRecords]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let foundBubble: Bubble | null = null;
    let minDist = Infinity;

    bubblesRef.current.forEach((b) => {
      if (b.opacity < 0.3 || b.deleting) return;
      const dx = x - b.x;
      const dy = y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = b.radius * 1.1;
      if (dist < hitRadius && dist < minDist) {
        minDist = dist;
        foundBubble = b;
      }
    });

    if (foundBubble) {
      setSelectedBubble(foundBubble.record);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverRef.current.bubbleId = null;
    hoverRef.current.lineIndex = null;
    setTooltipState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  if (records.length === 0) {
    return (
      <div className="chart-canvas-container" ref={containerRef}>
        <div className="empty-state" style={{ minHeight: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="empty-state-icon">🫧</div>
          <div className="empty-state-text">
            还没有情绪数据
            <br />
            去记录第一条情绪吧～
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-canvas-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="bubble-canvas"
        style={{ cursor: hoverRef.current.bubbleId ? 'pointer' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />

      {tooltipState.visible && (
        <div
          style={{
            position: 'absolute',
            left: tooltipState.x,
            top: tooltipState.y,
            background: 'rgba(26, 26, 46, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13,
            color: '#ffffff',
            pointerEvents: 'none',
            zIndex: 20,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.15s ease-out',
            maxWidth: 220,
          }}
        >
          {tooltipState.content}
        </div>
      )}

      {selectedBubble && !editingRecord && !confirmDelete && (
        <div className="modal-overlay" onClick={() => setSelectedBubble(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div
                className="modal-emotion-color"
                style={{
                  background: EMOTION_CONFIG[selectedBubble.type].color,
                  color: EMOTION_CONFIG[selectedBubble.type].color,
                }}
              />
              <div>
                <div className="modal-title">
                  {EMOTION_CONFIG[selectedBubble.type].label}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(224,224,224,0.5)' }}>
                  情绪记录详情
                </div>
              </div>
            </div>
            <div className="modal-body">
              <div className="modal-info-row">
                <span className="modal-info-label">日期</span>
                <span className="modal-info-value">{selectedBubble.date}</span>
              </div>
              <div className="modal-info-row">
                <span className="modal-info-label">情绪类型</span>
                <span
                  className="modal-info-value"
                  style={{ color: EMOTION_CONFIG[selectedBubble.type].color }}
                >
                  {EMOTION_CONFIG[selectedBubble.type].label}
                </span>
              </div>
              <div className="modal-info-row">
                <span className="modal-info-label">情绪强度</span>
                <span className="modal-info-value">
                  {selectedBubble.intensity} - {INTENSITY_LABELS[selectedBubble.intensity]}
                </span>
              </div>
              <div className="modal-note">{selectedBubble.note}</div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedBubble(null)}>
                关闭
              </button>
              <button className="btn btn-primary" onClick={() => openEdit(selectedBubble)}>
                编辑
              </button>
              <button className="btn btn-danger" onClick={() => setConfirmDelete(selectedBubble)}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {editingRecord && (
        <div className="modal-overlay" onClick={() => setEditingRecord(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div
                className="modal-emotion-color"
                style={{
                  background: EMOTION_CONFIG[editingRecord.type].color,
                  color: EMOTION_CONFIG[editingRecord.type].color,
                }}
              />
              <div>
                <div className="modal-title">编辑情绪</div>
                <div style={{ fontSize: 12, color: 'rgba(224,224,224,0.5)' }}>
                  修改类型和强度
                </div>
              </div>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">情绪类型</label>
                <select
                  className="form-select"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as EmotionType)}
                >
                  {EMOTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {EMOTION_CONFIG[t].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">情绪强度</label>
                <div className="slider-container">
                  <input
                    type="range"
                    className="intensity-slider"
                    min="0"
                    max="5"
                    step="1"
                    value={editIntensity}
                    onChange={(e) => setEditIntensity(parseInt(e.target.value))}
                  />
                  <div className="intensity-labels">
                    {INTENSITY_LABELS.map((label, i) => (
                      <span key={i}>{i}</span>
                    ))}
                  </div>
                  <div className="intensity-value">
                    {editIntensity} - {INTENSITY_LABELS[editIntensity]}
                  </div>
                </div>
              </div>
              <div className="modal-info-row">
                <span className="modal-info-label">文字说明</span>
              </div>
              <div className="modal-note" style={{ marginTop: 8, opacity: 0.7 }}>
                {editingRecord.note}
                <div style={{ fontSize: 11, marginTop: 6, opacity: 0.5 }}>
                  (文字不可修改)
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={() => setEditingRecord(null)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleUpdate}>
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 400 }}
          >
            <div
              style={{
                textAlign: 'center',
                marginBottom: 20,
                fontSize: 48,
              }}
            >
              ⚠️
            </div>
            <div className="modal-title" style={{ textAlign: 'center', marginBottom: 12 }}>
              确认删除？
            </div>
            <div
              style={{
                textAlign: 'center',
                color: 'rgba(224,224,224,0.7)',
                fontSize: 14,
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              删除后将无法恢复，确定要删除这条
              <span style={{ color: EMOTION_CONFIG[confirmDelete.type].color, fontWeight: 600 }}>
                {' '}{EMOTION_CONFIG[confirmDelete.type].label}{' '}
              </span>
              记录吗？
            </div>
            <div className="modal-actions">
              <button className="btn btn-cancel" onClick={() => setConfirmDelete(null)}>
                取消
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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
}

function distToBezier(
  px: number,
  py: number,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number
): number {
  let minDist = Infinity;
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
    const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
    const dx = px - x;
    const dy = py - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist) minDist = d;
  }
  return minDist;
}
