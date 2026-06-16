import React, { useRef, useEffect, useCallback, useState } from 'react';
import { AudioClip, THEME } from '../types';
import { extractPeaks } from '../engine/AudioEngine';

interface Props {
  clips: AudioClip[];
  currentTime: number;
  totalDuration: number;
  onUpdateClip: (id: string, updates: Partial<AudioClip>) => void;
  onRemoveClip: (id: string) => void;
}

const PX_PER_SECOND = 100;
const TRACK_HEIGHT = 80;
const RULER_HEIGHT = 28;
const HANDLE_WIDTH = 6;
const SNAP_THRESHOLD = 15;
const SNAP_GRID = 0.1;

type DragMode = 'move' | 'trimStart' | 'trimEnd' | null;

interface DragState {
  mode: DragMode;
  clipId: string;
  startX: number;
  origStartTime: number;
  origTrimStart: number;
  origTrimEnd: number;
}

interface SnapGuide {
  x: number;
  type: 'grid' | 'start' | 'end';
  clipId?: string;
}

const ParentTimeLine: React.FC<Props> = ({ clips, currentTime, totalDuration, onUpdateClip, onRemoveClip }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragTimeLabel, setDragTimeLabel] = useState<string | null>(null);
  const [dragLabelPos, setDragLabelPos] = useState<{ x: number; y: number } | null>(null);
  const [collidingIds, setCollidingIds] = useState<Set<string>>(new Set());
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);
  const animFrameRef = useRef<number>(0);
  const dragStateRef = useRef<DragState | null>(null);

  const timelineWidth = Math.max((totalDuration + 10) * PX_PER_SECOND, 2000);
  const totalHeight = RULER_HEIGHT + Math.max(clips.length, 3) * (TRACK_HEIGHT + 4) + 20;

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const checkCollisions = useCallback((updatedClips: AudioClip[]): Set<string> => {
    const colliding = new Set<string>();
    for (let i = 0; i < updatedClips.length; i++) {
      for (let j = i + 1; j < updatedClips.length; j++) {
        const a = updatedClips[i];
        const b = updatedClips[j];
        const aEnd = a.startTime + (a.trimEnd - a.trimStart);
        const bEnd = b.startTime + (b.trimEnd - b.trimStart);
        if (a.startTime < bEnd && aEnd > b.startTime) {
          colliding.add(a.id);
          colliding.add(b.id);
        }
      }
    }
    return colliding;
  }, []);

  const findSnapPoints = useCallback((
    currentX: number,
    draggingClipId: string,
    mode: DragMode
  ): SnapGuide[] => {
    const guides: SnapGuide[] = [];
    const thresholdPx = SNAP_THRESHOLD;

    const gridSec = Math.round(currentX / PX_PER_SECOND / SNAP_GRID) * SNAP_GRID;
    const gridX = gridSec * PX_PER_SECOND;
    if (Math.abs(currentX - gridX) <= thresholdPx) {
      guides.push({ x: gridX, type: 'grid' });
    }

    clips.forEach((clip) => {
      if (clip.id === draggingClipId) return;
      const startX = clip.startTime * PX_PER_SECOND;
      const endX = (clip.startTime + (clip.trimEnd - clip.trimStart)) * PX_PER_SECOND;

      if (Math.abs(currentX - startX) <= thresholdPx) {
        guides.push({ x: startX, type: 'start', clipId: clip.id });
      }
      if (Math.abs(currentX - endX) <= thresholdPx) {
        guides.push({ x: endX, type: 'end', clipId: clip.id });
      }
    });

    return guides.sort((a, b) => {
      const da = Math.abs(a.x - currentX);
      const db = Math.abs(b.x - currentX);
      return da - db;
    });
  }, [clips]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = timelineWidth * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${timelineWidth}px`;
    canvas.style.height = `${totalHeight}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, timelineWidth, totalHeight);

    ctx.fillStyle = THEME.panel;
    ctx.fillRect(0, 0, timelineWidth, RULER_HEIGHT);

    for (let sec = 0; sec <= totalDuration + 10; sec++) {
      const x = sec * PX_PER_SECOND;
      ctx.strokeStyle = '#4A4A5A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, RULER_HEIGHT);
      ctx.stroke();

      ctx.fillStyle = THEME.text;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${sec}s`, x, RULER_HEIGHT - 4);

      for (let sub = 1; sub < 10; sub++) {
        const subX = x + (sub * PX_PER_SECOND) / 10;
        ctx.strokeStyle = '#3A3A4A';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(subX, RULER_HEIGHT - 6);
        ctx.lineTo(subX, RULER_HEIGHT);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = '#25253A';
    ctx.lineWidth = 0.5;
    for (let sec = 0; sec <= totalDuration + 10; sec++) {
      const x = sec * PX_PER_SECOND;
      ctx.beginPath();
      ctx.moveTo(x, RULER_HEIGHT);
      ctx.lineTo(x, totalHeight);
      ctx.stroke();
    }

    for (let sub = 0; sub <= (totalDuration + 10) * 10; sub++) {
      const x = sub * PX_PER_SECOND * 0.1;
      ctx.strokeStyle = '#1A1A2E';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, RULER_HEIGHT);
      ctx.lineTo(x, totalHeight);
      ctx.stroke();
    }

    clips.forEach((clip, idx) => {
      const trackY = RULER_HEIGHT + idx * (TRACK_HEIGHT + 4);
      const clipX = clip.startTime * PX_PER_SECOND;
      const clipDuration = clip.trimEnd - clip.trimStart;
      const clipWidth = clipDuration * PX_PER_SECOND;
      const isColliding = collidingIds.has(clip.id);
      const isHovered = hoveredClipId === clip.id;
      const isDragging = dragState?.clipId === clip.id;

      ctx.fillStyle = isDragging
        ? clip.color + '55'
        : isHovered
        ? clip.color + '40'
        : clip.color + '33';
      ctx.strokeStyle = isColliding ? THEME.danger : clip.color;
      ctx.lineWidth = isColliding ? 2 : isHovered ? 1.5 : 1;

      roundRect(ctx, clipX, trackY + 2, clipWidth, TRACK_HEIGHT - 4, 4);
      ctx.fill();
      ctx.stroke();

      const trimStartSample = Math.floor(clip.trimStart * clip.sampleRate);
      const trimEndSample = Math.floor(clip.trimEnd * clip.sampleRate);
      const trimmedLength = trimEndSample - trimStartSample;
      if (trimmedLength > 0 && clip.pcmData.length > 0) {
        const samplesPerPixel = Math.max(1, Math.floor(trimmedLength / clipWidth));
        const peaks = extractPeaks(
          clip.pcmData.slice(trimStartSample, trimEndSample),
          samplesPerPixel
        );

        ctx.strokeStyle = THEME.overlayWave + '80';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const centerY = trackY + TRACK_HEIGHT / 2;
        const amplitude = (TRACK_HEIGHT - 12) / 2;

        for (let px = 0; px < Math.min(peaks.length, clipWidth); px++) {
          const y = centerY - peaks[px] * amplitude;
          if (px === 0) ctx.moveTo(clipX + px, y);
          else ctx.lineTo(clipX + px, y);
        }
        ctx.stroke();

        ctx.beginPath();
        for (let px = 0; px < Math.min(peaks.length, clipWidth); px++) {
          const y = centerY + peaks[px] * amplitude;
          if (px === 0) ctx.moveTo(clipX + px, y);
          else ctx.lineTo(clipX + px, y);
        }
        ctx.stroke();
      }

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const nameMaxWidth = clipWidth - 16;
      if (nameMaxWidth > 20) {
        ctx.fillText(clip.name, clipX + 8, trackY + 6, nameMaxWidth);
      }

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px monospace';
      ctx.fillText(clipDuration.toFixed(1) + 's', clipX + 8, trackY + TRACK_HEIGHT - 14, nameMaxWidth);

      const handleGradient = ctx.createLinearGradient(0, trackY, 0, trackY + TRACK_HEIGHT);
      handleGradient.addColorStop(0, 'rgba(255,255,255,0.1)');
      handleGradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
      handleGradient.addColorStop(1, 'rgba(255,255,255,0.1)');
      ctx.fillStyle = handleGradient;
      ctx.fillRect(clipX, trackY + 2, HANDLE_WIDTH, TRACK_HEIGHT - 4);
      ctx.fillRect(clipX + clipWidth - HANDLE_WIDTH, trackY + 2, HANDLE_WIDTH, TRACK_HEIGHT - 4);
    });

    snapGuides.forEach((guide) => {
      ctx.strokeStyle = guide.type === 'grid' ? THEME.accent + '80' : '#4ECDC4';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(guide.x, RULER_HEIGHT);
      ctx.lineTo(guide.x, totalHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      if (guide.type !== 'grid') {
        ctx.fillStyle = guide.type === 'grid' ? THEME.accent : '#4ECDC4';
        ctx.fillRect(guide.x - 2, RULER_HEIGHT - 2, 4, 4);
      }
    });

    const playheadX = currentTime * PX_PER_SECOND;
    ctx.strokeStyle = THEME.accent;
    ctx.lineWidth = 2;
    ctx.shadowColor = THEME.accent;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, totalHeight);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = THEME.accent;
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX, 10);
    ctx.closePath();
    ctx.fill();

  }, [clips, currentTime, totalDuration, timelineWidth, totalHeight, collidingIds, snapGuides, hoveredClipId, dragState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => setScrollLeft(container.scrollLeft);
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const getHitInfo = useCallback((x: number, y: number): { clip: AudioClip; mode: DragMode; trackIndex: number } | null => {
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const trackY = RULER_HEIGHT + i * (TRACK_HEIGHT + 4);
      const clipX = clip.startTime * PX_PER_SECOND;
      const clipDuration = clip.trimEnd - clip.trimStart;
      const clipWidth = clipDuration * PX_PER_SECOND;

      if (y >= trackY && y <= trackY + TRACK_HEIGHT && x >= clipX && x <= clipX + clipWidth) {
        let mode: DragMode = 'move';
        if (x - clipX < HANDLE_WIDTH + 2) {
          mode = 'trimStart';
        } else if (clipX + clipWidth - x < HANDLE_WIDTH + 2) {
          mode = 'trimEnd';
        }
        return { clip, mode, trackIndex: i };
      }
    }
    return null;
  }, [clips]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!dragStateRef.current) {
      const hit = getHitInfo(x, y);
      if (hit) {
        setHoveredClipId(hit.clip.id);
        if (hit.mode === 'trimStart' || hit.mode === 'trimEnd') {
          canvas.style.cursor = 'ew-resize';
        } else {
          canvas.style.cursor = 'grab';
        }
      } else {
        setHoveredClipId(null);
        canvas.style.cursor = 'default';
      }
      return;
    }

    const ds = dragStateRef.current;
    const dx = e.clientX - ds.startX;
    const dt = dx / PX_PER_SECOND;

    const clip = clips.find((c) => c.id === ds.clipId);
    if (!clip) return;

    let newStartTime = ds.origStartTime;
    let newTrimStart = ds.origTrimStart;
    let newTrimEnd = ds.origTrimEnd;

    if (ds.mode === 'move') {
      newStartTime = Math.max(0, ds.origStartTime + dt);

      const edgeX = newStartTime * PX_PER_SECOND;
      const guides = findSnapPoints(edgeX, ds.clipId, ds.mode);
      if (guides.length > 0) {
        newStartTime = guides[0].x / PX_PER_SECOND;
        setSnapGuides([guides[0]]);
      } else {
        const endX = (newStartTime + (clip.trimEnd - clip.trimStart)) * PX_PER_SECOND;
        const endGuides = findSnapPoints(endX, ds.clipId, ds.mode);
        if (endGuides.length > 0) {
          newStartTime = endGuides[0].x / PX_PER_SECOND - (clip.trimEnd - clip.trimStart);
          setSnapGuides([endGuides[0]]);
        } else {
          setSnapGuides([]);
        }
      }

      newStartTime = Math.round(newStartTime * 100) / 100;
      onUpdateClip(ds.clipId, { startTime: newStartTime });

      const timeStr = `${newStartTime.toFixed(1)}s`;
      setDragTimeLabel(timeStr);
      setDragLabelPos({ x: e.clientX, y: e.clientY - 30 });

    } else if (ds.mode === 'trimStart') {
      newTrimStart = Math.max(0, ds.origTrimStart + dt);

      const trimX = (ds.origStartTime + (newTrimStart - ds.origTrimStart)) * PX_PER_SECOND;
      const guides = findSnapPoints(trimX, ds.clipId, ds.mode);
      if (guides.length > 0 && guides[0].type !== 'grid') {
        const snapTime = guides[0].x / PX_PER_SECOND;
        const deltaTrim = snapTime - ds.origStartTime;
        newTrimStart = ds.origTrimStart + deltaTrim;
        setSnapGuides([guides[0]]);
      } else {
        setSnapGuides([]);
      }

      if (newTrimStart < ds.origTrimEnd - 0.1) {
        const newStartTime = ds.origStartTime + (newTrimStart - ds.origTrimStart);
        onUpdateClip(ds.clipId, {
          trimStart: Math.round(newTrimStart * 10) / 10,
          startTime: Math.max(0, Math.round(newStartTime * 10) / 10),
        });
        setDragTimeLabel(`${newTrimStart.toFixed(1)}s`);
        setDragLabelPos({ x: e.clientX, y: e.clientY - 30 });
      }

    } else if (ds.mode === 'trimEnd') {
      newTrimEnd = Math.min(clip.duration, ds.origTrimEnd + dt);

      const trimX = (ds.origStartTime + (newTrimEnd - ds.origTrimStart)) * PX_PER_SECOND;
      const guides = findSnapPoints(trimX, ds.clipId, ds.mode);
      if (guides.length > 0 && guides[0].type !== 'grid') {
        const snapTime = guides[0].x / PX_PER_SECOND;
        newTrimEnd = ds.origTrimStart + (snapTime - ds.origStartTime);
        setSnapGuides([guides[0]]);
      } else {
        setSnapGuides([]);
      }

      if (newTrimEnd > ds.origTrimStart + 0.1) {
        onUpdateClip(ds.clipId, { trimEnd: Math.round(newTrimEnd * 10) / 10 });
        setDragTimeLabel(`${newTrimEnd.toFixed(1)}s`);
        setDragLabelPos({ x: e.clientX, y: e.clientY - 30 });
      }
    }

    const updatedClips = clips.map((c) => {
      if (c.id !== ds.clipId) return c;
      return { ...c, startTime: newStartTime, trimStart: newTrimStart, trimEnd: newTrimEnd };
    });
    setCollidingIds(checkCollisions(updatedClips));
  }, [clips, onUpdateClip, checkCollisions, findSnapPoints, getHitInfo]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = getHitInfo(x, y);
    if (hit) {
      const ds: DragState = {
        mode: hit.mode,
        clipId: hit.clip.id,
        startX: e.clientX,
        origStartTime: hit.clip.startTime,
        origTrimStart: hit.clip.trimStart,
        origTrimEnd: hit.clip.trimEnd,
      };
      setDragState(ds);
      dragStateRef.current = ds;
      canvas.style.cursor = hit.mode === 'move' ? 'grabbing' : 'ew-resize';
      e.preventDefault();
    }
  }, [getHitInfo]);

  const handleMouseUp = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas && hoveredClipId) {
      canvas.style.cursor = 'grab';
    }
    setDragState(null);
    dragStateRef.current = null;
    setDragTimeLabel(null);
    setDragLabelPos(null);
    setCollidingIds(new Set());
    setSnapGuides([]);
  }, [hoveredClipId]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp as any);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove as any);
        window.removeEventListener('mouseup', handleMouseUp as any);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  return (
    <div className="timeline-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="timeline-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredClipId(null)}
      />
      {dragTimeLabel && dragLabelPos && (
        <div
          className="drag-time-label"
          style={{ left: dragLabelPos.x, top: dragLabelPos.y }}
        >
          {dragTimeLabel}
        </div>
      )}
    </div>
  );
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export default ParentTimeLine;
