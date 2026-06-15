import React, { forwardRef, useCallback } from 'react';

interface AccessibleButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
  id?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ children, onClick, disabled = false, ariaLabel, ariaDescribedBy, className = '', id, type = 'button' }, ref) => {
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      },
      [disabled, onClick]
    );

    return (
      <button
        ref={ref}
        id={id}
        type={type}
        className={`a11y-button ${className}`}
        onClick={disabled ? undefined : onClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        {children}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';
