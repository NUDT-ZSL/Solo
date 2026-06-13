import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
}

interface Ctx {
  showToast: (msg: string) => void;
}

const ToastCtx = createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {items.map((t) => (
          <div className="toast" key={t.id}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
