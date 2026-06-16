import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

type ToastType = 'success' | 'info' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  phase: 'entering' | 'visible' | 'exiting';
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

const SLIDE_DURATION = 350;
const VISIBLE_DURATION = 3000;
const EXIT_DURATION = 300;

const ToastItemComponent: React.FC<{ toast: ToastItem; onExit: (id: number) => void }> = ({ toast, onExit }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!elementRef.current) return;

    const element = elementRef.current;
    startTimeRef.current = performance.now();

    if (toast.phase === 'entering') {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / SLIDE_DURATION, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const translateX = 120 * (1 - easeProgress);
        const opacity = easeProgress;

        element.style.transform = `translateX(${translateX}%)`;
        element.style.opacity = String(opacity);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          element.style.transform = 'translateX(0%)';
          element.style.opacity = '1';
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }

    if (toast.phase === 'exiting') {
      startTimeRef.current = performance.now();
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / EXIT_DURATION, 1);
        const easeProgress = progress * progress;
        const translateX = 120 * easeProgress;
        const opacity = 1 - easeProgress;

        element.style.transform = `translateX(${translateX}%)`;
        element.style.opacity = String(opacity);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          onExit(toast.id);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [toast.phase, toast.id, onExit]);

  const bgColors: Record<ToastType, string> = {
    success: '#27AE60',
    info: '#2E86C1',
    error: '#E74C3C',
  };

  return (
    <div
      ref={elementRef}
      className={`toast-item toast-${toast.type}`}
      style={{
        padding: '12px 20px',
        borderRadius: '8px',
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        minWidth: 220,
        backgroundColor: bgColors[toast.type],
        transform: 'translateX(120%)',
        opacity: 0,
      }}
    >
      {toast.message}
    </div>
  );
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const startExit = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, phase: 'exiting' as const } : t))
    );
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;

    const newToast: ToastItem = {
      id,
      message,
      type,
      phase: 'entering',
    };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, phase: 'visible' as const } : t))
      );
    }, SLIDE_DURATION);

    setTimeout(() => {
      startExit(id);
    }, VISIBLE_DURATION);
  }, [startExit]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <ToastItemComponent key={toast.id} toast={toast} onExit={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
