import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import PuzzleBoard, { SlotInfo } from './components/PuzzleBoard';
import { CardData } from './components/Card';
import ResultPanel from './components/ResultPanel';
import { poems, Poem } from './data/poems';
import styles from './App.module.css';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getCardSize(): number {
  if (typeof window === 'undefined') return 60;
  const w = window.innerWidth;
  if (w <= 480) return 44;
  if (w <= 768) return 50;
  return 60;
}

function computeSlotPositions(
  poem: Poem,
  boardWidth: number,
  cardSize: number
): SlotInfo[] {
  const padding = 24;
  const availWidth = boardWidth - padding * 2;
  const maxLineLen = Math.max(...poem.lines.map((l) => l.length));
  const gap = maxLineLen <= 5 ? cardSize * 0.18 : cardSize * 0.12;
  const lineGap = cardSize * 0.35;
  const totalLinesWidth = maxLineLen * cardSize + (maxLineLen - 1) * gap;
  const startX = (availWidth - totalLinesWidth) / 2 + padding;
  const startY = 32;

  const slots: SlotInfo[] = [];
  let slotId = 0;

  poem.lines.forEach((line, lineIdx) => {
    const lineLen = line.length;
    const lineWidth = lineLen * cardSize + (lineLen - 1) * gap;
    const lineStartX = (availWidth - lineWidth) / 2 + padding;

    for (let p = 0; p < lineLen; p++) {
      slots.push({
        id: slotId++,
        lineIndex: lineIdx,
        positionInLine: p,
        expectedChar: line[p],
        filledCardId: null,
        x: lineStartX + p * (cardSize + gap),
        y: startY + lineIdx * (cardSize + lineGap),
      });
    }
  });

  return slots;
}

function computeScatterPositions(
  totalCards: number,
  boardWidth: number,
  boardHeight: number,
  cardSize: number,
  slotAreaHeight: number
): { x: number; y: number }[] {
  const padding = 20;
  const scatterTop = slotAreaHeight + 24;
  const scatterHeight = boardHeight - scatterTop - padding;
  const availWidth = boardWidth - padding * 2;

  if (scatterHeight < cardSize + 10) {
    return Array.from({ length: totalCards }, (_, i) => ({
      x: padding + (i % 8) * (cardSize + 8),
      y: scatterTop,
    }));
  }

  const cols = Math.max(1, Math.floor(availWidth / (cardSize + 10)));
  const positions: { x: number; y: number }[] = [];
  const rowGap = cardSize + 10;

  for (let i = 0; i < totalCards; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jitterX = (Math.random() - 0.5) * 6;
    const jitterY = (Math.random() - 0.5) * 4;
    positions.push({
      x: padding + col * (cardSize + 10) + jitterX,
      y: scatterTop + row * rowGap + jitterY,
    });
  }

  return positions;
}

function initGame(
  poem: Poem,
  boardWidth: number,
  cardSize: number
): { cards: CardData[]; slots: SlotInfo[]; boardHeight: number } {
  const slots = computeSlotPositions(poem, boardWidth, cardSize);

  const allChars: { char: string; targetSlotIndex: number }[] = [];
  poem.lines.forEach((line, lineIdx) => {
    for (let p = 0; p < line.length; p++) {
      const slotIdx = slots.findIndex(
        (s) => s.lineIndex === lineIdx && s.positionInLine === p
      );
      allChars.push({ char: line[p], targetSlotIndex: slotIdx });
    }
  });

  const shuffled = shuffleArray(allChars);
  const slotAreaHeight =
    poem.lines.length * (cardSize + cardSize * 0.35) + 32;
  const rowsNeeded = Math.ceil(shuffled.length / Math.floor((boardWidth - 40) / (cardSize + 10)));
  const scatterAreaHeight = rowsNeeded * (cardSize + 10) + 20;
  const boardHeight = slotAreaHeight + scatterAreaHeight + 40;

  const scatterPos = computeScatterPositions(
    shuffled.length,
    boardWidth,
    boardHeight,
    cardSize,
    slotAreaHeight
  );

  const cards: CardData[] = shuffled.map((item, i) => ({
    id: `card-${i}`,
    char: item.char,
    x: scatterPos[i].x,
    y: scatterPos[i].y,
    targetSlotIndex: item.targetSlotIndex,
    currentSlotIndex: null,
    isDragging: false,
    isCorrect: false,
    isFlipped: false,
    isShaking: false,
    isDimmed: false,
    showRipple: false,
  }));

  return { cards, slots, boardHeight };
}

