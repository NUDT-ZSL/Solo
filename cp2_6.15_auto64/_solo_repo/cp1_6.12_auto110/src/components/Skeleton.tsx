import React, { memo } from 'react';
import { DataState } from '../lib/stateManager';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  rows?: number;
  dataState: DataState;
}

const Skeleton: React.FC<SkeletonProps> = memo(({ rows = 3, dataState }) => {
  return (
    <div className={`${styles.skeletonWrapper} ${styles[dataState]}`}>
      {dataState === 'loading' && (
        <div className={styles.loadingContent}>
          <div className={`${styles.skeletonAvatar}`}></div>
          <div className={styles.skeletonLines}>
            {Array.from({ length: rows }).map((_, i) => (
              <div
                key={i}
                className={`${styles.skeletonLine} ${i === 0 ? styles.firstLine : ''}`}
              ></div>
            ))}
          </div>
        </div>
      )}
      {dataState === 'empty' && (
        <div className={styles.emptyContent}>
          <div className={styles.emptyBox}>
            <span className={styles.emptyText}>暂无数据</span>
          </div>
        </div>
      )}
      {dataState === 'error' && (
        <div className={styles.errorContent}>
          <span className={styles.errorIcon}>❌</span>
          <span className={styles.errorText}>数据加载失败</span>
          <button className={styles.retryBtn}>重试</button>
        </div>
      )}
      {dataState === 'normal' && (
        <div className={styles.normalContent}>
          <div className={styles.avatar}>👤</div>
          <div className={styles.content}>
            <h4 className={styles.title}>User Name</h4>
            <p className={styles.description}>
              This is normal content showing how the skeleton component looks after data loads successfully.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

Skeleton.displayName = 'Skeleton';

export default Skeleton;
