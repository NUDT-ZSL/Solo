import { useState, useCallback } from 'react';
import NoteCard from './NoteCard';
import { Note, Session, User, randomNoteColor } from '../types';

interface BoardProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  session: Session;
  currentUser: User;
  isHost: boolean;
  emit: (event: string, data?: any) => void;
  draggingUsers: Record<string, User>;
  voting: boolean;
  voteCandidates: string[];
  setVoting: React.Dispatch<React.SetStateAction<boolean>>;
  setVoteCandidates: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function Board({
  notes,
  session,
  currentUser,
  isHost,
  emit,
  draggingUsers,
  voting,
  voteCandidates,
  setVoting,
  setVoteCandidates,
}: BoardProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleAddNote = useCallback(() => {
    const boardEl = document.getElementById('board-area');
    const rect = boardEl?.getBoundingClientRect();
    const x = Math.random() * ((rect?.width || 800) - 240) + 20;
    const y = Math.random() * ((rect?.height || 600) - 160) + 20;

    emit('note_add', {
      content: '双击编辑便签内容...',
      x: Math.round(x),
      y: Math.round(y),
      color: randomNoteColor(),
      authorId: currentUser.id,
      authorName: currentUser.name,
    });
  }, [emit, currentUser]);

  const handleSelect = useCallback(
    (noteId: string, e: React.MouseEvent) => {
      if (!isHost || voting) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (e.shiftKey) {
          if (next.has(noteId)) {
            next.delete(noteId);
          } else {
            next.add(noteId);
          }
        } else {
          next.clear();
          next.add(noteId);
        }
        return next;
      });
    },
    [isHost, voting]
  );

  const handleStartVoting = useCallback(() => {
    if (selectedIds.size === 0) return;
    const candidates = Array.from(selectedIds);
    emit('voting_start', {
      sessionId: session.id,
      candidateIds: candidates,
    });
    setSelectedIds(new Set());
  }, [selectedIds, emit, session.id]);

  const handleEndVoting = useCallback(() => {
    emit('voting_end', { sessionId: session.id });
  }, [emit, session.id]);

  const rankedNotes = [...notes]
    .filter((n) => voteCandidates.includes(n.id))
    .sort((a, b) => b.votes.length - a.votes.length);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        id="board-area"
        className="board-area"
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'auto',
          background: '#f1f5f9',
          backgroundImage:
            'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
        onClick={() => setSelectedIds(new Set())}
      >
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            currentUser={currentUser}
            isHost={isHost}
            emit={emit}
            draggingUser={draggingUsers[note.id] || null}
            voting={voting}
            isCandidate={voteCandidates.includes(note.id)}
            selected={selectedIds.has(note.id)}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {voting && rankedNotes.length > 0 && (
        <div
          className="ranking-panel"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: '#fff',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            minWidth: 200,
            zIndex: 100,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>
            投票排名
          </h3>
          {rankedNotes.map((note, idx) => (
            <div
              key={note.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 0',
                borderBottom: idx < rankedNotes.length - 1 ? '1px solid #f1f5f9' : 'none',
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background:
                    idx === 0
                      ? '#fbbf24'
                      : idx === 1
                      ? '#94a3b8'
                      : idx === 2
                      ? '#d97706'
                      : '#e2e8f0',
                  color: idx < 3 ? '#fff' : '#64748b',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: '#334155',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {note.content}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>
                {note.votes.length}票
              </span>
            </div>
          ))}
        </div>
      )}

      <div
        className="board-bottom-bar"
        style={{
          height: 30,
          background: '#fff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleAddNote}
          style={{
            padding: '4px 14px',
            borderRadius: 6,
            border: 'none',
            background: '#6366f1',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = '#818cf8';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = '#6366f1';
          }}
        >
          + 添加便签
        </button>

        {isHost && !voting && selectedIds.size > 0 && (
          <button
            onClick={handleStartVoting}
            style={{
              padding: '4px 14px',
              borderRadius: 6,
              border: '1px solid #6366f1',
              background: 'transparent',
              color: '#6366f1',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            发起投票（{selectedIds.size}项）
          </button>
        )}

        {isHost && voting && (
          <button
            onClick={handleEndVoting}
            style={{
              padding: '4px 14px',
              borderRadius: 6,
              border: '1px solid #ef4444',
              background: 'transparent',
              color: '#ef4444',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            结束投票
          </button>
        )}

        {isHost && !voting && selectedIds.size === 0 && (
          <button
            disabled
            style={{
              padding: '4px 14px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              background: 'transparent',
              color: '#9ca3af',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'not-allowed',
              whiteSpace: 'nowrap',
            }}
          >
            发起投票（Shift+点击选择便签）
          </button>
        )}

        {!isHost && !voting && (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>等待主持人发起投票...</span>
        )}

        {voting && (
          <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 500 }}>
            投票进行中 — 点击便签上的 +1 按钮投票
          </span>
        )}
      </div>
    </div>
  );
}
