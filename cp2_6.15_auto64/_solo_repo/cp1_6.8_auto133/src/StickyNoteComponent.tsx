import { useState, useRef, useCallback, useEffect } from 'react';
import type { StickyNote as StickyNoteType } from './types';
import { AnnotationService } from './AnnotationService';
import { useReaderStore } from './store';
import { Trash2, GripVertical } from 'lucide-react';

interface StickyNoteComponentProps {
  note: StickyNoteType;
  annotationService: AnnotationService;
}

export default function StickyNoteComponent({ note, annotationService }: StickyNoteComponentProps) {
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(!note.content);
  const [content, setContent] = useState(note.content);
  const [isHovered, setIsHovered] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const noteRef = useRef<HTMLDivElement>(null);
  const removeStickyNote = useReaderStore((s) => s.removeStickyNote);
  const updateStickyNote = useReaderStore((s) => s.updateStickyNote);

  useEffect(() => {
    setPosition({ x: note.x, y: note.y });
    setContent(note.content);
  }, [note.x, note.y, note.content]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return;
      e.preventDefault();
      const rect = noteRef.current?.parentElement?.getBoundingClientRect();
      if (!rect) return;
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [isEditing, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      setPosition({ x: newX, y: newY });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    annotationService.updateStickyNote(note.id, { x: position.x, y: position.y });
    updateStickyNote(note.id, { x: position.x, y: position.y });
  }, [isDragging, position, note.id, annotationService, updateStickyNote]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      setPosition({ x: newX, y: newY });
    };
    const handleUp = () => {
      setIsDragging(false);
      annotationService.updateStickyNote(note.id, { x: position.x, y: position.y });
      updateStickyNote(note.id, { x: position.x, y: position.y });
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, note.id, annotationService, updateStickyNote, position.x, position.y]);

  const handleSaveContent = useCallback(() => {
    setIsEditing(false);
    annotationService.updateStickyNote(note.id, { content });
    updateStickyNote(note.id, { content });
  }, [content, note.id, annotationService, updateStickyNote]);

  const handleDelete = useCallback(() => {
    annotationService.removeStickyNote(note.id);
    removeStickyNote(note.id);
  }, [note.id, annotationService, removeStickyNote]);

  return (
    <div
      ref={noteRef}
      className="sticky-note"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `rotate(${note.rotation}deg) ${isDragging ? 'scale(1.05)' : 'scale(1)'}`,
        zIndex: isDragging ? 1000 : 10,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="sticky-note-header" onMouseDown={handleMouseDown}>
        <GripVertical size={12} className="grip-icon" />
        {isHovered && (
          <button className="note-delete" onClick={handleDelete}>
            <Trash2 size={10} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="sticky-note-edit">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleSaveContent}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveContent();
              }
            }}
            placeholder="写下你的想法..."
            autoFocus
            className="sticky-note-textarea"
          />
        </div>
      ) : (
        <div className="sticky-note-content" onDoubleClick={() => setIsEditing(true)}>
          {content || '双击编辑...'}
        </div>
      )}

      <div className="sticky-note-fold" />
    </div>
  );
}
