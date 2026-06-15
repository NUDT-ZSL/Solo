import React, { useEffect, useRef, useCallback } from 'react';
import { focusManager } from '../engine/focusManager';

interface AccessibleDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
  focusPolicy?: boolean;
  ariaLabel?: string;
}

export const AccessibleDialog: React.FC<AccessibleDialogProps> = ({
  open,
  onClose,
  title,
  children,
  focusPolicy = true,
  ariaLabel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`dialog-title-${Math.random().toString(36).substr(2, 9)}`);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];
    return Array.from(
      container.querySelectorAll(focusableSelectors.join(', '))
    ) as HTMLElement[];
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = getFocusableElements(dialogRef.current);
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement as HTMLElement;

        if (e.shiftKey && activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    },
    [open, onClose, getFocusableElements]
  );

  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      focusManager.pushFocus(previouslyFocusedRef.current);

      if (focusPolicy && dialogRef.current) {
        const focusableElements = getFocusableElements(dialogRef.current);
        if (focusableElements.length > 0) {
          setTimeout(() => focusableElements[0].focus(), 0);
        }
      }

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [open, focusPolicy, handleKeyDown, getFocusableElements]);

  useEffect(() => {
    if (!open && previouslyFocusedRef.current && focusPolicy) {
      focusManager.restoreFocus();
    }
  }, [open, focusPolicy]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="dialog-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabel ? undefined : titleId.current}
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId.current} className="dialog-title">
          {title}
        </h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">
          <button className="dialog-close-btn" onClick={onClose} aria-label="关闭弹窗">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
