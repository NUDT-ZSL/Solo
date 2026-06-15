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

type CloseReason = 'manual' | 'auto' | 'keyboard';

export const AccessibleToast: React.FC<AccessibleToastProps> = ({
  messages,
  onRemove,
  triggerRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<Map<string, number>>(new Map());
  const prevMessagesRef = useRef<Set<string>>(new Set());
  const closeReasonsRef = useRef<Map<string, CloseReason>>(new Map());
  const observerRef = useRef<MutationObserver | null>(null);

  const restoreFocusToTrigger = useCallback(() => {
    if (!triggerRef?.current) return;

    const performRestore = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!triggerRef.current) return;
          const currentFocus = document.activeElement as HTMLElement | null;
          const isBodyOrRoot =
            currentFocus === document.body ||
            currentFocus === document.documentElement ||
            !currentFocus;
          const focusIsGone =
            !currentFocus ||
            !document.contains(currentFocus) ||
            currentFocus.closest('.toast-item');
          if (isBodyOrRoot || focusIsGone) {
            focusManager.pushFocus(triggerRef.current);
            focusManager.restoreFocus();
          }
        });
      });
    };

    performRestore();
  }, [triggerRef]);

  const handleRemove = useCallback(
    (id: string, reason: CloseReason = 'auto') => {
      const timer = timersRef.current.get(id);
      if (timer) {
        window.clearTimeout(timer);
        timersRef.current.delete(id);
      }
      closeReasonsRef.current.set(id, reason);
      onRemove(id);
    },
    [onRemove]
  );

  useEffect(() => {
    const currentIds = new Set(messages.map((m) => m.id));
    const removedIds: string[] = [];
    prevMessagesRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        removedIds.push(id);
      }
    });

    const hasManualOrKeyboardRemove = removedIds.some(
      (id) =>
        closeReasonsRef.current.get(id) === 'manual' ||
        closeReasonsRef.current.get(id) === 'keyboard'
    );
    const allGone = currentIds.size === 0 && prevMessagesRef.current.size > 0;

    if ((allGone && triggerRef?.current) || hasManualOrKeyboardRemove) {
      restoreFocusToTrigger();
    }

    removedIds.forEach((id) => closeReasonsRef.current.delete(id));
    prevMessagesRef.current = currentIds;

    messages.forEach((msg) => {
      if (!timersRef.current.has(msg.id)) {
        const duration = msg.duration ?? 3000;
        const timer = window.setTimeout(() => {
          handleRemove(msg.id, 'auto');
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
  }, [messages, handleRemove, triggerRef, restoreFocusToTrigger]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    observerRef.current = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          if (
            node.childElementCount === 0 &&
            prevMessagesRef.current.size === 0 &&
            triggerRef?.current
          ) {
            restoreFocusToTrigger();
          }
        }
      }
    });

    observerRef.current.observe(node, { childList: true, subtree: false });

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [triggerRef, restoreFocusToTrigger]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
      closeReasonsRef.current.clear();
      prevMessagesRef.current.clear();
      observerRef.current?.disconnect();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRemove(id, 'keyboard');
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
            onClick={() => handleRemove(msg.id, 'manual')}
            aria-label={`关闭通知: ${msg.message}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
