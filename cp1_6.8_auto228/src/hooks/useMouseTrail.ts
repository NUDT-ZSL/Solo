import { useRef, useCallback, useEffect } from 'react';

export interface MouseTrailState {
  x: number;
  y: number;
  speed: number;
  isActive: boolean;
  angle: number;
  normalizedX: number;
  normalizedY: number;
}

export function useMouseTrail() {
  const stateRef = useRef<MouseTrailState>({
    x: 0,
    y: 0,
    speed: 0,
    isActive: false,
    angle: 0,
    normalizedX: 0.5,
    normalizedY: 0.5,
  });

  const prevRef = useRef({ x: 0, y: 0, time: 0 });
  const speedDecayRef = useRef(0);

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    const now = performance.now();
    const prev = prevRef.current;
    const dx = clientX - prev.x;
    const dy = clientY - prev.y;
    const dt = Math.max(now - prev.time, 1);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const rawSpeed = (dist / dt) * 16;
    const speed = Math.min(rawSpeed, 80);
    speedDecayRef.current = speed;
    const angle = Math.atan2(dy, dx);

    stateRef.current = {
      x: clientX,
      y: clientY,
      speed,
      isActive: true,
      angle,
      normalizedX: clientX / window.innerWidth,
      normalizedY: clientY / window.innerHeight,
    };

    prevRef.current = { x: clientX, y: clientY, time: now };
  }, []);

  useEffect(() => {
    let rafId: number;

    const decay = () => {
      speedDecayRef.current *= 0.92;
      if (speedDecayRef.current < 0.5) {
        speedDecayRef.current = 0;
        stateRef.current.speed = 0;
        stateRef.current.isActive = false;
      } else {
        stateRef.current.speed = speedDecayRef.current;
      }
      rafId = requestAnimationFrame(decay);
    };
    rafId = requestAnimationFrame(decay);

    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        prevRef.current = { x: touch.clientX, y: touch.clientY, time: performance.now() };
        updatePosition(touch.clientX, touch.clientY);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchstart', onTouchStart);
    };
  }, [updatePosition]);

  return stateRef;
}
