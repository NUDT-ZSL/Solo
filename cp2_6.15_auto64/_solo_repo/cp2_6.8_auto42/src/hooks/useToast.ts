import { useState, useCallback } from 'react';
import type { Toast, ToastType } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 1500);
    return id;
  }, []);

  return { toasts, showToast };
}
