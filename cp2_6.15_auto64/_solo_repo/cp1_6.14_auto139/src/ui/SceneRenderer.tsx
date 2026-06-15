import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Choice, SceneData } from '../types';

interface SceneRendererProps {
  sceneData: SceneData;
  onChoiceSelect: (choiceId: string) => void;
  isTransitioning: boolean;
}

interface ChoiceWithAvailable extends Choice {
  available?: boolean;
}

const SceneRenderer: React.FC<SceneRendererProps> = ({ sceneData, onChoiceSelect, isTransitioning }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isTypingRef = useRef(true);
  const mountedRef = useRef(true);
  const TYPING_INTERVAL = 30;
  const MAX_TYPING_DURATION = 1500;

  const choices = sceneData.choices as ChoiceWithAvailable[];
  const availableChoices = choices.filter((c) => c.available !== false);

  const cancelAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isTypingRef.current = false;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isTypingRef.current = false;
    };
  }, []);

  const typeText = useCallback(() => {
    if (!mountedRef.current) return;

    setIsTyping(true);
    isTypingRef.current = true;
    setDisplayedText('');
    cancelAnimation();

    const text = sceneData.text;
    let currentIndex = 0;
    const startTime = performance.now();

    const animate = (now: number) => {
      if (!mountedRef.current || !isTypingRef.current) return;

      const totalElapsed = now - startTime;
      const charsToShow = Math.min(
        Math.floor(totalElapsed / TYPING_INTERVAL),
        text.length
      );

      if (charsToShow > currentIndex || totalElapsed >= MAX_TYPING_DURATION) {
        const nextIndex = totalElapsed >= MAX_TYPING_DURATION ? text.length : charsToShow;
        if (nextIndex > currentIndex) {
          currentIndex = nextIndex;
          if (mountedRef.current) {
            setDisplayedText(text.slice(0, currentIndex));
          }
        }
      }

      if (currentIndex < text.length && totalElapsed < MAX_TYPING_DURATION) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        if (mountedRef.current) {
          setIsTyping(false);
          setDisplayedText(text);
        }
        isTypingRef.current = false;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [sceneData.text, cancelAnimation]);

  useEffect(() => {
    typeText();
    return () => {
      cancelAnimation();
    };
  }, [typeText, sceneData.nodeId, cancelAnimation]);

  useEffect(() => {
    if (availableChoices.length > 0 && selectedIndex >= availableChoices.length) {
      setSelectedIndex(0);
    }
  }, [availableChoices.length, selectedIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isTyping || isTransitioning) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : availableChoices.length - 1));
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < availableChoices.length - 1 ? prev + 1 : 0));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (availableChoices[selectedIndex]) {
            onChoiceSelect(availableChoices[selectedIndex].id);
          }
          break;
      }
    },
    [isTyping, isTransitioning, availableChoices, selectedIndex, onChoiceSelect]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const skipTyping = () => {
    if (isTyping) {
      cancelAnimation();
      if (mountedRef.current) {
        setDisplayedText(sceneData.text);
        setIsTyping(false);
      }
    }
  };

  return (
    <div className="scene-container" onClick={skipTyping}>
      <div className="scene-content" ref={textRef}>
        <div className="narrative-text">
          {displayedText}
          {isTyping && <span className="typing-cursor">|</span>}
        </div>
      </div>

      {!isTyping && !isTransitioning && choices.length > 0 && (
        <div className="choices-container">
          {choices.map((choice) => {
            const isAvailable = choice.available !== false;
            const availableIndex = availableChoices.findIndex((c) => c.id === choice.id);
            const isSelected = availableIndex === selectedIndex && isAvailable;

            return (
              <button
                key={choice.id}
                className={`choice-btn ${isAvailable ? '' : 'disabled'} ${isSelected ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isAvailable) {
                    onChoiceSelect(choice.id);
                  }
                }}
                disabled={!isAvailable}
                onMouseEnter={() => {
                  if (isAvailable) {
                    setSelectedIndex(availableIndex);
                  }
                }}
              >
                {choice.text}
              </button>
            );
          })}
        </div>
      )}

      {isTyping && (
        <div className="skip-hint">点击屏幕跳过</div>
      )}
    </div>
  );
};

export default SceneRenderer;
