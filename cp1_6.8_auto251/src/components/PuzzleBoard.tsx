import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import Card, { CardData } from './Card';
import styles from './PuzzleBoard.module.css';

export interface SlotInfo {
  id: number;
  lineIndex: number;
  positionInLine: number;
  expectedChar: string;
  filledCardId: string | null;
  x: number;
  y: number;
}

interface PuzzleBoardProps {
  cards: CardData[];
  slots: SlotInfo[];
  onCardPlace: (cardId: string, slotId: number | null) => void;
  onCardDoubleClick: (cardId: string) => void;
  cardSize: number;
  poemLines: string[];
}

const SNAP_THRESHOLD = 24;

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playCorrectSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

function playWrongSound() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.setValueAtTime(220, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

const PuzzleBoard: React.FC<PuzzleBoardProps> = ({
  cards,
  slots,
  onCardPlace,
  onCardDoubleClick,
  cardSize,
  poemLines,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    cardId: string;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);

  const slotGap = useMemo(() => {
    const maxLineLen = Math.max(...poemLines.map((l) => l.length));
    if (maxLineLen <= 5) return cardSize * 0.18;
    return cardSize * 0.12;
  }, [poemLines, cardSize]);

  const lineGap = useMemo(() => cardSize * 0.35, [cardSize]);

  const handlePointerDown = useCallback(
    (cardId: string, e: React.PointerEvent) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card || card.isCorrect) return;

      dragRef.current = {
        cardId,
        offsetX: e.clientX - card.x,
        offsetY: e.clientY - card.y,
        startX: card.x,
        startY: card.y,
      };
    },
    [cards]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();

      const newX = e.clientX - dragRef.current.offsetX;
      const newY = e.clientY - dragRef.current.offsetY;

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setDragPos({ id: dragRef.current!.cardId, x: newX, y: newY });
      });
    },
    []
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current) return;

      const { cardId, startX, startY } = dragRef.current;
      const currentCard = cards.find((c) => c.id === cardId);
      if (!currentCard) {
        dragRef.current = null;
        setDragPos(null);
        return;
      }

      const cardX = dragPos?.id === cardId ? dragPos.x : currentCard.x;
      const cardY = dragPos?.id === cardId ? dragPos.y : currentCard.y;
      const cardCenterX = cardX + cardSize / 2;
      const cardCenterY = cardY + cardSize / 2;

      let closestSlot: SlotInfo | null = null;
      let closestDist = Infinity;

      for (const slot of slots) {
        if (slot.filledCardId !== null && slot.filledCardId !== cardId) continue;
        const slotCenterX = slot.x + cardSize / 2;
        const slotCenterY = slot.y + cardSize / 2;
        const dist = Math.hypot(cardCenterX - slotCenterX, cardCenterY - slotCenterY);
        if (dist < closestDist) {
          closestDist = dist;
          closestSlot = slot;
        }
      }

      if (closestSlot && closestDist < SNAP_THRESHOLD + cardSize * 0.5) {
        onCardPlace(cardId, closestSlot.id);

        if (closestSlot.expectedChar === currentCard.char) {
          playCorrectSound();
        } else {
          playWrongSound();
        }
      } else {
        onCardPlace(cardId, null);
      }

      dragRef.current = null;
      setDragPos(null);
    },
    [cards, slots, cardSize, onCardPlace, dragPos]
  );

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handlePointerMove, handlePointerUp]);

  const mergedCards = useMemo(() => {
    return cards.map((card) => {
      if (dragPos && dragPos.id === card.id) {
        return { ...card, x: dragPos.x, y: dragPos.y, isDragging: true };
      }
      return card;
    });
  }, [cards, dragPos]);

  return (
    <div className={styles.board} ref={boardRef}>
      <div className={styles.slotsContainer}>
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={`${styles.slot} ${slot.filledCardId ? styles.slotFilled : ''}`}
            style={{
              left: slot.x,
              top: slot.y,
              width: cardSize,
              height: cardSize,
            }}
          >
            {!slot.filledCardId && (
              <span className={styles.slotHint}>{slot.expectedChar}</span>
            )}
          </div>
        ))}
      </div>
      <div className={styles.cardsContainer}>
        {mergedCards.map((card) => (
          <Card
            key={card.id}
            data={card}
            onPointerDown={handlePointerDown}
            onDoubleClick={onCardDoubleClick}
            size={cardSize}
          />
        ))}
      </div>
    </div>
  );
};

export default PuzzleBoard;
