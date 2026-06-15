import React, { useState, useCallback, ReactNode, MouseEvent } from 'react';

interface RippleButtonProps {
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: React.CSSProperties;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

interface Ripple {
  x: number;
  y: number;
  id: number;
}

const RippleButton: React.FC<RippleButtonProps> = ({
  onClick,
  children,
  disabled = false,
  variant = 'primary',
  style,
  className,
  type = 'button',
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const createRipple = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { x, y, id }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
  }, []);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    onClick?.(e);
  };

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--primary-color)',
      color: 'white',
    },
    secondary: {
      backgroundColor: 'var(--primary-light)',
      color: 'white',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--primary-color)',
      border: '2px solid var(--primary-color)',
    },
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`ripple-button ${className || ''}`}
      style={{
        ...styles.base,
        ...variantStyles[variant],
        ...style,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          style={{
            ...styles.ripple,
            left: ripple.x,
            top: ripple.y,
          }}
        />
      ))}
    </button>
  );
};

const styles: Record<string, React.CSSProperties> = {
  base: {
    position: 'relative',
    overflow: 'hidden',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  ripple: {
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    transform: 'translate(-50%, -50%)',
    animation: 'ripple 0.6s ease-out forwards',
    pointerEvents: 'none',
  },
};

export default RippleButton;
