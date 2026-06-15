import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Note, Collaborator, NoteDuration } from '../types';
import { DURATION_VALUES } from '../types';

interface Props {
  notes: Note[];
  selectedNoteId: string | null;
  playingNoteId: string | null;
  collaborators: Collaborator[];
  remoteActions: Map<string, { type: string; time: number; prev?: Note }>;
  onAddNote: (note: Note) => void;
  onUpdateNote: (noteId: string, changes: Partial<Note>) => void;
  onSelectNote: (noteId: string | null) => void;
  onCursorMove: (x: number, y: number, noteId: string | null) => void;
}

const SVG_WIDTH = 900;
const SVG_HEIGHT = 360;
const PADDING_X = 70;
const PADDING_Y = 80;
const LINE_SPACING = 14;
const NOTE_RADIUS = 8;
const LINES_COUNT = 5;

const STAFF_TOP = PADDING_Y;
const STAFF_LEFT = PADDING_X;
const STAFF_RIGHT = SVG_WIDTH - PADDING_X;
const STAFF_BOTTOM = STAFF_TOP + (LINES_COUNT - 1) * LINE_SPACING * 2;
const STAFF_CENTER_Y = (STAFF_TOP + STAFF_BOTTOM) / 2;

const Y_MIN = -2;
const Y_MAX = 13;

const yToSvgY = (y: number) => {
  return STAFF_CENTER_Y - y * LINE_SPACING;
};

