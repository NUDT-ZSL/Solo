import React, { memo } from 'react';
import { DataState } from '../lib/stateManager';
import styles from './Badge.module.css';

interface BadgeProps {
  count?: number;
  text?: string;
  dataState: DataState;
}

const Badge: React.FC<BadgeProps> = memo(({ count = 5, text = 'New', dataState }) => {
  return (
    <div className={`${styles.badgeWrapper} ${styles[dataState]}`}>
      {dataState === 'loading' && (
        <div className={styles.skeletonBadge}></div>
      )}
      {dataState === 'empty' && (
        <span className={`${styles.badge} ${styles.emptyBadge}`}>0</span>
      )}
      {dataState === 'error' && (
        <span className={`${styles.badge} ${styles.errorBadge}`}>!</span>
      )}
      {dataState === 'normal' && (
        <span className={`${styles.badge} ${styles.normalBadge}`}>
          {count > 99 ? '99+' : count}
        </span>
      )}
      <span className={styles.badgeLabel}>{text}</span>
    </div>
  );
});

Badge.displayName = 'Badge';

export default Badge;
