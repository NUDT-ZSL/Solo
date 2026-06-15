import React, { useState, useEffect, useRef } from 'react';
import { Hint } from '@shared/types';

interface HintBubbleProps {
  hint: Hint;
  cellSize: number;
}

const TYPEWRITER_INTERVAL = 40;

const HintBubble: React.FC<HintBubbleProps> = ({ hint, cellSize }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const typewriterTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsVisible(true);
    let index = 0;
    const fullText = hint.text;

    typewriterTimer.current = setInterval(() => {
      if (index < fullText.length) {
        index++;
        setDisplayedText(fullText.slice(0, index));
      } else {
        if (typewriterTimer.current) {
          clearInterval(typewriterTimer.current);
          typewriterTimer.current = null;
        }
      }
    }, TYPEWRITER_INTERVAL);

    const remainingDuration = Math.max(0, hint.duration - (Date.now() - hint.createdAt));
    hideTimer.current = setTimeout(() => {
      setIsVisible(false);
    }, remainingDuration);

    return () => {
      if (typewriterTimer.current) {
        clearInterval(typewriterTimer.current);
        typewriterTimer.current = null;
      }
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [hint.text, hint.duration, hint.createdAt]);

  const bubbleWidth = Math.max(100, Math.min(200, hint.text.length * 14 + 30));

  return (
    <div
      className={`hint-bubble ${isVisible ? 'visible' : ''}`}
      style={{
        left: hint.x * cellSize + cellSize / 2,
        top: hint.y * cellSize - 8,
        transform: 'translate(-50%, -100%)',
        width: bubbleWidth,
      }}
    >
      <div className="hint-text">{displayedText}</div>
      <div className="hint-caret" />
    </div>
  );
};

export default HintBubble;
