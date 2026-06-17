import { useState, useEffect } from 'react';
import '../styles/components.css';

interface LoadingSpinnerProps {
  size?: number;
}

export function LoadingSpinner({ size = 40 }: LoadingSpinnerProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`loading-spinner-container ${fadeOut ? 'fade-out' : ''}`}>
      <div
        className="loading-spinner"
        style={{ width: size, height: size }}
      ></div>
    </div>
  );
}

export default LoadingSpinner;
