import React, { useState } from 'react';
import { Habit } from '../types';

interface HabitCardProps {
  habit: Habit;
  onClick: (habit: Habit) => void;
}

const HabitCard: React.FC<HabitCardProps> = ({ habit, onClick }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (!habit.isCheckedToday) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
    }
    onClick(habit);
  };

  return (
    <div style={styles.container}>
      <button
        style={{
          ...styles.button,
          ...(habit.isCheckedToday ? styles.checkedButton : styles.uncheckedButton),
          ...(isAnimating ? styles.animating : {}),
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
    transition: 'all 0.2s ease',
    padding: 0,
  },
  uncheckedButton: {
    backgroundColor: 'transparent',
    border: '2px solid #6c757d',
  },
  checkedButton: {
    backgroundColor: '#ffffff',
    color: '#28a745',
    boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)',
  },
  animating: {
    animation: 'bounceScale 0.3s ease',
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

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes bounceScale {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  
  button:hover {
    transform: scale(1.05);
  }
  
  button:active {
    transform: scale(0.95);
  }
`;
document.head.appendChild(styleSheet);

export default HabitCard;
