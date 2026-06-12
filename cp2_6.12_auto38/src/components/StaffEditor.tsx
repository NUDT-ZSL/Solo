import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Note, Collaborator, NoteDuration } from '../types';
import { DURATION_VALUES } from '../types';

interface Props {
  notes: Note[];
  selectedNoteId: string | null;
  playingNoteId: string | null;
  collaborators: Collaborator[];
  remoteActions: Map<string, { type: string; time: number }>;
  onAddNote: (note: Note) => void;
  onUpdateNote: (noteId: string, changes: Partial<Note>) => void;
  onSelectNote: (noteId: string | null) => void;
  onCursorMove: (x: number, y: number, noteId: string | null) => void;
}

const SVG_WIDTH = 900;
const SVG_HEIGHT = 320;
const PADDING_X = 60;
const PADDING_Y = 60;
const LINE_SPACING = 12;
const NOTE_RADIUS = 7;
const LINES_COUNT = 5;
const STAFF_TOP = PADDING_Y;
const STAFF_LEFT = PADDING_X;
const STAFF_RIGHT = SVG_WIDTH - PADDING_X;
const STAFF_BOTTOM = STAFF_TOP + (LINES_COUNT - 1) * LINE_SPACING * 2;
const Y_MIN = -2;
const Y_MAX = 12;

const yToSvgY = (y: number) => {
  const centerY = (STAFF_TOP + STAFF_BOTTOM) / 2;
  return centerY - y * LINE_SPACING;
};

