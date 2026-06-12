import React, { useRef, useEffect, useCallback } from 'react';
import { NoteCard, GRID_SIZE, CATEGORY_COLORS } from './types';
import Card from './Card';
import { getGroupMembers, getBoundingBox } from './utils';

interface CanvasProps {
  cards: NoteCard[];
  scale: number;
  offset: { x: number; y: number };
  onScaleChange: (scale: number, offset: { x: number; y: number }) => void;
  onOffsetChange: (offset: { x: number; y: number }) => void;
  onCardMove: (cardId: string, x: number, y: number, linkedIds?: string[]) => void;
  onCardDelete: (cardId: string) => void;
  searchKeyword: string;
  matchedCardIds: Set<string>;
  onCardsLinked: (cardId1: string, cardId2: string) => void;
}

const Canvas: React.FC<CanvasProps> = ({
  cards,
  scale,
  offset,
  onScaleChange,
  onOffsetChange,
  onCardMove,
  onCardDelete,
  searchKeyword,
  matchedCardIds,
  onCardsLinked,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const isPanningRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const pendingOffsetRef = useRef<{ x: number; y: number } | null>(null);

  const drawGrid = useCallback(() => {
    const canvas = gridCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const adjustedGridSize = GRID_SIZE / scale;
    const startX = -offset.x % adjustedGridSize;
    const startY = -offset.y % adjustedGridSize;

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1 / scale;

    for (let x = startX; x < rect.width; x += adjustedGridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }

    for (let y = startY; y < rect.height; y += adjustedGridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }
  }, [scale, offset]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - offset.x) / scale;
    const worldY = (mouseY - offset.y) / scale;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.5), 3);

    const newOffsetX = mouseX - worldX * newScale;
    const newOffsetY = mouseY - worldY * newScale;

    onScaleChange(newScale, { x: newOffsetX, y: newOffsetY });
  }, [scale, offset, onScaleChange]);

  const applyOffsetUpdate = useCallback(() => {
    if (pendingOffsetRef.current) {
      onOffsetChange(pendingOffsetRef.current);
      pendingOffsetRef.current = null;
    }
    animationFrameRef.current = null;
  }, [onOffsetChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanningRef.current) return;

    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;

    pendingOffsetRef.current = {
      x: offset.x + dx,
      y: offset.y + dy,
    };

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(applyOffsetUpdate);
    }
  }, [offset, applyOffsetUpdate]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) {
      e.preventDefault();
      isPanningRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      if (containerRef.current) {
        containerRef.current.classList.add('panning');
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    if (containerRef.current) {
      containerRef.current.classList.remove('panning');
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (pendingOffsetRef.current) {
      onOffsetChange(pendingOffsetRef.current);
      pendingOffsetRef.current = null;
    }
  }, [onOffsetChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressedRef.current) {
        isSpacePressedRef.current = true;
        if (containerRef.current) {
          containerRef.current.style.cursor = 'grab';
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        if (containerRef.current && !isPanningRef.current) {
          containerRef.current.style.cursor = 'default';
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    const handleResize = () => drawGrid();
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp, drawGrid]);

  const handleCardDragEnd = useCallback((cardId: string, finalX: number, finalY: number) => {
    const groupMembers = getGroupMembers(cardId, cards);
    const originalBox = getBoundingBox(groupMembers);
    
    const draggedCard = cards.find(c => c.id === cardId);
    if (!draggedCard) return;

    const dx = finalX - draggedCard.x;
    const dy = finalY - draggedCard.y;

    for (const member of groupMembers) {
      const newX = member.x + dx;
      const newY = member.y + dy;
      onCardMove(member.id, newX, newY);
    }
  }, [cards, onCardMove]);

  const renderConnections = () => {
    const lines: JSX.Element[] = [];
    const processed = new Set<string>();

    for (const card of cards) {
      for (const linkedId of card.linkedIds) {
        const key = [card.id, linkedId].sort().join('-');
        if (processed.has(key)) continue;
        processed.add(key);

        const linkedCard = cards.find(c => c.id === linkedId);
        if (!linkedCard) continue;

        const x1 = card.x + 110;
        const y1 = card.y + 60;
        const x2 = linkedCard.x + 110;
        const y2 = linkedCard.y + 60;

        const isHorizontal = Math.abs(x1 - x2) > Math.abs(y1 - y2);
        let lineX, lineY, lineWidth, lineHeight;

        if (isHorizontal) {
          lineX = Math.min(x1, x2);
          lineY = (y1 + y2) / 2 - 1;
          lineWidth = Math.abs(x1 - x2);
          lineHeight = 2;
        } else {
          lineX = (x1 + x2) / 2 - 1;
          lineY = Math.min(y1, y2);
          lineWidth = 2;
          lineHeight = Math.abs(y1 - y2);
        }

        const lineColor = CATEGORY_COLORS[card.category] || '#999';

        lines.push(
          <div
            key={key}
            className="connection-line"
            style={{
              left: lineX,
              top: lineY,
              width: lineWidth,
              height: lineHeight,
              background: `repeating-linear-gradient(${isHorizontal ? '90deg' : '0deg'}, ${lineColor} 0, ${lineColor} 6px, transparent 6px, transparent 10px)`,
            }}
          />
        );
      }
    }

    return lines;
  };

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onMouseDown={handleMouseDown}
    >
      <canvas
        ref={gridCanvasRef}
        className="canvas-grid"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      />
      <div
        className="canvas-content"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        }}
      >
        {renderConnections()}
        {cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            allCards={cards}
            onDragEnd={handleCardDragEnd}
            onDelete={onCardDelete}
            searchKeyword={searchKeyword}
            isMatched={matchedCardIds.has(card.id)}
            onLink={onCardsLinked}
          />
        ))}
      </div>
    </div>
  );
};

export default Canvas;
