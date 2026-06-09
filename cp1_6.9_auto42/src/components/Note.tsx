import React, { useState, useRef, useEffect } from 'react';
import { Note as NoteType, Comment, NoteStatus } from '../types';

interface NoteProps {
  note: NoteType;
  isDragging: boolean;
  isDropTarget?: boolean;
  onDragStart: (noteId: string, e: React.MouseEvent) => void;
  onDragMove: (e: MouseEvent) => void;
  onDragEnd: (status: NoteStatus) => void;
  onDoubleClick: (note: NoteType) => void;
  onDelete: (noteId: string) => void;
  onUpdate: (noteId: string, content?: string, comments?: Comment[]) => void;
  currentUser: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  feature: '功能',
  optimization: '优化',
  design: '设计',
  default: '通用'
};

const Note: React.FC<NoteProps> = ({
  note,
  isDragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDoubleClick,
  onDelete,
  onUpdate,
  currentUser
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [newComment, setNewComment] = useState('');
  const [showDropAnimation, setShowDropAnimation] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDragMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        window.removeEventListener('mousemove', onDragMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, onDragMove]);

  useEffect(() => {
    if (isEditing) {
      setEditContent(note.content);
    }
  }, [isEditing, note.content]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.note-actions')) return;
    if ((e.target as HTMLElement).closest('textarea') || (e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    onDragStart(note.id, e);
  };

  const handleGlobalMouseUp = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const column = target.closest('[data-column-status]');
    const status = column?.getAttribute('data-column-status') as NoteStatus || note.status;
    onDragEnd(status);
    setShowDropAnimation(true);
    setTimeout(() => setShowDropAnimation(false), 300);
  };

  const handleDoubleClick = () => {
    if (!isDragging) {
      onDoubleClick(note);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    onUpdate(note.id, editContent);
    setIsEditing(false);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || newComment.length > 200) return;
    const comment: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: newComment.trim(),
      createdAt: Date.now(),
      author: currentUser
    };
    const updatedComments = [...note.comments, comment];
    onUpdate(note.id, undefined, updatedComments);
    setNewComment('');
  };

  const handleCloseModal = () => {
    setIsEditing(false);
    onDoubleClick(note);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const noteClasses = [
    'note',
    isDragging ? 'dragging' : '',
    showDropAnimation ? 'drop-animation' : ''
  ].filter(Boolean).join(' ');

  return (
    <>
      <div
        ref={noteRef}
        className={noteClasses}
        style={{ '--note-color': note.color } as React.CSSProperties}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <div className="note-actions">
          <button
            className="note-action-btn"
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            title="编辑"
          >
            ✎
          </button>
          <button
            className="note-action-btn delete"
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            title="删除"
          >
            ✕
          </button>
        </div>

        <div className="note-content">{note.content}</div>

        <div className="note-meta">
          <span className="category-badge" style={{ color: note.color }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: note.color, display: 'inline-block' }}></span>
            {CATEGORY_LABELS[note.category]}
          </span>
          <span className="note-comments-count">
            💬 {note.comments.length}
          </span>
        </div>
      </div>

      {isEditing && (
        <div className="edit-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) handleCloseModal();
        }}>
          <div className="edit-modal" ref={modalRef}>
            <div className="edit-modal-header">
              <div className="edit-modal-title">
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: note.color }}></span>
                编辑便签
              </div>
              <button className="edit-modal-close" onClick={handleCloseModal}>✕</button>
            </div>

            <div className="edit-modal-body">
              <div className="form-group">
                <label className="form-label">便签内容</label>
                <textarea
                  className="form-textarea"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="输入便签内容..."
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">评论</label>
                <div className="comments-section">
                  {note.comments.length > 0 ? (
                    <div className="comments-list">
                      {note.comments.map((c) => (
                        <div key={c.id} className="comment-item">
                          <div>{c.text}</div>
                          <div className="comment-meta">
                            {c.author} · {formatTime(c.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '12px 0', fontSize: 13, color: '#999' }}>暂无评论</div>
                  )}
                  <div className="add-comment-row">
                    <textarea
                      className="form-textarea small"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value.slice(0, 200))}
                      placeholder="添加评论（最多200字）..."
                      style={{ minHeight: 44, flex: 1 }}
                    />
                    <button className="add-comment-btn" onClick={handleAddComment}>发送</button>
                  </div>
                  <div className="char-count">{newComment.length}/200</div>
                </div>
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseModal}>取消</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Note;
