import { useEffect, useRef, useCallback } from 'react';

type Direction = 'north' | 'south' | 'east' | 'west';

interface UseGameControlsOptions {
  onMove: (direction: Direction) => void;
  enabled?: boolean;
}

const KEY_MAP: Record<string, Direction> = {
  'w': 'north',
  'W': 'north',
  'ArrowUp': 'north',
  's': 'south',
  'S': 'south',
  'ArrowDown': 'south',
  'a': 'west',
  'A': 'west',
  'ArrowLeft': 'west',
  'd': 'east',
  'D': 'east',
  'ArrowRight': 'east'
};

const SWIPE_THRESHOLD = 30;

export function useGameControls({ onMove, enabled = true }: UseGameControlsOptions): void {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastSwipeTimeRef = useRef<number>(0);
  const SWIPE_COOLDOWN = 200;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    const direction = KEY_MAP[event.key];
    if (direction) {
      event.preventDefault();
      onMove(direction);
    }
  }, [onMove, enabled]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!enabled) return;
    
    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
  }, [enabled]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!enabled || !touchStartRef.current) return;

    const now = Date.now();
    if (now - lastSwipeTimeRef.current < SWIPE_COOLDOWN) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
      if (absX > absY) {
        onMove(deltaX > 0 ? 'east' : 'west');
      } else {
        onMove(deltaY > 0 ? 'south' : 'north');
      }
      lastSwipeTimeRef.current = now;
    }

    touchStartRef.current = null;
  }, [onMove, enabled]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (enabled) {
      event.preventDefault();
    }
  }, [enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    const gameElement = document.getElementById('root');
    if (gameElement) {
      gameElement.addEventListener('touchstart', handleTouchStart, { passive: false });
      gameElement.addEventListener('touchend', handleTouchEnd, { passive: false });
      gameElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gameElement) {
        gameElement.removeEventListener('touchstart', handleTouchStart);
        gameElement.removeEventListener('touchend', handleTouchEnd);
        gameElement.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [handleKeyDown, handleTouchStart, handleTouchEnd, handleTouchMove]);
}

export function useMobileControls(): {
  handleButtonDown: (direction: Direction) => void;
} {
  const lastPressTimeRef = useRef<number>(0);
  const PRESS_COOLDOWN = 200;

  const handleButtonDown = useCallback((direction: Direction) => {
    const now = Date.now();
    if (now - lastPressTimeRef.current >= PRESS_COOLDOWN) {
      const event = new CustomEvent('mobileMove', { detail: direction });
      window.dispatchEvent(event);
      lastPressTimeRef.current = now;
    }
  }, []);

  return { handleButtonDown };
}

export function useMobileMoveListener(
  onMove: (direction: Direction) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    const handler = (event: Event) => {
      if (!enabled) return;
      const customEvent = event as CustomEvent<Direction>;
      onMove(customEvent.detail);
    };

    window.addEventListener('mobileMove', handler);
    return () => window.removeEventListener('mobileMove', handler);
  }, [onMove, enabled]);
}