const App: React.FC = () => {
  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const [cards, setCards] = useState<CardData[]>([]);
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [boardWidth, setBoardWidth] = useState(800);
  const [boardHeight, setBoardHeight] = useState(500);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const boardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cardSize = useMemo(() => getCardSize(), [boardWidth]);

  const currentPoem = poems[currentPoemIndex];

  const startGame = useCallback(
    (poemIndex: number) => {
      const poem = poems[poemIndex];
      const w = boardRef.current?.clientWidth || 800;
      const { cards: newCards, slots: newSlots, boardHeight: bh } = initGame(
        poem,
        w,
        cardSize
      );
      setCards(newCards);
      setSlots(newSlots);
      setBoardHeight(bh);
      setStartTime(Date.now());
      setEndTime(null);
      setTotalAttempts(0);
      setCorrectCount(0);
      setIsCompleted(false);
      setElapsed(0);
      setCurrentPoemIndex(poemIndex);
    },
    [cardSize]
  );

  useEffect(() => {
    startGame(0);
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (boardRef.current) {
        setBoardWidth(boardRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (startTime && !endTime) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime, endTime]);

  const handleCardPlace = useCallback(
    (cardId: string, slotId: number | null) => {
      setTotalAttempts((prev) => prev + 1);

      setCards((prevCards) => {
        const cardIndex = prevCards.findIndex((c) => c.id === cardId);
        if (cardIndex === -1) return prevCards;
        const card = prevCards[cardIndex];

        const newCards = [...prevCards];

        if (slotId === null) {
          newCards[cardIndex] = {
            ...card,
            currentSlotIndex: null,
            isDragging: false,
          };
          return newCards;
        }

        const slot = slots.find((s) => s.id === slotId);
        if (!slot) return newCards;

        const isCorrect = card.char === slot.expectedChar;

        if (isCorrect) {
          setCorrectCount((prev) => prev + 1);
          newCards[cardIndex] = {
            ...card,
            x: slot.x,
            y: slot.y,
            currentSlotIndex: slotId,
            isDragging: false,
            isCorrect: true,
            showRipple: true,
            isShaking: false,
            isDimmed: false,
          };
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === cardId ? { ...c, showRipple: false } : c
              )
            );
          }, 800);
        } else {
          newCards[cardIndex] = {
            ...card,
            currentSlotIndex: null,
            isDragging: false,
            isShaking: true,
            isDimmed: true,
          };
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === cardId
                  ? { ...c, isShaking: false, isDimmed: false }
                  : c
              )
            );
          }, 600);
        }

        setSlots((prevSlots) => {
          const newSlots = prevSlots.map((s) => {
            if (s.filledCardId === cardId) {
              return { ...s, filledCardId: null };
            }
            return s;
          });
          if (isCorrect) {
            return newSlots.map((s) =>
              s.id === slotId ? { ...s, filledCardId: cardId } : s
            );
          }
          return newSlots;
        });

        return newCards;
      });
    },
    [slots]
  );

  useEffect(() => {
    if (correctCount > 0 && correctCount === slots.length && !isCompleted) {
      setEndTime(Date.now());
      setIsCompleted(true);
    }
  }, [correctCount, slots.length, isCompleted]);

  const handleCardDoubleClick = useCallback((cardId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, isFlipped: !c.isFlipped } : c
      )
    );
  }, []);

  const handleReplay = useCallback(() => {
    startGame(currentPoemIndex);
  }, [currentPoemIndex, startGame]);

  const handleNext = useCallback(() => {
    const nextIndex = (currentPoemIndex + 1) % poems.length;
    startGame(nextIndex);
  }, [currentPoemIndex, startGame]);

  const handleSelectPoem = useCallback(
    (index: number) => {
      startGame(index);
    },
    [startGame]
  );

  const accuracy = totalAttempts > 0 ? correctCount / totalAttempts : 1;
  const timeElapsed = endTime ? endTime - (startTime || 0) : elapsed;

  const updatedSlots = useMemo(() => {
    return slots;
  }, [slots]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.logo}>词海触礁</h1>
        <p className={styles.subtitle}>拖拽汉字，拼出诗句</p>
      </header>

      <nav className={styles.poemNav}>
        <div className={styles.poemNavInner}>
          {poems.map((poem, i) => (
            <button
              key={poem.id}
              className={`${styles.poemTab} ${
                i === currentPoemIndex ? styles.poemTabActive : ''
              }`}
              onClick={() => handleSelectPoem(i)}
            >
              {poem.title}
            </button>
          ))}
        </div>
      </nav>

      <div className={styles.gameInfo}>
        <div className={styles.poemTitle}>
          <span className={styles.dynasty}>〔{currentPoem.dynasty}〕</span>
          {currentPoem.title}
          <span className={styles.author}>· {currentPoem.author}</span>
        </div>
        <div className={styles.stats}>
          <span className={styles.stat}>
            {Math.floor(timeElapsed / 60000)}:
            {String(Math.floor((timeElapsed % 60000) / 1000)).padStart(2, '0')}
          </span>
          <span className={styles.statDivider}>|</span>
          <span className={styles.stat}>
            {correctCount}/{slots.length}
          </span>
        </div>
      </div>

      <div className={styles.boardWrapper} ref={boardRef} style={{ height: boardHeight }}>
        <PuzzleBoard
          cards={cards}
          slots={updatedSlots}
          onCardPlace={handleCardPlace}
          onCardDoubleClick={handleCardDoubleClick}
          cardSize={cardSize}
          poemLines={currentPoem.lines}
        />
      </div>

      {isCompleted && currentPoem && (
        <ResultPanel
          poem={currentPoem}
          timeElapsed={timeElapsed}
          accuracy={accuracy}
          onReplay={handleReplay}
          onNext={handleNext}
        />
      )}
    </div>
  );
};

export default App;
