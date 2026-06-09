import { useEffect, useRef, useState, useCallback } from 'react';

export interface InteractionState {
  rotationX: number;
  rotationY: number;
  scale: number;
  isInteracting: boolean;
}

const DEG_TO_RAD = Math.PI / 180;
const SENSITIVITY = 0.5 * DEG_TO_RAD;
const MIN_ROTATION = -360 * DEG_TO_RAD;
const MAX_ROTATION = 360 * DEG_TO_RAD;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;

export function useInteraction(ref: React.RefObject<HTMLElement | null>) {
  const [state, setState] = useState<InteractionState>({
    rotationX: 0,
    rotationY: 0,
    scale: 1,
    isInteracting: false,
  });

  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastPinchDist = useRef(0);
  const isPinching = useRef(false);
  const interactionTimeout = useRef<number | null>(null);

  const setInteractingFalse = useCallback(() => {
    setState((prev) => ({ ...prev, isInteracting: false }));
  }, []);

  const scheduleInteractionEnd = useCallback(() => {
    if (interactionTimeout.current) {
      window.clearTimeout(interactionTimeout.current);
    }
    interactionTimeout.current = window.setTimeout(setInteractingFalse, 100);
  }, [setInteractingFalse]);

  const clampRotation = (v: number) => Math.max(MIN_ROTATION, Math.min(MAX_ROTATION, v));
  const clampScale = (v: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, v));

  // Mouse events
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        isDragging.current = true;
        lastX.current = e.clientX;
        lastY.current = e.clientY;
        setState((prev) => ({ ...prev, isInteracting: true }));
        if (interactionTimeout.current) {
          window.clearTimeout(interactionTimeout.current);
        }
        el.setPointerCapture(e.pointerId);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastX.current;
      const dy = e.clientY - lastY.current;
      lastX.current = e.clientX;
      lastY.current = e.clientY;

      setState((prev) => ({
        ...prev,
        rotationY: clampRotation(prev.rotationY + dx * SENSITIVITY),
        rotationX: clampRotation(prev.rotationX + dy * SENSITIVITY),
      }));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging.current) {
        isDragging.current = false;
        try {
          el.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        scheduleInteractionEnd();
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      setState((prev) => ({
        ...prev,
        scale: clampScale(prev.scale * delta),
        isInteracting: true,
      }));
      scheduleInteractionEnd();
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('pointerleave', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('pointerleave', onPointerUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [ref, scheduleInteractionEnd]);

  // Touch events (for pinch zoom)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const getPinchDist = (t0: Touch, t1: Touch) => {
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isPinching.current = true;
        isDragging.current = false;
        lastPinchDist.current = getPinchDist(e.touches[0], e.touches[1]);
        setState((prev) => ({ ...prev, isInteracting: true }));
        if (interactionTimeout.current) {
          window.clearTimeout(interactionTimeout.current);
        }
      } else if (e.touches.length === 1 && !isPinching.current) {
        isDragging.current = true;
        lastX.current = e.touches[0].clientX;
        lastY.current = e.touches[0].clientY;
        setState((prev) => ({ ...prev, isInteracting: true }));
        if (interactionTimeout.current) {
          window.clearTimeout(interactionTimeout.current);
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isPinching.current && e.touches.length === 2) {
        e.preventDefault();
        const dist = getPinchDist(e.touches[0], e.touches[1]);
        const ratio = dist / lastPinchDist.current;
        lastPinchDist.current = dist;
        setState((prev) => ({
          ...prev,
          scale: clampScale(prev.scale * ratio),
        }));
      } else if (isDragging.current && e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - lastX.current;
        const dy = t.clientY - lastY.current;
        lastX.current = t.clientX;
        lastY.current = t.clientY;
        setState((prev) => ({
          ...prev,
          rotationY: clampRotation(prev.rotationY + dx * SENSITIVITY),
          rotationX: clampRotation(prev.rotationX + dy * SENSITIVITY),
        }));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinching.current = false;
      }
      if (e.touches.length === 0) {
        isDragging.current = false;
        scheduleInteractionEnd();
      } else if (e.touches.length === 1 && !isDragging.current) {
        isDragging.current = true;
        lastX.current = e.touches[0].clientX;
        lastY.current = e.touches[0].clientY;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [ref, scheduleInteractionEnd]);

  const setRotation = useCallback((rotationX: number, rotationY: number) => {
    setState((prev) => ({
      ...prev,
      rotationX: clampRotation(rotationX),
      rotationY: clampRotation(rotationY),
    }));
  }, []);

  return {
    ...state,
    setRotation,
  };
}
