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
      'a[href]',
      'button:not([disabled]):not([aria-hidden])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]',
      'details summary',
    ];
    return Array.from(
      container.querySelectorAll(focusableSelectors.join(', '))
    ).filter((el) => {
      if (el.getAttribute('aria-hidden') === 'true') return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && !el.hasAttribute('disabled');
    }) as HTMLElement[];
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open || !dialogRef.current) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();

        const focusableElements = getFocusableElements(dialogRef.current);

        if (focusableElements.length === 0) {
          dialogRef.current.focus();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement as HTMLElement;

        const isInsideDialog = dialogRef.current.contains(activeElement);
        const focusIndex = isInsideDialog
          ? focusableElements.indexOf(activeElement)
          : -1;

        if (e.shiftKey) {
          if (!isInsideDialog || focusIndex <= 0) {
            lastElement.focus();
          } else {
            focusableElements[focusIndex - 1].focus();
          }
        } else {
          if (!isInsideDialog || focusIndex === focusableElements.length - 1) {
            firstElement.focus();
          } else {
            focusableElements[focusIndex + 1].focus();
          }
        }
      }
    },
    [open, onClose, getFocusableElements]
  );

  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;

      if (focusPolicy) {
        focusManager.pushFocus(previouslyFocusedRef.current);

        if (dialogRef.current) {
          requestAnimationFrame(() => {
            if (!dialogRef.current) return;
            const focusableElements = getFocusableElements(dialogRef.current);
            if (focusableElements.length > 0) {
              focusableElements[0].focus();
            } else {
              dialogRef.current!.focus();
            }
          });
        }
      }

      document.addEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
        document.body.style.overflow = '';
      };
    }
  }, [open, focusPolicy, handleKeyDown, getFocusableElements]);

  useEffect(() => {
    if (!open && previouslyFocusedRef.current && focusPolicy) {
      focusManager.restoreFocus();
      previouslyFocusedRef.current = null;
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
        tabIndex={-1}
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
