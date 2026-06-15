import React, { useEffect, useRef, useCallback } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  duration?: number;
}

interface AccessibleToastProps {
  messages: ToastItem[];
  onRemove: (id: string) => void;
}

export const AccessibleToast: React.FC<AccessibleToastProps> = ({ messages, onRemove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<Map<string, number>>(new Map());

  const handleRemove = useCallback(
    (id: string) => {
      const timer = timersRef.current.get(id);
      if (timer) {
        window.clearTimeout(timer);
        timersRef.current.delete(id);
      }
      onRemove(id);
    },
    [onRemove]
  );

  useEffect(() => {
    messages.forEach((msg) => {
      if (!timersRef.current.has(msg.id)) {
        const duration = msg.duration ?? 3000;
        const timer = window.setTimeout(() => {
          handleRemove(msg.id);
        }, duration);
        timersRef.current.set(msg.id, timer);
      }
    });

    return () => {
      // Cleanup timers for removed messages
      const activeIds = new Set(messages.map((m) => m.id));
      timersRef.current.forEach((_, id) => {
        if (!activeIds.has(id)) {
          const timer = timersRef.current.get(id);
          if (timer) window.clearTimeout(timer);
          timersRef.current.delete(id);
        }
      });
    };
  }, [messages, handleRemove]);

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRemove(id);
    }
  };

  return (
    <div
      ref={containerRef}
      className="toast-container"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      aria-label="通知消息"
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="toast-item"
          role="status"
          tabIndex={0}
          onKeyDown={(e) => handleKeyDown(e, msg.id)}
          aria-label={`通知: ${msg.message}`}
        >
          <span className="toast-message">{msg.message}</span>
          <button
            className="toast-close"
            onClick={() => handleRemove(msg.id)}
            aria-label={`关闭通知: ${msg.message}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
