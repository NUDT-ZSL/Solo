import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Note as NoteType, NoteStatus, Comment } from '../types';
import Note from './Note';

interface ColumnConfig {
  key: NoteStatus;
  title: string;
  color: string;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'incubating', title: '待孵化', color: '#FF6B6B' },
  { key: 'inProgress', title: '进行中', color: '#FFE66D' },
  { key: 'launched', title: '已落地', color: '#4ECDC4' }
];

interface BoardProps {
  notes: NoteType[];
  currentUser: string;
  isPlaybackMode: boolean;
  onCreateNote: (content: string, status: NoteStatus) => void;
  onMoveNote: (noteId: string, x: number, y: number, status: NoteStatus) => void;
  onUpdateNote: (noteId: string, content?: string, comments?: Comment[]) => void;
  onDeleteNote: (noteId: string) => void;
}

const Board: React.FC<BoardProps> = ({
  notes,
  currentUser,
  isPlaybackMode,
  onCreateNote,
  onMoveNote,
  onUpdateNote,
  onDeleteNote
}) => {
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOverColumn, setDragOverColumn] = useState<NoteStatus | null>(null);
  const [creatingForStatus, setCreatingForStatus] = useState<NoteStatus | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const boardWrapperRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((noteId: string, e: React.MouseEvent) => {
    if (isPlaybackMode) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const wrapperRect = boardWrapperRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;

    setDraggingNoteId(noteId);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDragPosition({
      x: e.clientX - wrapperRect.left - (e.clientX - rect.left),
      y: e.clientY - wrapperRect.top - (e.clientY - rect.top)
    });
  }, [notes, isPlaybackMode]);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!draggingNoteId || isPlaybackMode) return;
    const wrapperRect = boardWrapperRef.current?.getBoundingClientRect();
    if (!wrapperRect) return;

    const newX = e.clientX - wrapperRect.left - dragOffset.x;
    const newY = e.clientY - wrapperRect.top - dragOffset.y;
    setDragPosition({ x: newX, y: newY });

    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    const column = target?.closest('[data-column-status]');
    const status = column?.getAttribute('data-column-status') as NoteStatus | null;
    setDragOverColumn(status);
  }, [draggingNoteId, dragOffset, isPlaybackMode]);

  const handleDragEnd = useCallback((status: NoteStatus) => {
    if (!draggingNoteId || isPlaybackMode) return;
    const note = notes.find(n => n.id === draggingNoteId);
    if (note) {
      onMoveNote(draggingNoteId, dragPosition.x, dragPosition.y, status);
    }
    setDraggingNoteId(null);
    setDragOverColumn(null);
  }, [draggingNoteId, notes, dragPosition, onMoveNote, isPlaybackMode]);

  const handleDoubleClickNote = useCallback((_note: NoteType) => {
  }, []);

  const handleAddNoteClick = (status: NoteStatus) => {
    if (isPlaybackMode) return;
    setCreatingForStatus(status);
    setNewNoteContent('');
  };

  const handleCreateNoteSubmit = () => {
    if (!creatingForStatus || !newNoteContent.trim()) return;
    onCreateNote(newNoteContent.trim(), creatingForStatus);
    setCreatingForStatus(null);
    setNewNoteContent('');
  };

  const getNotesForColumn = (status: NoteStatus) => {
    return notes.filter(n => n.status === status);
  };

  const renderNote = (note: NoteType) => {
    const isDragging = draggingNoteId === note.id;
    const style: React.CSSProperties = {};

    if (isDragging) {
      style.position = 'absolute';
      style.left = dragPosition.x;
      style.top = dragPosition.y;
      style.pointerEvents = 'none';
      style.width = 280;
    }

    return (
      <div key={note.id} style={style}>
        <Note
          note={note}
          isDragging={isDragging}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDoubleClick={handleDoubleClickNote}
          onDelete={onDeleteNote}
          onUpdate={onUpdateNote}
          currentUser={currentUser}
        />
      </div>
    );
  };

  return (
    <div className="board-wrapper" ref={boardWrapperRef}>
      <div className="columns-container">
        {COLUMNS.map((column) => {
          const columnNotes = getNotesForColumn(column.key);
          const isDragOver = dragOverColumn === column.key;

          return (
            <div
              key={column.key}
              className={`column ${isDragOver ? 'drag-over' : ''}`}
              data-column-status={column.key}
            >
              <div className="column-header">
                <div className="column-title">
                  <span className="column-dot" style={{ background: column.color }}></span>
                  {column.title}
                </div>
                <span className="column-count">{columnNotes.length}</span>
              </div>

              <div className="column-body">
                {columnNotes.filter(n => n.id !== draggingNoteId).map(note => renderNote(note))}
                {isDragOver && draggingNoteId && (
                  <div style={{
                    border: '2px dashed rgba(0, 210, 255, 0.5)',
                    borderRadius: 8,
                    padding: 20,
                    textAlign: 'center',
                    color: '#00D2FF',
                    fontSize: 12,
                    background: 'rgba(0, 210, 255, 0.05)'
                  }}>
                    释放便签到此处
                  </div>
                )}
              </div>

              {!isPlaybackMode && (
                <button
                  className="column-add-btn"
                  onClick={() => handleAddNoteClick(column.key)}
                >
                  + 添加便签
                </button>
              )}
            </div>
          );
        })}

        {draggingNoteId && (
          <div style={{ position: 'absolute', pointerEvents: 'none', zIndex: 1000 }}>
            {(() => {
              const note = notes.find(n => n.id === draggingNoteId);
              if (!note) return null;
              return (
                <div style={{
                  position: 'fixed',
                  left: dragPosition.x + (boardWrapperRef.current?.getBoundingClientRect().left || 0),
                  top: dragPosition.y + (boardWrapperRef.current?.getBoundingClientRect().top || 0),
                  width: 280,
                  transform: 'scale(1.05)',
                  opacity: 0.9,
                  boxShadow: '0 4px 8px rgba(0, 150, 255, 0.4), 0 0 16px rgba(0, 150, 255, 0.2)',
                  borderRadius: 8,
                  zIndex: 1000,
                  pointerEvents: 'none'
                }}>
                  <div
                    className="note dragging"
                    style={{ '--note-color': note.color } as React.CSSProperties}
                  >
                    <div className="note-content">{note.content}</div>
                    <div className="note-meta">
                      <span className="category-badge" style={{ color: note.color }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: note.color, display: 'inline-block' }}></span>
                        {note.category}
                      </span>
                      <span>💬 {note.comments.length}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {creatingForStatus && (
        <div className="create-note-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setCreatingForStatus(null);
        }}>
          <div className="create-note-modal">
            <div className="edit-modal-header">
              <div className="edit-modal-title">
                <span style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: COLUMNS.find(c => c.key === creatingForStatus)?.color
                }}></span>
                创建新便签 - {COLUMNS.find(c => c.key === creatingForStatus)?.title}
              </div>
              <button className="edit-modal-close" onClick={() => setCreatingForStatus(null)}>✕</button>
            </div>
            <div className="edit-modal-body">
              <div className="form-group">
                <label className="form-label">便签内容</label>
                <textarea
                  className="form-textarea"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="输入便签内容，系统将自动根据关键词分类：
• 包含「Bug/错误/问题」→ 红色
• 包含「功能/需求/特性」→ 绿色  
• 包含「优化/性能/重构」→ 黄色
• 包含「设计/UI/UX/界面」→ 紫色"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleCreateNoteSubmit();
                    }
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
                提示：按 Ctrl/Cmd + Enter 快速创建
              </div>
            </div>
            <div className="edit-modal-footer">
              <button className="btn btn-secondary" onClick={() => setCreatingForStatus(null)}>取消</button>
              <button
                className="btn btn-primary"
                onClick={handleCreateNoteSubmit}
                disabled={!newNoteContent.trim()}
              >创建</button>
            </div>
          </div>
        </div>
      )}

      {isPlaybackMode && <div className="history-overlay" />}
    </div>
  );
};

export default Board;
