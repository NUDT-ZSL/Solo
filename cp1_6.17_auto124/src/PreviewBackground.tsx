import { useEffect, useRef, useCallback } from 'react';
import { useGradientStore } from './store';

export default function PreviewBackground() {
  const config = useGradientStore((s) => s.config);
  const configRef = useRef(config);
  configRef.current = config;

  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const buildGradientCSS = useCallback(
    (offset: number) => {
      const c = configRef.current;
      const sorted = [...c.colorStops].sort((a, b) => a.position - b.position);
      const stops = sorted
        .map((s) => {
          const pos = Math.max(0, Math.min(1, s.position + offset * 0.05));
          return `${s.color} ${(pos * 100).toFixed(1)}%`;
        })
        .join(', ');

      if (c.type === 'linear') {
        return `linear-gradient(${c.angle}deg, ${stops})`;
      }
      return `radial-gradient(circle at center, ${stops})`;
    },
    []
  );

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = (timestamp - startTimeRef.current) / 1000;
    const cycle = (elapsed % 8) / 8;
    const offset = Math.sin(cycle * Math.PI * 2);

    const el = document.getElementById('preview-bg');
    if (el) {
      el.style.background = buildGradientCSS(offset);
    }

    animRef.current = requestAnimationFrame(animate);
  }, [buildGradientCSS]);

  useEffect(() => {
    if (config.animationEnabled) {
      startTimeRef.current = 0;
      animRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(animRef.current);
      const el = document.getElementById('preview-bg');
      if (el) {
        el.style.background = buildGradientCSS(0);
      }
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [config.animationEnabled, config.type, config.angle, config.radius, config.colorStops, animate, buildGradientCSS]);

  return <div id="preview-bg" className="absolute inset-0" style={{ background: buildGradientCSS(0) }} />;
}
