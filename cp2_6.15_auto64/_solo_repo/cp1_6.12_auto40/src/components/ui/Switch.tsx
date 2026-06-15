import { memo, forwardRef, useState } from 'react';
import { ComponentState } from '@/types/component';
import './Switch.css';

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  state?: ComponentState;
  disabled?: boolean;
  label?: string;
  size?: 'small' | 'medium';
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked: externalChecked, defaultChecked = false, onChange, state = 'default', disabled, label, size = 'medium' }, ref) => {
    const [internalChecked, setInternalChecked] = useState(defaultChecked);
    const isChecked = externalChecked !== undefined ? externalChecked : internalChecked;
    const isDisabled = disabled || state === 'disabled';

    const handleClick = () => {
      if (isDisabled) return;
      const newChecked = !isChecked;
      if (externalChecked === undefined) {
        setInternalChecked(newChecked);
      }
      onChange?.(newChecked);
    };

    const stateClass = [
      `ss-switch--${size}`,
      isChecked ? 'ss-switch--checked' : 'ss-switch--unchecked',
      state !== 'default' && `ss-switch--state-${state}`,
      isDisabled && 'ss-switch--disabled',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <label className={`ss-switch-wrapper ${stateClass}`} data-state={state}>
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={isChecked}
          className={`ss-switch ${stateClass}`}
          onClick={handleClick}
          disabled={isDisabled}
        >
          <span className="ss-switch__track">
            <span className="ss-switch__thumb" />
          </span>
        </button>
        {label && <span className="ss-switch__label">{label}</span>}
      </label>
    );
  }
);

Switch.displayName = 'Switch';

export default memo(Switch);
