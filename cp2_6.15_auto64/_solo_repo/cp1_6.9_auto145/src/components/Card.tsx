import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Card as CardType } from '../hooks/useWebSocket';

interface CardProps {
  card: CardType;
  selected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, changes: Partial<CardType>) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onResizeStart: (id: string, e: React.MouseEvent) => void;
  onConnectionStart: (id: string, e: React.MouseEvent) => void;
  isDragTarget: boolean;
  scale: number;
  autoLayoutAnimating: boolean;
  animatedPos: { x: number; y: number } | null;
}

const Card: React.FC<CardProps> = ({
  card,
  selected,
  onSelect,
  onUpdate,
  onDelete,
  onDragStart,
  onResizeStart,
  onConnectionStart,
  isDragTarget,
  scale,
  autoLayoutAnimating,
  animatedPos,
}) => {
  const titleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const displayX = animatedPos ? animatedPos.x : card.x;
  const displayY = animatedPos ? animatedPos.y : card.y;

  const emitUpdate = useCallback(
    (changes: Partial<CardType>) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        onUpdate(card.id, changes);
      }, 150);
    },
    [card.id, onUpdate]
  );

  const handleTitleInput = useCallback(() => {
    if (!titleRef.current) return;
    emitUpdate({ title: titleRef.current.innerText });
  }, [emitUpdate]);

  const handleContentInput = useCallback(() => {
    if (!contentRef.current) return;
    emitUpdate({ content: contentRef.current.innerText });
  }, [emitUpdate]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const handleMouseDownTitle = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.shiftKey) {
      onConnectionStart(card.id, e);
      return;
    }
    onSelect(card.id);
    onDragStart(card.id, e);
  };

  const handleCardMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) onSelect(card.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(card.id);
  };

  const borderColor = selected
    ? `2px solid rgba(255,255,255,0.9)`
    : `0.5px solid rgba(255,255,255,0.25)`;

  const shadow = hovered
    ? '0 16px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)'
    : '0 6px 18px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.25)';

  const translateY = hovered && !autoLayoutAnimating ? 'translateY(-3px)' : 'translateY(0)';

  const colorToRgba = (color: string, alpha: number): string => {
    if (color.startsWith('rgb')) {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
      }
      return color;
    }
    const h = color.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const bgColor = card.sentiment === 0
    ? `rgba(170, 170, 170, 0.45)`
    : colorToRgba(card.color, card.sentiment > 0 ? 0.55 : 0.5);

  const glowColor = card.sentiment === 0
    ? 'rgba(204,204,204,0)'
    : colorToRgba(card.color, 0.25);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={handleContextMenu}
      onMouseDown={handleCardMouseDown}
      style={{
        position: 'absolute',
        left: displayX,
        top: displayY,
        width: card.width,
        height: card.height,
        borderRadius: 12,
        overflow: 'hidden',
        border: borderColor,
        boxShadow: hovered
          ? `0 18px 48px ${glowColor}, 0 14px 36px rgba(0,0,0,0.45), 0 5px 15px rgba(0,0,0,0.3)`
          : `0 10px 28px ${glowColor}, 0 6px 18px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.25)`,
        transform: translateY,
        transition: autoLayoutAnimating
          ? 'left 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.28s ease, transform 0.28s ease, border-color 0.2s ease, background-color 0.3s ease'
          : 'box-shadow 0.28s ease, transform 0.28s ease, border-color 0.2s ease, background-color 0.3s ease',
        backgroundColor: bgColor,
        outline: isDragTarget ? '3px dashed rgba(155, 89, 182, 0.9)' : 'none',
        outlineOffset: isDragTarget ? '3px' : '0',
        userSelect: 'none',
        zIndex: selected ? 100 : hovered ? 50 : 1,
      }}
    >
      {/* 顶部连接锚点 */}
      <div
        style={{
          position: 'absolute',
          top: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: card.color,
          border: '2px solid rgba(255,255,255,0.8)',
          opacity: hovered || selected ? 1 : 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: 'none',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        }}
      />
      {/* 底部连接锚点 */}
      <div
        style={{
          position: 'absolute',
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: card.color,
          border: '2px solid rgba(255,255,255,0.8)',
          opacity: hovered || selected ? 1 : 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: 'none',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        }}
      />

      {/* 标题栏（毛玻璃效果） */}
      <div
        onMouseDown={handleMouseDownTitle}
        style={{
          height: 40,
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: `rgba(26, 26, 46, 0.65)`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '0.5px solid rgba(255,255,255,0.12)',
          cursor: 'grab',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: card.color,
            marginRight: 10,
            flexShrink: 0,
            boxShadow: `0 0 8px ${card.color}`,
          }}
        />
        <div
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleTitleInput}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            fontSize: 14 / scale,
            fontWeight: 600,
            color: '#FFFFFF',
            outline: 'none',
            minHeight: 18,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.3,
          }}
          data-placeholder="标题..."
        >
          {card.title}
        </div>
      </div>

      {/* 内容区域（白色半透明） */}
      <div
        style={{
          flex: 1,
          height: `calc(100% - 40px)`,
          padding: '10px 14px 20px 14px',
          backgroundColor: 'rgba(255, 255, 255, 0.56)',
          position: 'relative',
        }}
      >
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentInput}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            height: '100%',
            fontSize: 13 / scale,
            lineHeight: 1.55,
            color: '#1A1A2E',
            outline: 'none',
            fontWeight: 500,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
          data-placeholder="在这里写下你的灵感..."
        >
          {card.content}
        </div>

        {/* 调整大小手柄 */}
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(card.id, e);
          }}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 18,
            height: 18,
            cursor: 'se-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hovered || selected ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M10 2 L10 10 L2 10" stroke="rgba(26,26,46,0.55)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M6 10 L10 6" stroke="rgba(26,26,46,0.55)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Card;
