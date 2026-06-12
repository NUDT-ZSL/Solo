import { useState, useRef, useEffect } from 'react';
import type { Dialog } from '../types';

interface DialogBubbleProps {
  dialog: Dialog;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: (text: string) => void;
  onDragStart: (e: React.MouseEvent) => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: () => void;
  onCharacterDrop: (character: string, color: string) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
}

export default function DialogBubble({
  dialog,
  isEditing,
  onEditStart,
  onEditEnd,
  onDragStart,
  onDrag,
  onDragEnd,
  onCharacterDrop,
  isDragging = false,
  isDropTarget = false
}: DialogBubbleProps) {
  const [editText, setEditText] = useState(dialog.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditText(dialog.text);
  }, [dialog.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing && !isDragging) {
      onEditStart();
    }
  };

  const handleBlur = () => {
    onEditEnd(editText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onEditEnd(editText);
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) return;
    onDragStart(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const bubble = bubbleRef.current;
    if (!bubble) return;
    const rect = bubble.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - 16;
    const y = e.clientY - rect.top - 16;
    onDrag(x, y);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      onDragEnd();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const character = e.dataTransfer.getData('character');
    const color = e.dataTransfer.getData('color');
    if (character && color) {
      onCharacterDrop(character, color);
    }
  };

  const initials = dialog.character ? dialog.character.charAt(0) : '?';

  return (
    <div
      ref={bubbleRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        position: 'absolute',
        left: dialog.x,
        top: dialog.y,
        minWidth: 100,
        maxWidth: 250,
        minHeight: 40,
        maxHeight: 120,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderRadius: 8,
        padding: '8px 12px 8px 44px',
        boxShadow: isDragging
          ? '0 6px 20px rgba(0,0,0,0.25)'
          : '0 2px 8px rgba(0,0,0,0.1)',
        cursor: isEditing ? 'text' : 'move',
        transition: isDragging ? 'none' : 'all 0.2s ease',
        transform: isDropTarget ? 'scale(1.2)' : 'scale(1)',
        zIndex: isDragging || isEditing ? 100 : 10,
        userSelect: isEditing ? 'text' : 'none',
        overflow: 'hidden'
      }}
      onClick={handleClick}
    >
      <div
        onMouseDown={handleDragStart}
        style={{
          position: 'absolute',
          left: 8,
          top: 8,
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: dialog.characterColor || '#999',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: 14,
          fontWeight: 'bold',
          cursor: 'grab'
        }}
        title={dialog.character || '未分配角色'}
      >
        {initials}
      </div>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value.slice(0, 200))}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          maxLength={200}
          style={{
            width: '100%',
            height: 'auto',
            minHeight: 24,
            maxHeight: 100,
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: 14,
            lineHeight: 1.6,
            backgroundColor: 'transparent',
            fontFamily: 'inherit',
            color: '#333'
          }}
        />
      ) : (
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: '#333',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap'
          }}
        >
          {dialog.text || '点击编辑对白...'}
        </p>
      )}

      {!isEditing && dialog.text && dialog.text.length > 0 && (
        <span
          style={{
            position: 'absolute',
            bottom: 4,
            right: 8,
            fontSize: 10,
            color: '#999'
          }}
        >
          {dialog.text.length}/200
        </span>
      )}
    </div>
  );
}
