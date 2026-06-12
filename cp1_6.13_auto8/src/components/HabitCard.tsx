import React, { useState, useCallback } from 'react';
import { Habit } from '../types';

interface HabitCardProps {
  habit: Habit;
  onClick: (habit: Habit) => void;
}

const HabitCard: React.FC<HabitCardProps> = ({ habit, onClick }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = useCallback(() => {
    if (!habit.isCheckedToday) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
    onClick(habit);
  }, [habit, onClick]);

  return (
    <div style={styles.container}>
      <button
        style={{
          ...styles.button,
          ...(habit.isCheckedToday ? styles.checkedButton : styles.uncheckedButton),
          animation: isAnimating ? 'bounceIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)' : undefined,
        }}
        onClick={handleClick}
        aria-label={`${habit.name} - ${habit.isCheckedToday ? '已打卡' : '未打卡'}`}
      >
        {habit.isCheckedToday && (
          <svg style={styles.checkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
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
    minWidth: '80px',
  },
  button: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
    padding: 0,
  },
  uncheckedButton: {
    backgroundColor: 'transparent',
    border: '2px solid #6c757d',
  },
  checkedButton: {
    backgroundColor: '#28a745',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(40, 167, 69, 0.4)',
  },
  checkIcon: {
    width: '24px',
    height: '24px',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  name: {
    fontSize: '14px',
    color: '#343a40',
    fontWeight: 500,
    textAlign: 'center',
  },
};

const styleSheetId = 'habit-card-styles';
if (!document.getElementById(styleSheetId)) {
  const styleSheet = document.createElement('style');
  styleSheet.id = styleSheetId;
  styleSheet.textContent = `
    @keyframes bounceIn {
      0% { transform: scale(1); }
      30% { transform: scale(1.3); }
      50% { transform: scale(0.9); }
      70% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
    
    .habit-card-button:hover {
      transform: scale(1.08) !important;
    }
    
    .habit-card-button:active {
      transform: scale(0.92) !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default HabitCard;
