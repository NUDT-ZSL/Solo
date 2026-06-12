import { useEffect, useState, useRef } from 'react';

interface TimerProps {
  duration: number;
  onTick?: (remaining: number) => void;
  onComplete?: () => void;
  keyTrigger?: number;
  variant?: 'ring' | 'countdown';
}

const Timer = ({ duration, onTick, onComplete, keyTrigger, variant = 'ring' }: TimerProps) => {
  const [remaining, setRemaining] = useState(duration);
  const [displayNum, setDisplayNum] = useState(duration);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    setRemaining(duration);
    setDisplayNum(duration);
    startTimeRef.current = Date.now();

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const newRemaining = Math.max(0, duration - elapsed);
      setRemaining(newRemaining);
      setDisplayNum(newRemaining);
      onTick?.(newRemaining);

      if (newRemaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setTimeout(() => onComplete?.(), 50);
      }
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [duration, keyTrigger]);

  const progress = duration > 0 ? remaining / duration : 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const getColor = () => {
    if (progress > 0.5) return '#22c55e';
    if (progress > 0.25) return '#fbbf24';
    return '#ef4444';
  };

  if (variant === 'countdown') {
    return (
      <div style={styles.countdownWrap}>
        <div
          key={displayNum}
          style={{
            ...styles.countdownNum,
            animation: 'countdownPop 0.9s ease-out forwards',
          }}
        >
          {displayNum}
        </div>
        <style>{countdownStyles}</style>
      </div>
    );
  }

  return (
    <div style={styles.timerWrap}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={styles.svg}>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke 0.3s ease, stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <div
        style={{
          ...styles.timeText,
          color: getColor(),
          ...(remaining <= 3 ? { animation: 'shake-text 0.3s ease-in-out infinite' } : {}),
        }}
      >
        {remaining}
        <span style={styles.unit}>s</span>
      </div>
      <style>{timerStyles}</style>
    </div>
  );
};

const timerStyles = `
  @keyframes shake-text {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    75% { transform: translateX(3px); }
  }
`;

const countdownStyles = `
  @keyframes countdownPop {
    0% {
      transform: scale(0.3);
      opacity: 0;
    }
    30% {
      transform: scale(1.2);
      opacity: 1;
    }
    60% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(2.5);
      opacity: 0;
    }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  timerWrap: {
    position: 'relative',
    width: '100px',
    height: '100px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  timeText: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '32px',
    fontWeight: 900,
    zIndex: 2,
    display: 'flex',
    alignItems: 'baseline',
    transition: 'color 0.3s ease',
  },
  unit: {
    fontSize: '16px',
    fontWeight: 600,
    marginLeft: '2px',
    opacity: 0.7,
  },
  countdownWrap: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    background: 'rgba(10,22,40,0.7)',
    backdropFilter: 'blur(4px)',
    pointerEvents: 'none',
  },
  countdownNum: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '180px',
    fontWeight: 900,
    background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 60px rgba(124,58,237,0.6)',
  },
};

export default Timer;
