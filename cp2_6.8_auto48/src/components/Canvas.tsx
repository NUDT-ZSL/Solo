import React, { useRef, useCallback } from 'react';
import { CardElement, CANVAS_WIDTH, CANVAS_HEIGHT, Template } from '@/types';
import { Mail, Phone, Globe, Linkedin, Twitter, Instagram, User } from 'lucide-react';

interface CanvasProps {
  elements: CardElement[];
  backgroundColor: string;
  fontSize: number;
  margin: number;
  activeTemplate: Template;
  isFading: boolean;
  onElementPositionChange: (id: string, x: number, y: number) => void;
}

const Canvas: React.FC<CanvasProps> = ({
  elements,
  backgroundColor,
  fontSize,
  margin,
  activeTemplate,
  isFading,
  onElementPositionChange,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    id: string | null;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
  }>({
    id: null,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, element: CardElement) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      dragStateRef.current = {
        id: element.id,
        offsetX: e.clientX - rect.left - element.x,
        offsetY: e.clientY - rect.top - element.y,
        startX: e.clientX,
        startY: e.clientY,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragStateRef.current.id || !canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        let newX = moveEvent.clientX - canvasRect.left - dragStateRef.current.offsetX;
        let newY = moveEvent.clientY - canvasRect.top - dragStateRef.current.offsetY;

        const targetEl = elements.find((el) => el.id === dragStateRef.current.id);
        if (targetEl) {
          newX = Math.max(0, Math.min(newX, CANVAS_WIDTH - targetEl.width));
          newY = Math.max(0, Math.min(newY, CANVAS_HEIGHT - targetEl.height));
        }

        onElementPositionChange(dragStateRef.current.id, newX, newY);
      };

      const handleMouseUp = () => {
        if (dragStateRef.current.id) {
          const el = elements.find((e) => e.id === dragStateRef.current.id);
          if (el) {
            console.log(`元素 [${el.type}] 新位置: x=${Math.round(el.x)}, y=${Math.round(el.y)}`);
          }
        }
        dragStateRef.current = { id: null, offsetX: 0, offsetY: 0, startX: 0, startY: 0 };
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [elements, onElementPositionChange],
  );

  const renderElementContent = (element: CardElement) => {
    const textColor = activeTemplate.textColor;
    const baseSize = fontSize;

    switch (element.type) {
      case 'avatar':
        return (
          <div
            style={{
              width: element.width,
              height: element.height,
              borderRadius: '50%',
              backgroundColor: '#BDBDBD',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <User size={element.width * 0.4} />
          </div>
        );
      case 'name':
        return (
          <div
            style={{
              fontFamily: '"SimHei", "Microsoft YaHei", sans-serif',
              fontSize: Math.max(baseSize, 20),
              fontWeight: 700,
              color: textColor,
              whiteSpace: 'nowrap',
            }}
          >
            {element.content}
          </div>
        );
      case 'position':
        return (
          <div
            style={{
              fontSize: Math.max(baseSize * 0.5, 14),
              color: textColor,
              opacity: 0.7,
              whiteSpace: 'nowrap',
            }}
          >
            {element.content}
          </div>
        );
      case 'contact':
        return (
          <div
            style={{
              fontSize: Math.max(baseSize * 0.43, 12),
              color: textColor,
              opacity: 0.7,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={14} /> {element.content.split('|')[0]}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={14} /> {element.content.split('|')[1]}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={14} /> {element.content.split('|')[2]}
            </div>
          </div>
        );
      case 'social':
        return (
          <div style={{ display: 'flex', gap: 12, color: activeTemplate.accentColor }}>
            <Linkedin size={20} style={{ cursor: 'pointer' }} />
            <Twitter size={20} style={{ cursor: 'pointer' }} />
            <Instagram size={20} style={{ cursor: 'pointer' }} />
            <Globe size={20} style={{ cursor: 'pointer' }} />
          </div>
        );
      case 'bio':
        return (
          <div
            style={{
              fontSize: Math.max(baseSize * 0.5, 14),
              color: textColor,
              lineHeight: 1.6,
              maxWidth: element.width,
            }}
          >
            {element.content}
          </div>
        );
      default:
        return null;
    }
  };

  const bgStyle = backgroundColor.includes('gradient')
    ? { backgroundImage: backgroundColor }
    : { backgroundColor };

  return (
    <div className="canvas-wrapper">
      <div
        id="card-canvas"
        ref={canvasRef}
        className={`card-canvas ${isFading ? 'fading' : ''}`}
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          position: 'relative',
          ...bgStyle,
          padding: margin,
          boxSizing: 'border-box',
        }}
      >
        {elements.map((element) => (
          <div
            key={element.id}
            className="card-element"
            onMouseDown={(e) => handleMouseDown(e, element)}
            style={{
              position: 'absolute',
              left: element.x,
              top: element.y,
              width: element.width,
              height: element.height,
              cursor: 'grab',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              transition: isFading ? 'none' : undefined,
            }}
          >
            {renderElementContent(element)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Canvas;
