import { useEffect, useRef } from 'react';

interface BreathingOptions {
  minOpacity: number;
  maxOpacity: number;
  period: number;
}

export const useBreathingGlow = (
  elementRef: React.RefObject<HTMLElement>,
  color: string,
  options: BreathingOptions
) => {
  const animationRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const animate = (timestamp: number) => {
      if (startRef.current === null) {
        startRef.current = timestamp;
      }

      const elapsed = timestamp - startRef.current;
      const progress = (elapsed / (options.period * 1000)) * Math.PI * 2;
      const sine = (Math.sin(progress - Math.PI / 2) + 1) / 2;
      const opacity = options.minOpacity + sine * (options.maxOpacity - options.minOpacity);

      element.style.boxShadow = `0 0 ${40 * opacity}px ${20 * opacity}px ${color}, 0 0 ${80 * opacity}px ${40 * opacity}px ${color}55`;
      element.style.opacity = String(0.85 + sine * 0.15);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      startRef.current = null;
    };
  }, [elementRef, color, options.minOpacity, options.maxOpacity, options.period]);
};
