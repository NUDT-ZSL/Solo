import React, { useState, useRef, useEffect } from 'react';
import { StickyNoteData } from './types';

export const NOTE_COLORS = [
  '#FFE4B5',
  '#FFB6C1',
  '#B0E0E6',
  '#98FB98',
  '#DDA0DD',
  '#87CEEB',
];

interface StickyNoteProps {
  note: StickyNoteData;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  onDragStart: (
    e: React.MouseEvent<HTMLDivElement>,
    noteId: string
  ) => void;
  onEdit: (noteId: string, content: string) => void;
  onDelete: (noteId: string) => void;
  onChangeColor: (noteId: string, color: string) => void;
  onContextMenu: (
    e: React.MouseEvent<HTMLDivElement>,
    noteId: string
  ) => void;
  autoFocus: boolean;
  onAutoFocusDone: (noteId: string) => void;
  isAnimatingDelete: boolean;
  onDeleteAnimationEnd: (noteId: string) => void;
}

const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  isDragging,
  dragOffset,
  onDragStart,
  onEdit,
  onDelete,
  onChangeColor,
  onContextMenu,
  autoFocus,
  onAutoFocusDone,
  isAnimatingDelete,
  onDeleteAnimationEnd,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && !isEditing) {
      setIsEditing(true);
      setEditContent(note.content);
      onAutoFocusDone(note.id);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 50);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging) return;
    setIsEditing(true);
    setEditContent(note.content);
  };

  const handleSaveEdit = () => {
    if (isEditing) {
      setIsEditing(false);
      if (editContent !== note.content) {
        onEdit(note.id, editContent);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditing || e.button !== 0) return;
    e.stopPropagation();
    onDragStart(e, note.id);
  };

  const handleContextMenuEv = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEditing) return;
    onContextMenu(e, note.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(note.id);
  };

  const left = isDragging ? note.x + dragOffset.x : note.x;
  const top = isDragging ? note.y + dragOffset.y : note.y;

  const noteBaseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: '200px',
    height: '200px',
    backgroundColor: isEditing ? '#FFFFFF' : note.color,
    borderRadius: '4px',
    boxShadow: isDragging
      ? '0 12px 24px rgba(0,0,0,0.3)'
      : '0 4px 6px rgba(0,0,0,0.1)',
    padding: '16px',
    paddingTop: '28px',
    boxSizing: 'border-box',
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 1000 : 1,
    willChange: isDragging ? 'left, top, opacity' : 'auto',
  };

  let className = 'sticky-note';
  if (isDragging) className += ' dragging';
  if (isAnimatingDelete) className += ' deleting';

  const handleTransitionEnd = () => {
    if (isAnimatingDelete) {
      onDeleteAnimationEnd(note.id);
    }
  };

  return (
    <>
      {isDragging && (
        <div
          className="sticky-placeholder"
          style={{
            position: 'absolute',
            left: `${note.x}px`,
            top: `${note.y}px`,
            width: '200px',
            height: '200px',
            border: '2px dashed rgba(100, 100, 100, 0.5)',
            borderRadius: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      <div
        className={className}
        style={noteBaseStyle}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenuEv}
        onTransitionEnd={handleTransitionEnd}
      >
        <button
          onClick={handleDeleteClick}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#FF5252',
            border: 'none',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            transition: 'background-color 0.2s',
            padding: 0,
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#D32F2F';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FF5252';
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          ×
        </button>

        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '160px',
              border: 'none',
              outline: 'none',
              resize: 'none',
              backgroundColor: '#FFFFFF',
              color: '#333',
              fontSize: '16px',
              lineHeight: 1.5,
              fontFamily: 'inherit',
              overflowY: 'auto',
              padding: 0,
            }}
            placeholder="输入便签内容..."
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '160px',
              overflowY: 'auto',
              color: '#333',
              fontSize: '16px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {note.content || <span style={{ opacity: 0.4 }}>双击编辑...</span>}
          </div>
        )}

        {showDeleteConfirm && (
          <>
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 300,
              }}
              onClick={() => setShowDeleteConfirm(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                minWidth: '200px',
                zIndex: 301,
                textAlign: 'center',
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: '16px', fontSize: '14px', color: '#333' }}>
                是否删除此便签？
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '6px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  style={{
                    padding: '6px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#FF5252',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .sticky-note {
          opacity: 0;
          transform: scale(0);
          transform-origin: center center;
          animation: scaleIn 0.2s ease forwards;
          transition: box-shadow 0.2s ease, opacity 0.25s ease, transform 0.25s ease, background-color 0.2s;
        }

        .sticky-note.dragging {
          animation: none;
          opacity: 0.7 !important;
          transition: none;
          transform: none;
        }

        .sticky-note.deleting {
          animation: none !important;
          opacity: 0 !important;
          transform: scale(0.5) !important;
          transition: opacity 0.25s ease, transform 0.25s ease !important;
        }

        .sticky-placeholder {
          animation: none;
        }

        textarea::-webkit-scrollbar,
        div::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        textarea::-webkit-scrollbar-track,
        div::-webkit-scrollbar-track {
          background: #D3D3D3;
          border-radius: 4px;
        }
        textarea::-webkit-scrollbar-thumb,
        div::-webkit-scrollbar-thumb {
          background: #A9A9A9;
          border-radius: 4px;
        }
        textarea::-webkit-scrollbar-thumb:hover,
        div::-webkit-scrollbar-thumb:hover {
          background: #808080;
        }
      `}</style>
    </>
  );
};

export default StickyNote;
