import { useState, useRef, useCallback, useEffect } from 'react';
import { Note, User } from '../types';

interface NoteCardProps {
  note: Note;
  currentUser: User;
  isHost: boolean;
  emit: (event: string, data?: any) => void;
  draggingUser: User | null;
  voting: boolean;
  isCandidate: boolean;
  selected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
}

export default function NoteCard({
  note,
  currentUser,
  isHost,
  emit,
  draggingUser,
  voting,
  isCandidate,
  selected,
  onSelect,
}: NoteCardProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: note.x, y: note.y });
  const dragStart = useRef<{ mx: number; my: number; nx: number; ny: number } | null>(null);
  const rafRef = useRef<number>(0);
  const pendingPos = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setPos({ x: note.x, y: note.y });
  }, [note.x, note.y]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      setEditContent(note.content);
    }
  }, [note.content, editing]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (editing) return;
      if ((e.target as HTMLElement).closest('.note-action')) return;
      e.preventDefault();
      setDragging(true);
      dragStart.current = {
        mx: e.clientX,
        my: e.clientY,
        nx: pos.x,
        ny: pos.y,
      };
      emit('note_drag_start', { noteId: note.id });

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragStart.current) return;
        const dx = ev.clientX - dragStart.current.mx;
        const dy = ev.clientY - dragStart.current.my;
        const newX = dragStart.current.nx + dx;
        const newY = dragStart.current.ny + dy;
        pendingPos.current = { x: newX, y: newY };
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            if (pendingPos.current) {
              setPos(pendingPos.current);
              emit('note_update', {
                noteId: note.id,
                updates: { x: pendingPos.current.x, y: pendingPos.current.y },
              });
            }
            rafRef.current = 0;
          });
        }
      };

      const handleMouseUp = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        setDragging(false);
        dragStart.current = null;
        pendingPos.current = null;
        emit('note_drag_end', { noteId: note.id });
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [editing, pos.x, pos.y, note.id, emit]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditing(true);
      setEditContent(note.content);
    },
    [note.content]
  );

  const handleEditBlur = useCallback(() => {
    setEditing(false);
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== note.content) {
      emit('note_update', {
        noteId: note.id,
        updates: { content: trimmed.slice(0, 200) },
      });
    } else {
      setEditContent(note.content);
    }
  }, [editContent, note.content, note.id, emit]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleEditBlur();
      }
      if (e.key === 'Escape') {
        setEditing(false);
        setEditContent(note.content);
      }
    },
    [handleEditBlur, note.content]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      emit('note_delete', { noteId: note.id });
    },
    [note.id, emit]
  );

  const handleVote = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      emit('note_vote', { noteId: note.id, userId: currentUser.id });
    },
    [note.id, currentUser.id, emit]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isHost && !voting) {
        onSelect(note.id, e);
      }
    },
    [isHost, voting, note.id, onSelect]
  );

  const hasVoted = note.votes.includes(currentUser.id);
  const showVoteBtn = voting && isCandidate;
  const showBadge = voting && isCandidate && note.votes.length > 0;

  return (
    <div
      ref={cardRef}
      className="note-card"
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: 200,
        cursor: dragging ? 'grabbing' : 'grab',
        perspective: '600px',
        transform: dragging ? 'translateZ(0)' : 'none',
        zIndex: dragging ? 1000 : selected ? 10 : 1,
        userSelect: 'none',
        transition: dragging ? 'none' : 'all 0.2s ease',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 80,
          background: note.color,
          borderRadius: 8,
          padding: 12,
          boxShadow: dragging
            ? '0 8px 24px rgba(0,0,0,0.15)'
            : selected
            ? '0 2px 12px rgba(99,102,241,0.25)'
            : '0 2px 8px rgba(0,0,0,0.06)',
          transform: dragging ? 'rotateX(3deg)' : 'none',
          transformStyle: 'preserve-3d',
          opacity: dragging ? 0.6 : 1,
          transition: dragging
            ? 'opacity 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease'
            : 'all 0.2s ease',
          border: selected ? '2px solid #6366f1' : '2px solid transparent',
          boxSizing: 'border-box',
        }}
      >
        {showBadge && (
          <div
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#ef4444',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(239,68,68,0.3)',
            }}
          >
            {note.votes.length}
          </div>
        )}

        {editing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value.slice(0, 200))}
            onBlur={handleEditBlur}
            onKeyDown={handleEditKeyDown}
            style={{
              width: '100%',
              minHeight: 50,
              border: 'none',
              background: 'transparent',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              fontSize: 13,
              lineHeight: 1.5,
              color: '#1e293b',
            }}
          />
        ) : (
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: '#1e293b',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {note.content}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: '#94a3b8',
            }}
          >
            {note.authorName}
          </span>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {showVoteBtn && (
              <button
                className="note-action"
                onClick={handleVote}
                title={hasVoted ? '取消投票' : '投票'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: hasVoted ? '1px solid #22c55e' : '1px solid #d1d5db',
                  background: hasVoted ? '#f0fdf4' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 3v10M3 8h10"
                    stroke={hasVoted ? '#22c55e' : '#9ca3af'}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}

            {!voting && note.authorId === currentUser.id && (
              <button
                className="note-action"
                onClick={handleDelete}
                title="删除便签"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: 0,
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {draggingUser && draggingUser.id !== currentUser.id && (
          <div
            style={{
              position: 'absolute',
              bottom: -4,
              right: -4,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: draggingUser.color,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              border: '2px solid #fff',
            }}
          >
            {draggingUser.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
