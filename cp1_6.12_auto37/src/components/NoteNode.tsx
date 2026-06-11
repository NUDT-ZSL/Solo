import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface NoteData {
  text: string;
  image?: string;
}

const NoteNode: React.FC<NodeProps<NoteData>> = ({ data, selected, id }) => {
  const [text, setText] = useState(data.text || '');
  const [image, setImage] = useState<string | undefined>(data.image);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState({ width: 200, height: 150 });
  const [isNew, setIsNew] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsNew(false), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1440px)');
    if (mediaQuery.matches) {
      setSize((prev) => ({ ...prev, width: 240 }));
    }
  }, []);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    data.text = text;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, 500);
    setText(value);
    data.text = value;
  };

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!isEditing) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const result = event.target?.result as string;
              setImage(result);
              data.image = result;
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    },
    [isEditing, data]
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      setSize({
        width: Math.max(120, startWidth + deltaX),
        height: Math.max(80, startHeight + deltaY),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const nodeStyle: React.CSSProperties = {
    width: size.width,
    height: size.height,
    backgroundColor: '#FFF9C4',
    borderRadius: '8px',
    padding: '12px',
    boxSizing: 'border-box',
    position: 'relative',
    boxShadow: isDragging || isResizing
      ? '0 4px 12px rgba(0,0,0,0.15)'
      : '0 2px 4px rgba(0,0,0,0.1)',
    transform: isNew ? 'scale(0.8)' : 'scale(1)',
    transition: isNew ? 'transform 0.2s ease-out' : 'box-shadow 0.2s',
    border: selected ? '2px solid #4ECDC4' : '2px solid transparent',
    overflow: 'hidden',
    cursor: isEditing ? 'text' : 'grab',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    height: image ? '40%' : '100%',
    border: 'none',
    outline: 'none',
    resize: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: '#333',
    lineHeight: '1.4',
    padding: 0,
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    maxHeight: '60%',
    objectFit: 'contain',
    borderRadius: '4px',
    marginTop: '8px',
  };

  const resizeHandleStyle: React.CSSProperties = {
    position: 'absolute',
    right: '4px',
    bottom: '4px',
    width: '12px',
    height: '12px',
    cursor: 'se-resize',
    background:
      'linear-gradient(135deg, transparent 50%, #ccc 50%, #ccc 60%, transparent 60%, transparent 70%, #ccc 70%, #ccc 80%, transparent 80%)',
    opacity: selected ? 1 : 0,
    transition: 'opacity 0.2s',
  };

  return (
    <div
      ref={nodeRef}
      style={nodeStyle}
      onDoubleClick={handleDoubleClick}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#90CAF9', width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#90CAF9', width: 10, height: 10 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#90CAF9', width: 10, height: 10 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#90CAF9', width: 10, height: 10 }}
      />

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          style={textareaStyle}
          placeholder="输入便签内容..."
          maxLength={500}
        />
      ) : (
        <div
          style={{
            fontSize: '14px',
            color: '#333',
            lineHeight: '1.4',
            wordBreak: 'break-word',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            height: image ? '40%' : '100%',
          }}
        >
          {text || <span style={{ color: '#999' }}>双击编辑...</span>}
        </div>
      )}

      {image && <img src={image} alt="便签图片" style={imageStyle} />}

      <div style={resizeHandleStyle} onMouseDown={handleResizeStart} />
    </div>
  );
};

export default NoteNode;
