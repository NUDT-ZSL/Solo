import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAnimationReturn {
  gaugeAngle: number;
  setGaugeValue: (value: number) => void;
  highlightedSentenceId: string | null;
  setHighlightedSentence: (id: string | null) => void;
  speakingSentenceId: string | null;
  setSpeakingSentence: (id: string | null) => void;
}

export function useAnimation(): UseAnimationReturn {
  const [gaugeAngle, setGaugeAngle] = useState(0);
  const [highlightedSentenceId, setHighlightedSentenceId] = useState<string | null>(null);
  const [speakingSentenceId, setSpeakingSentenceId] = useState<string | null>(null);
  
  const animationRef = useRef<number | null>(null);
  const currentAngleRef = useRef(0);
  const targetAngleRef = useRef(0);

  const setGaugeValue = useCallback((value: number) => {
    const clampedValue = Math.max(0, Math.min(100, value));
    const targetAngle = (clampedValue / 100) * 180;
    targetAngleRef.current = targetAngle;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startTime = performance.now();
    const startAngle = currentAngleRef.current;
    const duration = 600;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const newAngle = startAngle + (targetAngle - startAngle) * easeOutCubic;
      
      currentAngleRef.current = newAngle;
      setGaugeAngle(newAngle);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        currentAngleRef.current = targetAngle;
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const setHighlightedSentence = useCallback((id: string | null) => {
    setHighlightedSentenceId(id);
  }, []);

  const setSpeakingSentence = useCallback((id: string | null) => {
    setSpeakingSentenceId(id);
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    gaugeAngle,
    setGaugeValue,
    highlightedSentenceId,
    setHighlightedSentence,
    speakingSentenceId,
    setSpeakingSentence
  };
}
