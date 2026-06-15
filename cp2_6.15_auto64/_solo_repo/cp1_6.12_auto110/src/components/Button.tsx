import React, { memo } from 'react';
import { DataState } from '../lib/stateManager';
import styles from './Button.module.css';

interface ButtonProps {
  label?: string;
  onClick?: () => void;
  dataState: DataState;
}

const Button: React.FC<ButtonProps> = memo(({ label = 'Click Me', onClick, dataState }) => {
  const handleClick = () => {
    if (dataState === 'normal' && onClick) {
      onClick();
    }
  };

  return (
    <button
      className={`${styles.button} ${styles[dataState]}`}
      onClick={handleClick}
      disabled={dataState === 'loading' || dataState === 'error'}
    >
      {dataState === 'loading' && (
        <span className={styles.spinner}></span>
      )}
      {dataState === 'empty' && 'No Action'}
      {dataState === 'error' && 'Error'}
      {dataState === 'normal' && label}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
