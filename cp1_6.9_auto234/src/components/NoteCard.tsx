import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Note, TrashNote } from '../types';
import { formatRelativeTime, getSummary, getTagColor } from '../utils';

interface NoteCardProps {
  note: Note | TrashNote;
  onDelete?: (note: Note) => void;
  onTagClick?: (tag: string) => void;
  onRestore?: (note: TrashNote) => void;
  onPermanentDelete?: (note: TrashNote) => void;
  isTrash?: boolean;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onDelete,
  onTagClick,
  onRestore,
  onPermanentDelete,
  isTrash = false
}) => {
  const navigate = useNavigate();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = useCallback(() => {
    if (isTrash) return;
    navigate(`/note/${note.id}`);
  }, [navigate, note.id, isTrash]);

  const startLongPress = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowConfirm(true);
    }, 600);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  }, []);

  const confirmDelete = useCallback(() => {
    setShowConfirm(false);
    if (isTrash) {
      onPermanentDelete && onPermanentDelete(note as TrashNote);
    } else {
      onDelete && onDelete(note as Note);
    }
  }, [onDelete, onPermanentDelete, isTrash, note]);

  return (
    <>
      <div
        className={`note-card ${isTrash ? 'note-card-trash' : ''}`}
        onClick={!showConfirm ? handleClick : undefined}
        onMouseDown={!isTrash ? startLongPress : undefined}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onContextMenu={handleContextMenu}
        onTouchStart={!isTrash ? startLongPress : undefined}
        onTouchEnd={cancelLongPress}
      >
        {note.tags && note.tags.length > 0 && (
          <div className="card-tags">
            {note.tags.slice(0, 3).map(tag => {
              const colors = getTagColor(tag);
              return (
                <span
                  key={tag}
                  className="card-tag"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isTrash && onTagClick) onTagClick(tag);
                  }}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}

        <h3 className="card-title">{note.title || '无标题笔记'}</h3>
        <p className="card-summary">{getSummary(note.content)}</p>
        <div className="card-footer">
          <span className="card-time">
            {formatRelativeTime(isTrash ? (note as TrashNote).deletedAt : note.updatedAt)}
          </span>
          {isTrash && (
            <button
              className="restore-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRestore && onRestore(note as TrashNote);
              }}
            >
              恢复
            </button>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h4>{isTrash ? '永久删除？' : '删除笔记？'}</h4>
            <p>
              {isTrash
                ? '此操作不可恢复，将永久删除该笔记。'
                : '笔记将被移至回收站，可在30天内恢复。'}
            </p>
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => setShowConfirm(false)}>
                取消
              </button>
              <button
                className={`confirm-ok ${isTrash ? 'confirm-danger' : ''}`}
                onClick={confirmDelete}
              >
                {isTrash ? '永久删除' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NoteCard;
