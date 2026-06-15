import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Habit } from '../types';

interface HabitCardProps {
  habit: Habit;
  onClick: (habit: Habit) => void;
  onCheckInSuccess?: (habitId: string) => void;
}

const HabitCard: React.FC<HabitCardProps> = ({ habit, onClick, onCheckInSuccess }) => {
  const [localChecked, setLocalChecked] = useState<boolean | null>(null);
  const [animating, setAnimating] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const effectiveChecked = localChecked !== null ? localChecked : !!habit.isCheckedToday;

  useEffect(() => {
    setShowCheck(effectiveChecked);
  }, [effectiveChecked]);

  useEffect(() => {
    if (localChecked !== null && habit.isCheckedToday !== localChecked) {
      setLocalChecked(null);
    }
  }, [habit.isCheckedToday, localChecked]);

  const handleClick = useCallback(() => {
    if (effectiveChecked) return;

    setAnimating(true);
    setLocalChecked(true);
    setShowCheck(true);

    if (onCheckInSuccess) {
      onCheckInSuccess(habit._id);
    }

    if (btnRef.current) {
      btnRef.current.style.animation = 'none';
      void btnRef.current.offsetWidth;
      btnRef.current.style.animation = 'elasticBounce 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    }

    setTimeout(() => {
      setAnimating(false);
    }, 300);

    onClick(habit);
  }, [habit, onClick, effectiveChecked, onCheckInSuccess]);

  return (
    <div style={styles.container}>
      <button
        ref={btnRef}
        className={`habit-btn ${effectiveChecked ? 'habit-btn-checked' : 'habit-btn-unchecked'}`}
        style={{
          ...styles.button,
          ...(effectiveChecked ? styles.checkedButton : styles.uncheckedButton),
          ...(animating ? { animation: 'elasticBounce 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)' } : {}),
        }}
        onClick={handleClick}
        aria-label={`${habit.name} - ${effectiveChecked ? '已打卡' : '未打卡'}`}
      >
        <svg 
          style={{
            ...styles.checkIcon,
            opacity: showCheck ? 1 : 0,
            transform: showCheck ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-45deg)',
            transition: 'all 0.25s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          }} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
      <span style={styles.name}>{habit.name}</span>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    minWidth: '72px',
    flex: '0 0 auto',
  },
  button: {
    width: '48px',
    height: '48px',
    minWidth: '48px',
    minHeight: '48px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    outline: 'none',
    transition: 'background-color 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, transform 0.15s ease',
  },
  uncheckedButton: {
    backgroundColor: '#ffffff',
    border: '2px solid #6c757d',
    color: 'transparent',
  },
  checkedButton: {
    backgroundColor: '#28a745',
    border: '2px solid #28a745',
    color: '#ffffff',
    boxShadow: '0 4px 14px rgba(40, 167, 69, 0.45)',
  },
  checkIcon: {
    width: '26px',
    height: '26px',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  name: {
    fontSize: '14px',
    color: '#343a40',
    fontWeight: 500,
    textAlign: 'center',
    lineHeight: 1.3,
    maxWidth: '72px',
    wordBreak: 'break-word',
  },
};

const STYLE_ID = 'habit-card-keyframes';
if (!document.getElementById(STYLE_ID)) {
  const styleSheet = document.createElement('style');
  styleSheet.id = STYLE_ID;
  styleSheet.textContent = `
    @keyframes elasticBounce {
      0%   { transform: scale(1); }
      15%  { transform: scale(1.35); }
      35%  { transform: scale(0.85); }
      55%  { transform: scale(1.15); }
      75%  { transform: scale(0.95); }
      100% { transform: scale(1); }
    }

    .habit-btn:hover {
      transform: scale(1.06) !important;
    }

    .habit-btn:active {
      transform: scale(0.92) !important;
    }

    .habit-btn-checked:hover {
      box-shadow: 0 6px 18px rgba(40, 167, 69, 0.55) !important;
    }

    .habit-btn-unchecked:hover {
      border-color: #28a745 !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default HabitCard;
