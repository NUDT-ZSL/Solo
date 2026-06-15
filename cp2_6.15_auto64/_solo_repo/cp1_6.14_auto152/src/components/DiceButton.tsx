import React, { useEffect, useState, useRef } from 'react';
import { eventBus } from '../utils/EventBus';

interface DiceButtonProps {
  disabled: boolean;
}

export const DiceButton: React.FC<DiceButtonProps> = ({ disabled }) => {
  const [rolling, setRolling] = useState(false);
  const [displayValue, setDisplayValue] = useState<number>(1);
  const pendingValueRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const offRolling = eventBus.on('dice:rolling', () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingValueRef.current = null;
      setRolling(true);
    });
    const offResult = eventBus.on('dice:result', ({ value }) => {
      pendingValueRef.current = value;
      timerRef.current = window.setTimeout(() => {
        if (pendingValueRef.current !== null) {
          setDisplayValue(pendingValueRef.current);
        }
        setRolling(false);
        timerRef.current = null;
        pendingValueRef.current = null;
      }, 500);
    });
    return () => {
      offRolling();
      offResult();
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleClick = () => {
    if (disabled || rolling) return;
    eventBus.emit('dice:roll', undefined);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={`dice-btn ${rolling ? 'rolling' : ''}`}
        onClick={handleClick}
        disabled={disabled || rolling}
      >
        {rolling ? '?' : displayValue}
      </button>
      <span className="dice-label">点击掷骰</span>
    </div>
  );
};
