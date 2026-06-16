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

type DragMode = 'move' | 'trimStart' | 'trimEnd' | null;

interface DragState {
  mode: DragMode;
  clipId: string;
  startX: number;
  origStartTime: number;
  origTrimStart: number;
  origTrimEnd: number;
}

const ParentTimeLine: React.FC<Props> = ({ clips, currentTime, totalDuration, onUpdateClip, onRemoveClip }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragTimeLabel, setDragTimeLabel] = useState<string | null>(null);
  const [dragLabelPos, setDragLabelPos] = useState<{ x: number; y: number } | null>(null);
  const [collidingIds, setCollidingIds] = useState<Set<string>>(new Set());
  const [scrollLeft, setScrollLeft] = useState(0);
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
        ctx.moveTo(subX, RULER_HEIGHT - 8);
        ctx.lineTo(subX, RULER_HEIGHT);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = '#2A2A3A';
    ctx.lineWidth = 0.5;
    for (let sec = 0; sec <= totalDuration + 10; sec++) {
      const x = sec * PX_PER_SECOND;
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

      ctx.fillStyle = clip.color + '33';
      ctx.strokeStyle = isColliding ? THEME.danger : clip.color;
      ctx.lineWidth = isColliding ? 2 : 1;

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

      ctx.fillStyle = THEME.text;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      const nameMaxWidth = clipWidth - 16;
      if (nameMaxWidth > 20) {
        ctx.fillText(clip.name, clipX + 8, trackY + 16, nameMaxWidth);
      }

      ctx.fillStyle = THEME.sliderTrack;
      ctx.fillRect(clipX, trackY + 2, HANDLE_WIDTH, TRACK_HEIGHT - 4);
      ctx.fillRect(clipX + clipWidth - HANDLE_WIDTH, trackY + 2, HANDLE_WIDTH, TRACK_HEIGHT - 4);
    });

    const playheadX = currentTime * PX_PER_SECOND;
    ctx.strokeStyle = THEME.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, totalHeight);
    ctx.stroke();

    ctx.fillStyle = THEME.accent;
    ctx.beginPath();
    ctx.moveTo(playheadX - 5, 0);
    ctx.lineTo(playheadX + 5, 0);
    ctx.lineTo(playheadX, 8);
    ctx.closePath();
    ctx.fill();

  }, [clips, currentTime, totalDuration, timelineWidth, totalHeight, collidingIds]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => setScrollLeft(container.scrollLeft);
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const trackY = RULER_HEIGHT + i * (TRACK_HEIGHT + 4);
      const clipX = clip.startTime * PX_PER_SECOND;
      const clipDuration = clip.trimEnd - clip.trimStart;
      const clipWidth = clipDuration * PX_PER_SECOND;

      if (y >= trackY && y <= trackY + TRACK_HEIGHT && x >= clipX && x <= clipX + clipWidth) {
        let mode: DragMode = 'move';
        if (x - clipX < HANDLE_WIDTH) {
          mode = 'trimStart';
        } else if (clipX + clipWidth - x < HANDLE_WIDTH) {
          mode = 'trimEnd';
        }

        const ds: DragState = {
          mode,
          clipId: clip.id,
          startX: e.clientX,
          origStartTime: clip.startTime,
          origTrimStart: clip.trimStart,
          origTrimEnd: clip.trimEnd,
        };
        setDragState(ds);
        dragStateRef.current = ds;
        e.preventDefault();
        return;
      }
    }
  }, [clips]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStateRef.current) return;
    const ds = dragStateRef.current;
    const dx = e.clientX - ds.startX;
    const dt = dx / PX_PER_SECOND;

    const clip = clips.find((c) => c.id === ds.clipId);
    if (!clip) return;

    if (ds.mode === 'move') {
      const newStartTime = Math.max(0, Math.round((ds.origStartTime + dt) * 10) / 10);
      onUpdateClip(ds.clipId, { startTime: newStartTime });
      const timeStr = `${newStartTime.toFixed(1)}s`;
      setDragTimeLabel(timeStr);
      setDragLabelPos({ x: e.clientX, y: e.clientY - 30 });
    } else if (ds.mode === 'trimStart') {
      const newTrimStart = Math.max(0, Math.round((ds.origTrimStart + dt) * 10) / 10);
      if (newTrimStart < ds.origTrimEnd - 0.1) {
        const newStartTime = ds.origStartTime + (newTrimStart - ds.origTrimStart);
        onUpdateClip(ds.clipId, { trimStart: newTrimStart, startTime: Math.max(0, newStartTime) });
        setDragTimeLabel(`${newTrimStart.toFixed(1)}s`);
        setDragLabelPos({ x: e.clientX, y: e.clientY - 30 });
      }
    } else if (ds.mode === 'trimEnd') {
      const newTrimEnd = Math.min(clip.duration, Math.round((ds.origTrimEnd + dt) * 10) / 10);
      if (newTrimEnd > ds.origTrimStart + 0.1) {
        onUpdateClip(ds.clipId, { trimEnd: newTrimEnd });
        setDragTimeLabel(`${newTrimEnd.toFixed(1)}s`);
        setDragLabelPos({ x: e.clientX, y: e.clientY - 30 });
      }
    }

    const updatedClips = clips.map((c) => {
      if (c.id !== ds.clipId) return c;
      if (ds.mode === 'move') return { ...c, startTime: Math.max(0, Math.round((ds.origStartTime + dt) * 10) / 10) };
      if (ds.mode === 'trimStart') {
        const nts = Math.max(0, Math.round((ds.origTrimStart + dt) * 10) / 10);
        return { ...c, trimStart: nts, startTime: Math.max(0, ds.origStartTime + (nts - ds.origTrimStart)) };
      }
      if (ds.mode === 'trimEnd') {
        const nte = Math.min(c.duration, Math.round((ds.origTrimEnd + dt) * 10) / 10);
        return { ...c, trimEnd: nte };
      }
      return c;
    });
    setCollidingIds(checkCollisions(updatedClips));
  }, [clips, onUpdateClip, checkCollisions]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
    dragStateRef.current = null;
    setDragTimeLabel(null);
    setDragLabelPos(null);
    setCollidingIds(new Set());
  }, []);

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
        style={{ cursor: dragState ? (dragState.mode === 'move' ? 'grabbing' : 'ew-resize') : 'default' }}
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
