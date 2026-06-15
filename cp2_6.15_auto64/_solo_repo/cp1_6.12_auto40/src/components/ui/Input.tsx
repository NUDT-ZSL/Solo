import React, { memo, forwardRef, InputHTMLAttributes, useState } from 'react';
import { Search, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { ComponentState, InputType } from '@/types/component';
import './Input.css';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: InputType;
  state?: ComponentState;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ type = 'text', state = 'default', loading, success, error, showPasswordToggle = true, className, disabled, value: externalValue, onChange, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const isLoading = loading || state === 'loading';
    const isSuccess = success || state === 'success';
    const isError = error || state === 'error';
    const isDisabled = disabled || state === 'disabled';

    const inputValue = externalValue !== undefined ? externalValue : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (externalValue === undefined) {
        setInternalValue(e.target.value);
      }
      onChange?.(e);
    };

    const actualType = type === 'password' && showPassword ? 'text' : type;

    const stateClass = [
      `ss-input--${type}`,
      state !== 'default' && `ss-input--state-${state}`,
      isLoading && 'ss-input--loading',
      isSuccess && 'ss-input--success',
      isError && 'ss-input--error',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`ss-input-wrapper ${stateClass}`} data-state={state}>
        {type === 'search' && (
          <Search className="ss-input__prefix-icon" size={18} />
        )}
        <input
          ref={ref}
          type={actualType}
          className="ss-input"
          disabled={isDisabled || isLoading}
          value={inputValue}
          onChange={handleChange}
          {...props}
        />
        {type === 'password' && showPasswordToggle && (
          <button
            type="button"
            className="ss-input__suffix-btn"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isDisabled}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {isLoading && <Loader2 className="ss-input__suffix-icon ss-input__spinner" size={18} />}
        {isSuccess && !isLoading && <Check className="ss-input__suffix-icon ss-input__icon-success" size={18} />}
        {isError && !isLoading && <X className="ss-input__suffix-icon ss-input__icon-error" size={18} />}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default memo(Input);
