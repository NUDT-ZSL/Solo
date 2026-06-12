import React, { memo, useState } from 'react';
import { DataState } from '../lib/stateManager';
import styles from './Input.module.css';

interface InputProps {
  placeholder?: string;
  dataState: DataState;
}

const Input: React.FC<InputProps> = memo(({ placeholder = 'Enter text...', dataState }) => {
  const [value, setValue] = useState('');

  return (
    <div className={`${styles.inputWrapper} ${styles[dataState]}`}>
      {dataState === 'loading' && (
        <div className={styles.skeletonInput}></div>
      )}
      {dataState === 'empty' && (
        <input
          type="text"
          className={`${styles.input} ${styles.emptyInput}`}
          placeholder="暂无内容"
          disabled
        />
      )}
      {dataState === 'error' && (
        <div className={styles.errorWrapper}>
          <input
            type="text"
            className={`${styles.input} ${styles.errorInput}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="输入有误"
          />
          <span className={styles.errorMessage}>⚠️ 格式错误</span>
        </div>
      )}
      {dataState === 'normal' && (
        <input
          type="text"
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