const svgYToY = (svgY: number) => {
  const centerY = (STAFF_TOP + STAFF_BOTTOM) / 2;
  const raw = (centerY - svgY) / LINE_SPACING;
  return Math.round(raw);
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

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
  const justAddedRef = useRef<Set<string>>(new Set());
  const justDeletedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const added = new Set<string>();
    notes.forEach(n => {
      if (remoteActions.has(n.id) && remoteActions.get(n.id)!.type === 'add') {
        added.add(n.id);
      }
    });
    justAddedRef.current = added;

    const deleted = new Set<string>();
    remoteActions.forEach((v, k) => {
      if (v.type === 'delete') deleted.add(k);
    });
    justDeletedRef.current = deleted;
  }, [notes, remoteActions]);

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
    if (svgX < STAFF_LEFT || svgX > STAFF_RIGHT || svgY < STAFF_TOP - 40 || svgY > STAFF_BOTTOM + 40) return;

    const snappedX = clamp(Math.round((svgX - STAFF_LEFT) / 15) * 15 + STAFF_LEFT, STAFF_LEFT + 15, STAFF_RIGHT - 15);
    const rawY = svgYToY(svgY);
    const snappedY = clamp(rawY, Y_MIN, Y_MAX);
    const pitch = 60 + (snappedY - 4);

    const newNote: Note = {
      id: 'n_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      pitch,
      duration: 'quarter',
      x: snappedX,
      y: snappedY,
    };
    onAddNote(newNote);
  }, [draggingId, getSvgPoint, onAddNote]);

  const handleStaffMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const { x: svgX, y: svgY } = getSvgPoint(e.clientX, e.clientY);

    if (draggingId && dragStart) {
      const dx = svgX - dragStart.x;
      const dy = svgY - dragStart.y;
      const newX = clamp(dragStart.noteX + dx, STAFF_LEFT + 15, STAFF_RIGHT - 15);
      const snappedX = Math.round(newX / 15) * 15;
      const rawY = svgYToY(dragStart.noteY * 0 + (dragStart.y + dy));
      const snappedY = clamp(rawY, Y_MIN, Y_MAX);
      const newPitch = 60 + (snappedY - 4);

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
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    onSelectNote(noteId);
    setDraggingId(noteId);
    const { x, y } = getSvgPoint(e.clientX, e.clientY);
    setDragStart({ x, y, noteX: note.x, noteY: yToSvgY(note.y) });
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
        e.preventDefault();
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
          x1={STAFF_LEFT - 20}
          y1={y}
          x2={STAFF_RIGHT + 20}
          y2={y}
        />
      );
    }
    lines.push(
      <line
        key="bar-left"
        className="staff-line"
        strokeWidth={3}
        x1={STAFF_LEFT - 20}
        y1={STAFF_TOP}
        x2={STAFF_LEFT - 20}
        y2={STAFF_BOTTOM}
      />,
      <line
        key="bar-right"
        className="staff-line"
        strokeWidth={3}
        x1={STAFF_RIGHT + 20}
        y1={STAFF_TOP}
        x2={STAFF_RIGHT + 20}
        y2={STAFF_BOTTOM}
      />
    );
    const clefY = (STAFF_TOP + STAFF_BOTTOM) / 2;
    lines.push(
      <text
        key="clef"
        x={STAFF_LEFT - 55}
        y={clefY + 15}
        fontSize={60}
        fill="var(--accent)"
        fontFamily="serif"
        style={{ userSelect: 'none' }}
      >𝄞</text>
    );
    return lines;
  };

  const renderHoverGuide = () => {
    if (!hoverPos || draggingId) return null;
    if (hoverPos.x < STAFF_LEFT || hoverPos.x > STAFF_RIGHT) return null;
    if (hoverPos.y < STAFF_TOP - 40 || hoverPos.y > STAFF_BOTTOM + 40) return null;

    const snappedX = Math.round((hoverPos.x - STAFF_LEFT) / 15) * 15 + STAFF_LEFT;
    const rawY = svgYToY(hoverPos.y);
    const snappedY = clamp(rawY, Y_MIN, Y_MAX);
    const svgY = yToSvgY(snappedY);

    return (
      <g style={{ pointerEvents: 'none' }}>
        <line
          className="drop-guide"
          x1={STAFF_LEFT - 20}
          y1={svgY}
          x2={STAFF_RIGHT + 20}
          y2={svgY}
          opacity={0.5}
        />
        <line
          className="drop-guide"
          x1={snappedX}
          y1={STAFF_TOP - 30}
          x2={snappedX}
          y2={STAFF_BOTTOM + 30}
          opacity={0.5}
        />
        <circle
          cx={snappedX}
          cy={svgY}
          r={NOTE_RADIUS}
          fill="none"
          stroke="var(--highlight-gold)"
          strokeWidth={2}
          strokeDasharray="4 3"
          opacity={0.6}
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
          x1={STAFF_LEFT - 20}
          y1={svgY}
          x2={STAFF_RIGHT + 20}
          y2={svgY}
        />
        <line
          className="drop-guide"
          x1={dragCurrentPos.x}
          y1={STAFF_TOP - 30}
          x2={dragCurrentPos.x}
          y2={STAFF_BOTTOM + 30}
        />
      </g>
    );
  };

  const getNoteClasses = (note: Note) => {
    const classes: string[] = ['note'];
    if (note.id === selectedNoteId) classes.push('selected');
    if (note.id === playingNoteId) classes.push('playing');
    if (draggingId === note.id) classes.push('dragging');
    const remoteAction = remoteActions.get(note.id);
    if (remoteAction) {
      if (remoteAction.type === 'add') classes.push('remote-note-action');
    }
    return classes.join(' ');
  };

  const renderNotes = () => {
    return notes.map(note => {
      const svgY = yToSvgY(note.y);
      const cx = note.x;
      const isDeleted = remoteActions.get(note.id)?.type === 'delete';
      const durationPx = DURATION_VALUES[note.duration] * 40;

      return (
        <g
          key={note.id}
          className={`${getNoteClasses(note)} ${isDeleted ? 'note-exit' : ''}`}
          style={{
            transition: draggingId === note.id ? 'none' : undefined,
            transform: draggingId === note.id ? undefined : undefined,
          }}
          onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
        >
          {!isDeleted && (
            <>
              <rect
                className="duration-bar"
                x={cx + NOTE_RADIUS + 2}
                y={svgY - 2}
                width={durationPx}
                height={4}
                style={{ opacity: 0.6 }}
              />
              <circle
                className="note-head"
                cx={cx}
                cy={svgY}
                r={NOTE_RADIUS}
                stroke="none"
                strokeWidth={0}
              />
              <line
                x1={cx + NOTE_RADIUS - 1}
                y1={svgY}
                x2={cx + NOTE_RADIUS - 1}
                y2={svgY - (DURATION_VALUES[note.duration] < 4 ? 32 : 0)}
                stroke="#fff"
                strokeWidth={1.5}
                strokeLinecap="round"
                style={{ opacity: DURATION_VALUES[note.duration] < 4 ? 0.9 : 0 }}
              />
              {note.y < 0 && Array.from({ length: Math.abs(note.y) }).map((_, i) => (
                <line
                  key={`below-${note.id}-${i}`}
                  x1={cx - NOTE_RADIUS - 2}
                  y1={yToSvgY(-i - 0.5) + LINE_SPACING}
                  x2={cx + NOTE_RADIUS + 2}
                  y2={yToSvgY(-i - 0.5) + LINE_SPACING}
                  stroke="var(--accent)"
                  strokeWidth={1}
                  opacity={0.6}
                />
              ))}
              {note.y > 8 && Array.from({ length: note.y - 8 }).map((_, i) => (
                <line
                  key={`above-${note.id}-${i}`}
                  x1={cx - NOTE_RADIUS - 2}
                  y1={yToSvgY(9 + i) - LINE_SPACING}
                  x2={cx + NOTE_RADIUS + 2}
                  y2={yToSvgY(9 + i) - LINE_SPACING}
                  stroke="var(--accent)"
                  strokeWidth={1}
                  opacity={0.6}
                />
              ))}
            </>
          )}
        </g>
      );
    });
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
              opacity={0.7}
            />
            <line
              className="remote-cursor-line"
              stroke={c.color}
              x1={STAFF_LEFT - 20}
              y1={svgY}
              x2={STAFF_RIGHT + 20}
              y2={svgY}
              opacity={0.4}
            />
            <rect
              x={x + 4}
              y={STAFF_TOP - 48}
              width={c.name.length * 12 + 16}
              height={18}
              rx={4}
              fill={c.color}
              opacity={0.9}
            />
            <text
              className="remote-cursor-label"
              x={x + 12}
              y={STAFF_TOP - 35}
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
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        {renderStaffLines()}

        <rect
          className="staff-click-area"
          x={STAFF_LEFT - 25}
          y={STAFF_TOP - 45}
          width={STAFF_RIGHT - STAFF_LEFT + 50}
          height={STAFF_BOTTOM - STAFF_TOP + 90}
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
