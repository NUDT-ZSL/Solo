import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ScoreData, Note, Duration, generateId, pitchToY, yToPitch, getStaffIndex, STAFF_LINES, LINE_SPACING, STAVES, pitchToName } from '../types';

const NOTE_WIDTH = 12;
const NOTE_HEIGHT = 16;
const STAFF_TOP = 60;
const STAFF_WIDTH = 1200;
const STAFF_HEIGHT = STAFF_LINES * LINE_SPACING;
const STAFF_GAP = 60;
const TOTAL_STAFF_BLOCK = STAFF_HEIGHT + STAFF_GAP;
const CLEF_WIDTH = 60;
const CONTEXT_MENU_ITEMS: { label: string; action: string }[] = [
  { label: '升高半音 ♯', action: 'sharp' },
  { label: '降低半音 ♭', action: 'flat' },
  { label: '删除', action: 'delete' },
  { label: '全音符', action: 'duration-whole' },
  { label: '二分音符', action: 'duration-half' },
  { label: '四分音符', action: 'duration-quarter' },
  { label: '八分音符', action: 'duration-eighth' },
  { label: '十六分音符', action: 'duration-sixteenth' },
];

interface EditorProps {
  score: ScoreData;
  onNotesChange: (notes: Note[]) => void;
  onNoteSelect: (note: Note | null) => void;
  isPlaying: boolean;
  playbackPosition: number;
  previewMode: boolean;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  noteId: string;
}

interface DragState {
  active: boolean;
  noteId: string;
  startX: number;
  startY: number;
  origPosition: number;
  origPitch: number;
}

