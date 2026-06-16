import React, { memo, useRef, useState, useCallback, useEffect } from 'react';
import type { Card, MinionOnBoard } from './gameEngine';

export type CardLocation = 'hand' | 'board_player' | 'board_ai';

interface CardComponentProps {
  card: Card | MinionOnBoard;
  location: CardLocation;
  index?: number;
  total?: number;
  canDrag?: boolean;
  canPlay?: boolean;
  canAttack?: boolean;
  isTargetable?: boolean;
  isSelected?: boolean;
  animationState?: 'idle' | 'attacking' | 'hit' | 'dying';
  style?: React.CSSProperties;
  onPointerDown?: (e: React.PointerEvent, cardId: string, instanceId?: string) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onClick?: (cardId: string, instanceId?: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

interface DragState {
  isDragging: boolean;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const CardComponent: React.FC<CardComponentProps> = memo(function CardComponent(props) {
  const {
    card,
    location,
    canDrag = false,
    canPlay = true,
    canAttack = false,
    isTargetable = false,
    isSelected = false,
    animationState = 'idle',
    style,
    onPointerDown,
    onClick,
  } = props;

  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [drag, setDrag] = useState<DragState>({
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const [dragMoved, setDragMoved] = useState(false);

  const isOnBoard = location === 'board_player' || location === 'board_ai';
  const isPlayerSide = location !== 'board_ai';
  const minion = isOnBoard && 'instanceId' in card ? (card as MinionOnBoard) : null;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!canDrag && !canAttack) return;
      e.preventDefault();
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDrag({
        isDragging: true,
        offsetX: e.clientX - rect.left - rect.width / 2,
        offsetY: e.clientY - rect.top - rect.height / 2,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      });
      setDragMoved(false);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      if (onPointerDown) {
        onPointerDown(e, card.id, minion?.instanceId);
      }
    },
    [canDrag, canAttack, onPointerDown, card.id, minion?.instanceId],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.isDragging) return;
      const dx = Math.abs(e.clientX - drag.startX);
      const dy = Math.abs(e.clientY - drag.startY);
      if (dx > 5 || dy > 5) setDragMoved(true);
      setDrag((prev) => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));
      props.onPointerMove?.(e);
    },
    [drag, props],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drag.isDragging) return;
      setDrag({ isDragging: false, offsetX: 0, offsetY: 0, startX: 0, startY: 0, currentX: 0, currentY: 0 });
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      if (!dragMoved && onClick) {
        onClick(card.id, minion?.instanceId);
      }
      props.onPointerUp?.(e);
    },
    [drag, dragMoved, onClick, card.id, minion?.instanceId, props],
  );

  useEffect(() => {
    if (drag.isDragging) {
      const up = () => {
        setDrag({ isDragging: false, offsetX: 0, offsetY: 0, startX: 0, startY: 0, currentX: 0, currentY: 0 });
      };
      window.addEventListener('pointercancel', up);
      return () => window.removeEventListener('pointercancel', up);
    }
  }, [drag.isDragging]);

  const displayHealth = minion ? minion.currentHealth : card.health;
  const isLowHealth = minion && minion.currentHealth < (minion as MinionOnBoard).maxHealth;

  const classes = [
    'card',
    `card-${card.type}`,
    `card-loc-${location}`,
    hovered && !drag.isDragging ? 'card-hovered' : '',
    isSelected ? 'card-selected' : '',
    canPlay && location === 'hand' ? 'card-playable' : '',
    !canPlay && location === 'hand' ? 'card-unplayable' : '',
    canAttack ? 'card-canAttack' : '',
    isTargetable ? 'card-targetable' : '',
    `card-anim-${animationState}`,
    drag.isDragging ? 'card-dragging' : '',
    isLowHealth ? 'card-lowHealth' : '',
  ]
    .filter(Boolean)
    .join(' ');

  let dragStyle: React.CSSProperties = {};
  if (drag.isDragging) {
    dragStyle = {
      position: 'fixed',
      left: drag.currentX - drag.offsetX - 60,
      top: drag.currentY - drag.offsetY - 85,
      zIndex: 9999,
      pointerEvents: 'none',
      transform: 'scale(1.15) rotate(0deg) !important',
      transition: 'none',
    };
  }

  return (
    <div
      ref={cardRef}
      className={classes}
      style={{ ...style, ...dragStyle }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-card-id={card.id}
      data-instance-id={minion?.instanceId}
    >
      <div className="card-cost">
        <span>{card.cost}</span>
      </div>
      <div
        className="card-art"
        style={{ background: `linear-gradient(135deg, ${card.gradientFrom}, ${card.gradientTo})` }}
      >
        {card.type === 'spell' && <div className="card-spellGlow" />}
      </div>
      <div className="card-name">{card.name}</div>
      {card.type === 'spell' && (
        <div className="card-typeBadge">
          {card.effect === 'damage' && '伤害'}
          {card.effect === 'heal' && '治疗'}
          {card.effect === 'draw' && '抽牌'}
          {card.effectValue !== undefined && ` ${card.effectValue}`}
        </div>
      )}
      {card.type === 'minion' && (
        <>
          <div className="card-attack">
            <span>{card.attack}</span>
          </div>
          <div className={`card-health ${isLowHealth ? 'card-health-low' : ''}`}>
            <span>{displayHealth}</span>
          </div>
        </>
      )}
      {canAttack && <div className="card-attackIndicator" />}
      {isTargetable && <div className="card-targetIndicator" />}
    </div>
  );
});

export default CardComponent;
