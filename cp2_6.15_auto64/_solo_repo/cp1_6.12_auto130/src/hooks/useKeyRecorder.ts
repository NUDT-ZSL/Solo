import { useState, useCallback, useEffect, useRef } from 'react';

export function useKeyRecorder(initialValue: string = '') {
  const [combo, setCombo] = useState<string>(initialValue);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const pressedKeys = useRef<Set<string>>(new Set());
  const timerRef = useRef<number | null>(null);

  const normalizeKey = useCallback((e: KeyboardEvent): string => {
    const key = e.key;
    if (key === 'Control') return 'Ctrl';
    if (key === 'Meta' || key === 'OS') return 'Win';
    if (key === ' ') return 'Space';
    if (key === 'ArrowUp') return 'Up';
    if (key === 'ArrowDown') return 'Down';
    if (key === 'ArrowLeft') return 'Left';
    if (key === 'ArrowRight') return 'Right';
    if (key === 'Escape') return 'Esc';
    if (key === 'Backspace') return 'Back';
    if (key === 'CapsLock') return 'Caps';
    if (key === 'ContextMenu') return 'Menu';
    if (key.length === 1) return key.toUpperCase();
    return key;
  }, []);

  const isModifier = useCallback((key: string): boolean => {
    return ['Ctrl', 'Alt', 'Shift', 'Win'].includes(key);
  }, []);

  const buildComboString = useCallback((): string => {
    const order = ['Ctrl', 'Win', 'Alt', 'Shift'];
    const modifiers: string[] = [];
    const regular: string[] = [];

    pressedKeys.current.forEach(k => {
      if (isModifier(k)) {
        modifiers.push(k);
      } else {
        regular.push(k);
      }
    });

    modifiers.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    return [...modifiers, ...regular].join('+');
  }, [isModifier]);

  useEffect(() => {
    if (!isRecording) return;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      clearTimer();
      const key = normalizeKey(e);
      pressedKeys.current.add(key);
      setCombo(buildComboString());
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = normalizeKey(e);
      pressedKeys.current.delete(key);

      timerRef.current = window.setTimeout(() => {
        if (pressedKeys.current.size === 0) {
          setIsRecording(false);
        }
      }, 150);
    };

    const onFocusOut = () => {
      setIsRecording(false);
      pressedKeys.current.clear();
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onFocusOut);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onFocusOut);
      clearTimer();
      pressedKeys.current.clear();
    };
  }, [isRecording, normalizeKey, buildComboString]);

  const startRecording = useCallback(() => {
    pressedKeys.current.clear();
    setCombo('');
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    pressedKeys.current.clear();
    setIsRecording(false);
  }, []);

  const reset = useCallback(() => {
    pressedKeys.current.clear();
    setCombo('');
    setIsRecording(false);
  }, []);

  const setValue = useCallback((v: string) => {
    setCombo(v);
  }, []);

  return {
    combo,
    isRecording,
    startRecording,
    stopRecording,
    reset,
    setValue,
  };
}
