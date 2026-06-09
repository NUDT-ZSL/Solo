import React, { useRef, useState, useEffect } from 'react';
import { usePoem } from '../App';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CARD_WIDTH,
  CARD_HEIGHT,
  renderSilkLine,
  getCardEmotionBg,
  Card
} from '../PoemEngine';

interface SilkLineData {
  path: string;
  color: string;
  key: string;
  fromWord: string;
  toWord: string;
  flashing: boolean;
}

const WordCard: React.FC<{
  card: Card;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  style?: React.CSSProperties;
}> = ({ card, isDragging, onMouseDown, onDoubleClick, style }) => {
  const cardBg = getCardEmotionBg(card.hue);
  const borderColor = `hsla(${card.hue}, 80%, 65%, 0.5)`;

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: card.x,
    top: card.y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    background: cardBg,
    border: `1.5px solid ${borderColor}`,
    backdropFilter: 'blur(6px)',
    boxShadow: isDragging
      ? `0 20px 50px hsla(${card.hue}, 80%, 50%, 0.4), 0 0 30px hsla(${card.hue}, 80%, 60%, 0.2)`
      : `0 6px 18px rgba(0,0,0,0.4), 0 0 12px hsla(${card.hue}, 80%, 60%, 0.1)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 500,
    letterSpacing: 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    zIndex: isDragging ? 100 : 10,
    transition: isDragging
      ? 'box-shadow 0.2s ease'
      : 'box-shadow 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
    animation: 'flyIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
    ...style
  };

  return (
    <div
      style={cardStyle}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      title={`${card.word} (双击删除)`}
    >
      <span
        style={{
          textShadow: `0 0 8px hsla(${card.hue}, 80%, 60%, 0.5), 0 2px 4px rgba(0,0,0,0.3)`
        }}
      >
        {card.word}
      </span>
    </div>
  );
};

const Canvas: React.FC = () => {
  const { cards, connections, addCard, removeCard, moveCard, flashingConnections } = usePoem();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleCardMouseDown = (e: React.MouseEvent, card: Card) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    dragOffsetRef.current = {
      x: (e.clientX - rect.left) * scaleX - card.x,
      y: (e.clientY - rect.top) * scaleY - card.y
    };
    setDraggingId(card.id);
  };

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const newX = (e.clientX - rect.left) * scaleX - dragOffsetRef.current.x;
      const newY = (e.clientY - rect.top) * scaleY - dragOffsetRef.current.y;
      pendingPosRef.current = { x: newX, y: newY };

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          if (pendingPosRef.current && draggingId) {
            moveCard(draggingId, pendingPosRef.current.x, pendingPosRef.current.y, false);
          }
          rafRef.current = null;
        });
      }
    };

    const handleMouseUp = () => {
      if (pendingPosRef.current && draggingId) {
        moveCard(draggingId, pendingPosRef.current.x, pendingPosRef.current.y, true);
      }
      setDraggingId(null);
      pendingPosRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, moveCard]);

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const word = e.dataTransfer.getData('text/word');
    if (!word) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX - CARD_WIDTH / 2;
    const y = (e.clientY - rect.top) * scaleY - CARD_HEIGHT / 2;
    addCard(word, x, y);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const cardById = new Map(cards.map((c) => [c.id, c]));
  const silkLines: SilkLineData[] = connections.map((conn) => {
    const fromCard = cardById.get(conn.from);
    const toCard = cardById.get(conn.to);
    if (!fromCard || !toCard) return null;
    const key1 = `${conn.from}-${conn.to}`;
    const key2 = `${conn.to}-${conn.from}`;
    const isFlashing = flashingConnections.has(key1) || flashingConnections.has(key2);
    const silk = renderSilkLine(fromCard, toCard, isFlashing ? 1.2 : 1);
    return {
      path: silk.path,
      color: silk.color,
      key: key1,
      fromWord: fromCard.word,
      toWord: toCard.word,
      flashing: isFlashing
    };
  }).filter(Boolean) as SilkLineData[];

  const canvasContainerStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minWidth: 0
  };

  const canvasWrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    maxWidth: '100%',
    maxHeight: '100%',
    aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'radial-gradient(ellipse at center, rgba(30,30,80,0.6) 0%, rgba(10,10,46,0.4) 100%)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 0 80px rgba(100,100,200,0.05)',
    overflow: 'hidden'
  };

  const innerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transformOrigin: 'top left'
  };

  const hoverTooltipStyle = (visible: boolean, fromWord: string, toWord: string): React.CSSProperties => ({
    position: 'absolute',
    zIndex: 1000,
    padding: '6px 12px',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.85)',
    color: '#fff',
    fontSize: 12,
    pointerEvents: 'none',
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.2s',
    whiteSpace: 'nowrap'
  });

  const [hoveredLine, setHoveredLine] = useState<SilkLineData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  return (
    <div style={canvasContainerStyle}>
      <div style={canvasWrapperStyle} ref={canvasRef} onDrop={handleCanvasDrop} onDragOver={handleDragOver}>
        <div style={innerStyle}>
          <svg
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            <defs>
              <filter id="silkGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {silkLines.map((silk) => (
              <path
                key={silk.key}
                d={silk.path}
                stroke={silk.color}
                strokeWidth={silk.flashing ? 4 : 2.5}
                fill="none"
                strokeLinecap="round"
                filter="url(#silkGlow)"
                style={{
                  pointerEvents: 'stroke',
                  cursor: 'pointer',
                  transition: 'all 1s ease',
                  opacity: silk.flashing ? 1 : 0.85
                }}
                onMouseEnter={(e) => {
                  setHoveredLine(silk);
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltipPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top - 40
                    });
                  }
                }}
                onMouseMove={(e) => {
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltipPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top - 40
                    });
                  }
                }}
                onMouseLeave={() => setHoveredLine(null)}
              />
            ))}
          </svg>

          {cards.map((card, idx) => (
            <WordCard
              key={card.id}
              card={card}
              isDragging={draggingId === card.id}
              onMouseDown={(e) => handleCardMouseDown(e, card)}
              onDoubleClick={() => removeCard(card.id)}
              style={{
                animationDelay: `${idx * 0.1}s`,
                zIndex: draggingId === card.id ? 100 : 10
              }}
            />
          ))}

          {cards.length === 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  color: 'rgba(255,255,255,0.25)',
                  letterSpacing: 4,
                  marginBottom: 12
                }}
              >
                拖拽右侧词汇至此画布
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.15)',
                  letterSpacing: 2
                }}
              >
                词语在200像素内将自动以丝线相连
              </div>
            </div>
          )}

          {hoveredLine && (
            <div style={hoverTooltipStyle(true, hoveredLine.fromWord, hoveredLine.toWord)}>
              {hoveredLine.fromWord} ↔ {hoveredLine.toWord}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Canvas;