export default function Editor({ score, onNotesChange, onNoteSelect, isPlaying, playbackPosition, previewMode }: EditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, noteId: '' });
  const [dragState, setDragState] = useState<DragState>({ active: false, noteId: '', startX: 0, startY: 0, origPosition: 0, origPitch: 0 });
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const animFrameRef = useRef<number>(0);
  const noteAnimMap = useRef<Map<string, number>>(new Map());

  const getStaffY = useCallback((staffIndex: number) => {
    return STAFF_TOP + staffIndex * TOTAL_STAFF_BLOCK;
  }, []);

  const drawStaff = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, width, height);

    for (let s = 0; s < STAVES; s++) {
      const topY = getStaffY(s);

      for (let i = 0; i < STAFF_LINES; i++) {
        const y = topY + i * LINE_SPACING;
        ctx.strokeStyle = '#4a4a6a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(CLEF_WIDTH, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 48px serif';
      ctx.fillText('𝄞', 12, topY + 36);
    }
  }, [getStaffY]);

  const getNoteX = useCallback((position: number) => {
    return CLEF_WIDTH + 30 + position * 30;
  }, []);

  const drawNotes = useCallback((ctx: CanvasRenderingContext2D, notes: Note[], width: number) => {
    const visibleTrackIds = score.tracks.filter(t => t.visible).map(t => t.id);
    const filtered = notes.filter(n => visibleTrackIds.includes(n.trackId));

    for (const note of filtered) {
      const staffIdx = Math.min(Math.floor(note.position / 30), STAVES - 1);
      const x = getNoteX(note.position % 30);
      const y = pitchToY(note.pitch, staffIdx, getStaffY(0));

      const animProgress = noteAnimMap.current.get(note.id) ?? 1;
      const scale = 0.8 + 0.2 * animProgress;

      const isDragging = dragState.active && dragState.noteId === note.id;
      const drawX = isDragging ? x + dragOffset.dx : x;
      const drawY = isDragging ? y + dragOffset.dy : y;

      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.scale(scale, scale);

      ctx.fillStyle = isDragging ? '#00d4ff' : '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, NOTE_WIDTH / 2, NOTE_HEIGHT / 2, -0.2, 0, Math.PI * 2);
      ctx.fill();

      if (note.sharp) {
        ctx.fillStyle = '#e94560';
        ctx.font = 'bold 14px serif';
        ctx.fillText('♯', -16, 5);
      }
      if (note.flat) {
        ctx.fillStyle = '#e94560';
        ctx.font = 'bold 14px serif';
        ctx.fillText('♭', -16, 5);
      }

      const durFlags: Record<string, number> = { eighth: 1, sixteenth: 2 };
      const flags = durFlags[note.duration] || 0;

      if (note.duration !== 'whole') {
        ctx.strokeStyle = isDragging ? '#00d4ff' : '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(NOTE_WIDTH / 2 - 1, -NOTE_HEIGHT / 2);
        ctx.lineTo(NOTE_WIDTH / 2 - 1, -NOTE_HEIGHT / 2 - 28);
        ctx.stroke();

        for (let f = 0; f < flags; f++) {
          ctx.beginPath();
          ctx.moveTo(NOTE_WIDTH / 2 - 1, -NOTE_HEIGHT / 2 - 28 + f * 8);
          ctx.quadraticCurveTo(NOTE_WIDTH / 2 + 10, -NOTE_HEIGHT / 2 - 20 + f * 8, NOTE_WIDTH / 2 - 1, -NOTE_HEIGHT / 2 - 12 + f * 8);
          ctx.stroke();
        }
      }

      if (note.duration === 'whole' || note.duration === 'half') {
        ctx.strokeStyle = isDragging ? '#00d4ff' : '#0f3460';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, NOTE_WIDTH / 2 - 1, NOTE_HEIGHT / 2 - 2, -0.2, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [score.tracks, dragState, dragOffset, getNoteX, getStaffY]);

  const drawPlaybackCursor = useCallback((ctx: CanvasRenderingContext2D, position: number, width: number, height: number) => {
    if (!isPlaying) return;
    const x = getNoteX(position);
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [isPlaying, getNoteX]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;
    ctx.clearRect(0, 0, width, height);
    drawStaff(ctx, width, height);
    drawNotes(ctx, score.notes, width);
    drawPlaybackCursor(ctx, playbackPosition, width, height);

    if (previewMode) {
      ctx.fillStyle = 'rgba(15, 52, 96, 0.15)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText('📋 预览模式', width - 120, 20);
    }

    noteAnimMap.current.forEach((val, key) => {
      if (val < 1) {
        noteAnimMap.current.set(key, Math.min(1, val + 0.1));
      }
    });

    animFrameRef.current = requestAnimationFrame(render);
  }, [canvasSize, score.notes, drawStaff, drawNotes, drawPlaybackCursor, playbackPosition, previewMode]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width: Math.max(width, 800), height: Math.max(height, 600) });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const findNoteAt = useCallback((x: number, y: number): Note | null => {
    const visibleTrackIds = score.tracks.filter(t => t.visible).map(t => t.id);
    for (let i = score.notes.length - 1; i >= 0; i--) {
      const note = score.notes[i];
      if (!visibleTrackIds.includes(note.trackId)) continue;
      const staffIdx = Math.min(Math.floor(note.position / 30), STAVES - 1);
      const nx = getNoteX(note.position % 30);
      const ny = pitchToY(note.pitch, staffIdx, getStaffY(0));
      if (Math.abs(x - nx) < NOTE_WIDTH && Math.abs(y - ny) < NOTE_HEIGHT) {
        return note;
      }
    }
    return null;
  }, [score.notes, score.tracks, getNoteX, getStaffY]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (previewMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setContextMenu(prev => ({ ...prev, visible: false }));

    const existing = findNoteAt(x, y);
    if (existing) {
      onNoteSelect(existing);
      return;
    }

    const staffIdx = getStaffIndex(y, STAFF_TOP);
    const pitch = yToPitch(y, staffIdx, getStaffY(0));
    const positionInStaff = Math.floor((x - CLEF_WIDTH - 30) / 30);
    const position = staffIdx * 30 + Math.max(0, positionInStaff);

    const newNote: Note = {
      id: generateId(),
      pitch,
      position: Math.max(0, position),
      duration: 'quarter' as Duration,
      sharp: false,
      flat: false,
      trackId: score.tracks[0]?.id || 'track-1',
    };

    noteAnimMap.current.set(newNote.id, 0);
    onNotesChange([...score.notes, newNote]);
    onNoteSelect(newNote);
  }, [previewMode, score, findNoteAt, onNotesChange, onNoteSelect, getStaffY]);

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (previewMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const note = findNoteAt(x, y);
    if (note) {
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        noteId: note.id,
      });
    }
  }, [previewMode, findNoteAt]);

  const handleContextMenuAction = useCallback((action: string) => {
    const note = score.notes.find(n => n.id === contextMenu.noteId);
    if (!note) return;

    let updated = [...score.notes];
    const idx = updated.findIndex(n => n.id === contextMenu.noteId);

    if (action === 'delete') {
      updated.splice(idx, 1);
      onNoteSelect(null);
    } else if (action === 'sharp') {
      updated[idx] = { ...updated[idx], sharp: !updated[idx].sharp, flat: false };
    } else if (action === 'flat') {
      updated[idx] = { ...updated[idx], flat: !updated[idx].flat, sharp: false };
    } else if (action.startsWith('duration-')) {
      const dur = action.replace('duration-', '') as Duration;
      updated[idx] = { ...updated[idx], duration: dur };
    }

    onNotesChange(updated);
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [score.notes, contextMenu.noteId, onNotesChange, onNoteSelect]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (previewMode || e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const note = findNoteAt(x, y);
    if (note) {
      setDragState({
        active: true,
        noteId: note.id,
        startX: x,
        startY: y,
        origPosition: note.position,
        origPitch: note.pitch,
      });
      setDragOffset({ dx: 0, dy: 0 });
    }
  }, [previewMode, findNoteAt]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragState.active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setDragOffset({
      dx: x - dragState.startX,
      dy: y - dragState.startY,
    });
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    if (!dragState.active) return;

    const note = score.notes.find(n => n.id === dragState.noteId);
    if (!note) {
      setDragState(prev => ({ ...prev, active: false }));
      setDragOffset({ dx: 0, dy: 0 });
      return;
    }

    const newPosition = Math.max(0, Math.round(dragState.origPosition + dragOffset.dx / 30));
    const pitchDelta = Math.round(-dragOffset.dy / (LINE_SPACING / 2));
    const newPitch = Math.max(0, Math.min(28, dragState.origPitch + pitchDelta));

    const updated = score.notes.map(n =>
      n.id === dragState.noteId ? { ...n, position: newPosition, pitch: newPitch } : n
    );

    onNotesChange(updated);
    onNoteSelect(updated.find(n => n.id === dragState.noteId) || null);
    setDragState(prev => ({ ...prev, active: false }));
    setDragOffset({ dx: 0, dy: 0 });
  }, [dragState, score.notes, onNotesChange, onNoteSelect]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(prev => ({ ...prev, visible: false }));
    if (contextMenu.visible) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.visible]);

  const totalHeight = STAVES * TOTAL_STAFF_BLOCK + STAFF_TOP + 40;

  return (
    <div ref={containerRef} style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={Math.max(canvasSize.height, totalHeight)}
        onClick={handleCanvasClick}
        onContextMenu={handleCanvasContextMenu}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: 'block',
          width: '100%',
          cursor: dragState.active ? 'grabbing' : 'crosshair',
        }}
      />
      {contextMenu.visible && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#1a1a2e',
            border: '1px solid #e94560',
            borderRadius: 8,
            padding: '4px 0',
            minWidth: 160,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {CONTEXT_MENU_ITEMS.map((item, i) => (
            <div
              key={i}
              onClick={() => handleContextMenuAction(item.action)}
              style={{
                padding: '8px 16px',
                color: '#fff',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                borderBottom: item.action === 'delete' ? '1px solid #0f3460' : 'none',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = '#e94560';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
