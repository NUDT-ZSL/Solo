import React, { memo } from 'react';
import { DataState } from '../lib/stateManager';
import styles from './Card.module.css';

interface CardProps {
  title?: string;
  description?: string;
  dataState: DataState;
}

const Card: React.FC<CardProps> = memo(({ title = 'Card Title', description = 'This is a card description with some sample text to show how the component looks.', dataState }) => {
  return (
    <div className={`${styles.card} ${styles[dataState]}`}>
      {dataState === 'loading' && (
        <>
          <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`}></div>
          <div className={`${styles.skeletonLine} ${styles.skeletonText}`}></div>
          <div className={`${styles.skeletonLine} ${styles.skeletonText}`}></div>
        </>
      )}
      {dataState === 'empty' && (
        <div className={styles.emptyContent}>
          <span className={styles.emptyIcon}>📭</span>
          <span className={styles.emptyText}>暂无数据</span>
        </div>
      )}
      {dataState === 'error' && (
        <div className={styles.errorContent}>
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorText}>加载失败，请重试</span>
        </div>
      )}
      {dataState === 'normal' && (
        <>
          <h3 className={styles.cardTitle}>{title}</h3>
          <p className={styles.cardDescription}>{description}</p>
        </>
      )}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
