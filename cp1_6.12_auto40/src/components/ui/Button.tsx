import { memo, forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { ComponentState, ButtonVariant } from '@/types/component';
import './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  state?: ComponentState;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', state = 'default', loading, success, error, children, className, disabled, ...props }, ref) => {
    const isLoading = loading || state === 'loading';
    const isSuccess = success || state === 'success';
    const isError = error || state === 'error';
    const isDisabled = disabled || state === 'disabled';

    const stateClass = [
      `ss-btn--${variant}`,
      state !== 'default' && `ss-btn--state-${state}`,
      isLoading && 'ss-btn--loading',
      isSuccess && 'ss-btn--success',
      isError && 'ss-btn--error',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={`ss-btn ${stateClass}`}
        disabled={isDisabled || isLoading}
        data-state={state}
        {...props}
      >
        {isLoading && <Loader2 className="ss-btn__icon ss-btn__spinner" size={18} />}
        {isSuccess && !isLoading && <Check className="ss-btn__icon" size={18} />}
        {isError && !isLoading && <X className="ss-btn__icon" size={18} />}
        {!isLoading && !isSuccess && !isError && children}
        {isLoading && <span className="ss-btn__text">加载中...</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default memo(Button);
