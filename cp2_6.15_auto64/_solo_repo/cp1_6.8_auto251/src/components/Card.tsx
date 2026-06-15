import React, { useCallback, useRef } from 'react';
import styles from './Card.module.css';

export interface CardData {
  id: string;
  char: string;
  x: number;
  y: number;
  targetSlotIndex: number;
  currentSlotIndex: number | null;
  isDragging: boolean;
  isCorrect: boolean;
  isFlipped: boolean;
  isShaking: boolean;
  isDimmed: boolean;
  showRipple: boolean;
}

interface CardProps {
  data: CardData;
  onPointerDown: (id: string, e: React.PointerEvent) => void;
  onDoubleClick: (id: string) => void;
  size: number;
}

const Card: React.FC<CardProps> = React.memo(({ data, onPointerDown, onDoubleClick, size }) => {
  const lastClickRef = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onPointerDown(data.id, e);
    },
    [data.id, onPointerDown]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const now = Date.now();
      if (now - lastClickRef.current < 300) {
        onDoubleClick(data.id);
      }
      lastClickRef.current = now;
    },
    [data.id, onDoubleClick]
  );

  const styleVars = {
    '--card-x': `${data.x}px`,
    '--card-y': `${data.y}px`,
    '--card-size': `${size}px`,
  } as React.CSSProperties;

  const classNames = [
    styles.card,
    data.isDragging ? styles.dragging : '',
    data.isCorrect ? styles.correct : '',
    data.isFlipped ? styles.flipped : '',
    data.isShaking ? styles.shaking : '',
    data.isDimmed ? styles.dimmed : '',
    data.currentSlotIndex !== null ? styles.slotted : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      style={styleVars}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <div className={styles.cardInner}>
        <div className={styles.cardFront}>
          <span className={styles.char}>{data.char}</span>
        </div>
        <div className={styles.cardBack}>
          <span className={styles.char}>?</span>
        </div>
      </div>
      {data.showRipple && <div className={styles.ripple} />}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
