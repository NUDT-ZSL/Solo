import React, { memo } from 'react';
import { Info, AlertTriangle, XCircle, CheckCircle, X } from 'lucide-react';
import { ComponentState, AlertType } from '@/types/component';
import './Alert.css';

export interface AlertProps {
  type?: AlertType;
  state?: ComponentState;
  message: string;
  description?: string;
  closable?: boolean;
  onClose?: () => void;
  showIcon?: boolean;
}

const Alert: React.FC<AlertProps> = ({
  type = 'info',
  state = 'default',
  message,
  description,
  closable = false,
  onClose,
  showIcon = true,
}) => {
  const isDisabled = state === 'disabled';

  const iconMap: Record<AlertType, React.ReactNode> = {
    info: <Info size={20} />,
    warning: <AlertTriangle size={20} />,
    error: <XCircle size={20} />,
    success: <CheckCircle size={20} />,
  };

  const stateClass = [
    `ss-alert--${type}`,
    state !== 'default' && `ss-alert--state-${state}`,
    isDisabled && 'ss-alert--disabled',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`ss-alert ${stateClass}`}
      data-state={state}
      role="alert"
    >
      {showIcon && <span className="ss-alert__icon">{iconMap[type]}</span>}
      <div className="ss-alert__content">
        <span className="ss-alert__message">{message}</span>
        {description && <span className="ss-alert__description">{description}</span>}
      </div>
      {closable && (
        <button
          type="button"
          className="ss-alert__close"
          onClick={onClose}
          disabled={isDisabled}
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

Alert.displayName = 'Alert';

export default memo(Alert);
