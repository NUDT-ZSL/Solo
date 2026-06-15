import React, { useEffect, useRef, useCallback } from 'react';
import { focusManager } from '../engine/focusManager';

export interface ToastItem {
  id: string;
  message: string;
  duration?: number;
}

interface AccessibleToastProps {
  messages: ToastItem[];
  onRemove: (id: string) => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const AccessibleToast: React.FC<AccessibleToastProps> = ({ messages, onRemove, triggerRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<Map<string, number>>(new Map());
  const prevMessageCountRef = useRef(0);

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

    const activeIds = new Set(messages.map((m) => m.id));
    timersRef.current.forEach((_, id) => {
      if (!activeIds.has(id)) {
        const timer = timersRef.current.get(id);
        if (timer) window.clearTimeout(timer);
        timersRef.current.delete(id);
      }
    });
  }, [messages, handleRemove]);

  useEffect(() => {
    if (prevMessageCountRef.current > 0 && messages.length === 0) {
      if (triggerRef?.current) {
        focusManager.pushFocus(triggerRef.current);
        focusManager.restoreFocus();
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, triggerRef]);

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
