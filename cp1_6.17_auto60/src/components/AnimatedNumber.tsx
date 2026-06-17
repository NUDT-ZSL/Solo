import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';

interface AnimatedNumberProps {
  value: number;
  className?: string;
}

const AnimatedNumber: FC<AnimatedNumberProps> = ({ value, className }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [animating, setAnimating] = useState(false);
  const prevValueRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const prev = prevValueRef.current;
    if (prev === value) return;

    const duration = 300;
    const startTime = performance.now();
    setAnimating(true);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = Math.round(prev + (value - prev) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        setAnimating(false);
        prevValueRef.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <span className={`${className || ''} ${animating ? 'number-bounce' : ''}`}>
      {displayValue}
    </span>
  );
};

export default AnimatedNumber;