const svgYToY = (svgY: number) => {
  const raw = (STAFF_CENTER_Y - svgY) / LINE_SPACING;
  return Math.round(raw);
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const snap = (value: number, gridSize: number) => Math.round(value / gridSize) * gridSize;

const StaffEditor: React.FC<Props> = ({
  notes,
  selectedNoteId,
  playingNoteId,
  collaborators,
  remoteActions,
  onAddNote,
  onUpdateNote,
  onSelectNote,
  onCursorMove,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; noteX: number; noteY: number } | null>(null);
  const [dragCurrentPos, setDragCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [animatingNotes, setAnimatingNotes] = useState<Set<string>>(new Set());

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = SVG_WIDTH / rect.width;
    const scaleY = SVG_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const handleStaffClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingId) return;
    const target = e.target as SVGElement;
    if (target.closest('.note')) return;

    const { x: svgX, y: svgY } = getSvgPoint(e.clientX, e.clientY);
    if (svgX < STAFF_LEFT - 10 || svgX > STAFF_RIGHT + 10) return;
    if (svgY < yToSvgY(Y_MAX) - 20 || svgY > yToSvgY(Y_MIN) + 20) return;

    const snappedX = clamp(snap(svgX, 18), STAFF_LEFT + 20, STAFF_RIGHT - 20);
    const rawY = svgYToY(svgY);
    const snappedY = clamp(rawY, Y_MIN, Y_MAX);
    const pitch = 60 + snappedY;

    const newNote: Note = {
      id: 'n_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      pitch,
      duration: 'quarter',
      x: snappedX,
      y: snappedY,
    };

    setAnimatingNotes(prev => new Set(prev).add(newNote.id));
    setTimeout(() => {
      setAnimatingNotes(prev => {
        const n = new Set(prev);
        n.delete(newNote.id);
        return n;
      });
    }, 500);

    onAddNote(newNote);
  }, [draggingId, getSvgPoint, onAddNote]);

  const handleStaffMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const { x: svgX, y: svgY } = getSvgPoint(e.clientX, e.clientY);

    if (draggingId && dragStart) {
      const dx = svgX - dragStart.x;
      const dy = svgY - dragStart.y;
      const targetX = dragStart.noteX + dx;
      const targetY = yToSvgY(dragStart.noteY * 0 + (dragStart.y + dy - dragStart.y + yToSvgY(dragStart.noteY) / LINE_SPACING * 0));

      const rawNewY = svgYToY(dragStart.y + dy);
      const snappedY = clamp(rawNewY, Y_MIN, Y_MAX);
      const snappedX = clamp(snap(targetX, 18), STAFF_LEFT + 20, STAFF_RIGHT - 20);
      const newPitch = 60 + snappedY;

      setDragCurrentPos({ x: snappedX, y: snappedY });
      onUpdateNote(draggingId, {
        x: snappedX,
        y: snappedY,
        pitch: newPitch,
      });
    } else {
      setHoverPos({ x: svgX, y: svgY });
    }
  }, [draggingId, dragStart, getSvgPoint, onUpdateNote]);

  const handleNoteMouseDown = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    onSelectNote(noteId);
    setDraggingId(noteId);
    const { x, y } = getSvgPoint(e.clientX, e.clientY);
    setDragStart({ x, y, noteX: note.x, noteY: note.y });
    setDragCurrentPos({ x: note.x, y: note.y });
  }, [notes, getSvgPoint, onSelectNote]);

  const handleMouseUp = useCallback(() => {
    if (draggingId) {
      setDraggingId(null);
      setDragStart(null);
      setDragCurrentPos(null);
    }
  }, [draggingId]);

  const handleMouseLeave = useCallback(() => {
    setHoverPos(null);
    if (draggingId) {
      setDraggingId(null);
      setDragStart(null);
      setDragCurrentPos(null);
    }
  }, [draggingId]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteId) {
        const el = document.activeElement;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteId]);

  const renderStaffLines = () => {
    const lines = [];
    for (let i = 0; i < LINES_COUNT; i++) {
      const y = STAFF_TOP + i * LINE_SPACING * 2;
      lines.push(
        <line
          key={`line-${i}`}
          className="staff-line"
          x1={STAFF_LEFT - 25}
          y1={y}
          x2={STAFF_RIGHT + 25}
          y2={y}
        />
      );
    }
    lines.push(
      <line
        key="bar-left"
        className="staff-line"
        strokeWidth={3}
        x1={STAFF_LEFT - 25}
        y1={STAFF_TOP}
        x2={STAFF_LEFT - 25}
        y2={STAFF_BOTTOM}
      />,
      <line
        key="bar-right"
        className="staff-line"
        strokeWidth={3}
        x1={STAFF_RIGHT + 25}
        y1={STAFF_TOP}
        x2={STAFF_RIGHT + 25}
        y2={STAFF_BOTTOM}
      />
    );
    const clefY = (STAFF_TOP + STAFF_BOTTOM) / 2;
    lines.push(
      <text
        key="clef"
        x={STAFF_LEFT - 60}
        y={clefY + 18}
        fontSize={68}
        fill="var(--accent)"
        fontFamily="serif"
        style={{ userSelect: 'none' }}
      >𝄞</text>
    );
    return lines;
  };

  const renderHoverGuide = () => {
    if (!hoverPos || draggingId) return null;
    if (hoverPos.x < STAFF_LEFT - 10 || hoverPos.x > STAFF_RIGHT + 10) return null;
    if (hoverPos.y < yToSvgY(Y_MAX) - 20 || hoverPos.y > yToSvgY(Y_MIN) + 20) return null;

    const snappedX = clamp(snap(hoverPos.x, 18), STAFF_LEFT + 20, STAFF_RIGHT - 20);
    const rawY = svgYToY(hoverPos.y);
    const snappedY = clamp(rawY, Y_MIN, Y_MAX);
    const svgY = yToSvgY(snappedY);

    return (
      <g style={{ pointerEvents: 'none' }}>
        <line
          className="drop-guide"
          x1={STAFF_LEFT - 25}
          y1={svgY}
          x2={STAFF_RIGHT + 25}
          y2={svgY}
        />
        <line
          className="drop-guide"
          x1={snappedX}
          y1={STAFF_TOP - 30}
          x2={snappedX}
          y2={STAFF_BOTTOM + 30}
        />
        <circle
          cx={snappedX}
          cy={svgY}
          r={NOTE_RADIUS}
          fill="none"
          stroke="var(--highlight-gold)"
          strokeWidth={2}
          strokeDasharray="4 3"
          opacity={0.7}
        />
      </g>
    );
  };

  const renderDragGuide = () => {
    if (!draggingId || !dragCurrentPos) return null;
    const svgY = yToSvgY(dragCurrentPos.y);
    return (
      <g style={{ pointerEvents: 'none' }}>
        <line
          className="drop-guide"
          x1={STAFF_LEFT - 25}
          y1={svgY}
          x2={STAFF_RIGHT + 25}
          y2={svgY}
        />
        <line
          className="drop-guide"
          x1={dragCurrentPos.x}
          y1={STAFF_TOP - 30}
          x2={dragCurrentPos.x}
          y2={STAFF_BOTTOM + 30}
        />
        <circle
          cx={dragCurrentPos.x}
          cy={svgY}
          r={NOTE_RADIUS + 2}
          fill="none"
          stroke="var(--highlight-gold)"
          strokeWidth={2.5}
          strokeDasharray="6 4"
        />
      </g>
    );
  };

  const getNoteClasses = (note: Note) => {
    const classes: string[] = ['note'];
    if (note.id === selectedNoteId) classes.push('selected');
    if (note.id === playingNoteId) classes.push('playing');
    if (draggingId === note.id) classes.push('dragging');
    if (animatingNotes.has(note.id)) classes.push('note-enter');
    
    const remoteAction = remoteActions.get(note.id);
    if (remoteAction) {
      classes.push('remote-note-action');
      if (remoteAction.type === 'delete') classes.push('note-exit');
    }
    return classes.join(' ');
  };

  const renderLedgerLines = (cx: number, y: number) => {
    const lines = [];
    const noteHeadWidth = NOTE_RADIUS * 2 + 6;

    if (y < 2) {
      const count = 2 - y;
      for (let i = 0; i < count; i++) {
        const lineY = yToSvgY(1 - i);
        lines.push(
          <line
            key={`below-${i}`}
            x1={cx - noteHeadWidth / 2}
            y1={lineY}
            x2={cx + noteHeadWidth / 2}
            y2={lineY}
            stroke="var(--accent)"
            strokeWidth={1.2}
            opacity={0.7}
          />
        );
      }
    }

    if (y > 10) {
      const count = y - 10;
      for (let i = 0; i < count; i++) {
        const lineY = yToSvgY(11 + i);
        lines.push(
          <line
            key={`above-${i}`}
            x1={cx - noteHeadWidth / 2}
            y1={lineY}
            x2={cx + noteHeadWidth / 2}
            y2={lineY}
            stroke="var(--accent)"
            strokeWidth={1.2}
            opacity={0.7}
          />
        );
      }
    }

    return lines;
  };

  const renderRemoteGhost = (noteId: string) => {
    const remoteAction = remoteActions.get(noteId);
    if (!remoteAction || !remoteAction.prev || remoteAction.type !== 'update') return null;
    
    const prev = remoteAction.prev;
    const svgY = yToSvgY(prev.y);
    const note = notes.find(n => n.id === noteId);
    if (!note) return null;

    return (
      <g className="remote-note-action" style={{ pointerEvents: 'none' }} key={`ghost-${noteId}`}>
        <circle
          cx={prev.x}
          cy={svgY}
          r={NOTE_RADIUS}
          fill="#fff"
          opacity={0.4}
        />
        <line
          x1={prev.x}
          y1={svgY}
          x2={note.x}
          y2={yToSvgY(note.y)}
          stroke="var(--highlight-gold)"
          strokeWidth={2}
          strokeDasharray="3 3"
          opacity={0.5}
        />
      </g>
    );
  };

  const renderNotes = () => {
    const ghosts: React.ReactNode[] = [];
    const noteElements = notes.map(note => {
      const svgY = yToSvgY(note.y);
      const cx = note.x;
      const remoteAction = remoteActions.get(note.id);
      const isDeleting = remoteAction?.type === 'delete';
      const durationPx = DURATION_VALUES[note.duration] * 36;

      const ghost = renderRemoteGhost(note.id);
      if (ghost) ghosts.push(ghost);

      return (
        <g
          key={note.id}
          className={getNoteClasses(note)}
          style={{
            transition: draggingId === note.id ? 'none' : undefined,
          }}
          onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
        >
          {!isDeleting && (
            <>
              {renderLedgerLines(cx, note.y)}
              
              <rect
                className="duration-bar"
                x={cx + NOTE_RADIUS + 3}
                y={svgY - 2}
                width={durationPx}
                height={4}
                rx={2}
              />
              
              <circle
                className="note-head"
                cx={cx}
                cy={svgY}
                r={NOTE_RADIUS}
              />
              
              <line
                x1={cx + NOTE_RADIUS - 1}
                y1={svgY}
                x2={cx + NOTE_RADIUS - 1}
                y2={svgY - (DURATION_VALUES[note.duration] < 4 ? 36 : 0)}
                stroke="#fff"
                strokeWidth={1.6}
                strokeLinecap="round"
                style={{ opacity: DURATION_VALUES[note.duration] < 4 ? 0.95 : 0 }}
              />
            </>
          )}
        </g>
      );
    });

    return [...ghosts, ...noteElements];
  };

  const renderRemoteCursors = () => {
    return collaborators
      .filter(c => c.cursorX !== undefined && c.cursorY !== undefined)
      .map(c => {
        const svgY = yToSvgY(c.cursorY!);
        const x = c.cursorX!;
        return (
          <g key={`cursor-${c.id}`} className="remote-cursor">
            <line
              className="remote-cursor-line"
              stroke={c.color}
              x1={x}
              y1={STAFF_TOP - 30}
              x2={x}
              y2={STAFF_BOTTOM + 30}
              opacity={0.75}
            />
            <line
              className="remote-cursor-line"
              stroke={c.color}
              x1={STAFF_LEFT - 25}
              y1={svgY}
              x2={STAFF_RIGHT + 25}
              y2={svgY}
              opacity={0.45}
            />
            <rect
              x={x + 4}
              y={STAFF_TOP - 52}
              width={c.name.length * 12 + 18}
              height={20}
              rx={5}
              fill={c.color}
              opacity={0.95}
            />
            <text
              className="remote-cursor-label"
              x={x + 13}
              y={STAFF_TOP - 38}
              fill="#fff"
            >{c.name}</text>
          </g>
        );
      });
  };

  return (
    <div className="staff-wrapper">
      <svg
        ref={svgRef}
        className="staff-svg"
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        onClick={handleStaffClick}
        onMouseMove={handleStaffMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <defs>
          <filter id="goldGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffd700" floodOpacity="0.8" />
          </filter>
        </defs>

        {renderStaffLines()}

        <rect
          className="staff-click-area"
          x={STAFF_LEFT - 30}
          y={yToSvgY(Y_MAX) - 25}
          width={STAFF_RIGHT - STAFF_LEFT + 60}
          height={yToSvgY(Y_MIN) - yToSvgY(Y_MAX) + 50}
        />

        {renderHoverGuide()}
        {renderDragGuide()}
        {renderNotes()}
        {renderRemoteCursors()}
      </svg>
    </div>
  );
};

export default StaffEditor;
