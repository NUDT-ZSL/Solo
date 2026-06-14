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
  const typingTimeoutRef = useRef<number | null>(null);

  const choices = sceneData.choices as ChoiceWithAvailable[];
  const availableChoices = choices.filter((c) => c.available !== false);

  const typeText = useCallback(() => {
    setIsTyping(true);
    setDisplayedText('');
    let index = 0;
    const text = sceneData.text;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const type = () => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
        typingTimeoutRef.current = window.setTimeout(type, 30);
      } else {
        setIsTyping(false);
      }
    };

    type();
  }, [sceneData.text]);

  useEffect(() => {
    typeText();
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [typeText, sceneData.nodeId]);

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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setDisplayedText(sceneData.text);
      setIsTyping(false);
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
          {choices.map((choice, index) => {
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
