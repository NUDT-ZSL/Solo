import React, { useEffect, useState } from 'react';
import { eventBus } from '../utils/EventBus';

interface DiceButtonProps {
  disabled: boolean;
}

export const DiceButton: React.FC<DiceButtonProps> = ({ disabled }) => {
  const [rolling, setRolling] = useState(false);
  const [value, setValue] = useState<number>(1);
  const [displayValue, setDisplayValue] = useState<number>(1);

  useEffect(() => {
    const offRolling = eventBus.on('dice:rolling', () => {
      setRolling(true);
    });
    const offResult = eventBus.on('dice:result', ({ value }) => {
      setValue(value);
      setDisplayValue(value);
      window.setTimeout(() => setRolling(false), 100);
    });
    return () => {
      offRolling();
      offResult();
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
        style={{
          width: 80,
          height: 80,
          borderRadius: 8,
        }}
      >
        {rolling ? '?' : displayValue}
      </button>
      <span className="dice-label">点击掷骰</span>
    </div>
  );
};
