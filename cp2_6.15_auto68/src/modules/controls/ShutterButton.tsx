import React, { useState, useCallback } from 'react';

interface Props {
  onClick: () => void;
  disabled?: boolean;
}

const ShutterButton: React.FC<Props> = ({ onClick, disabled }) => {
  const [animating, setAnimating] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled || animating) return;
    setAnimating(true);
    onClick();
    setTimeout(() => setAnimating(false), 200);
  }, [onClick, disabled, animating]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled || animating}
      aria-label="快门按钮"
      style={{
        ...styles.button,
        ...(animating ? { width: 32, height: 32 } : {}),
      }}
      className={animating ? 'shutter-press' : ''}
    >
      <div style={styles.innerCircle} />
    </button>
  );
};

const styles: Record<string, React.CSSProperties> = {
  button: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '2px solid #7f0000',
    background: 'radial-gradient(circle at 30% 30%, #e53935 0%, #c62828 50%, #b71c1c 100%)',
    boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.25), inset 0 -3px 8px rgba(0,0,0,0.4), 0 3px 10px rgba(0,0,0,0.5)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    transition: 'background 0.2s ease, box-shadow 0.2s ease, width 0.15s ease, height 0.15s ease',
    outline: 'none',
  },
  innerCircle: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 40% 40%, #ffcdd2, #ef9a9a 60%, transparent)',
    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5)',
  },
};

export default ShutterButton;
