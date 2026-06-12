import React, { memo, useState, useEffect } from 'react';
import { DataState } from '../lib/stateManager';
import styles from './Modal.module.css';

interface ModalProps {
  title?: string;
  content?: string;
  dataState: DataState;
}

const Modal: React.FC<ModalProps> = memo(({ title = 'Modal Title', content = 'This is the modal content. You can put any information here.', dataState }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (dataState === 'normal') {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [dataState]);

  return (
    <div className={`${styles.modalWrapper} ${styles[dataState]}`}>
      {dataState === 'loading' && (
        <div className={styles.skeletonModal}>
          <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`}></div>
          <div className={`${styles.skeletonLine} ${styles.skeletonText}`}></div>
          <div className={`${styles.skeletonLine} ${styles.skeletonText}`}></div>
          <div className={`${styles.skeletonLine} ${styles.skeletonButton}`}></div>
        </div>
      )}
      {dataState === 'empty' && (
        <div className={styles.emptyModal}>
          <span className={styles.emptyIcon}>📭</span>
          <span className={styles.emptyText}>暂无内容</span>
        </div>
      )}
      {dataState === 'error' && (
        <div className={styles.errorModal}>
          <span className={styles.errorIcon}>⚠️</span>
          <span className={styles.errorText}>加载失败</span>
        </div>
      )}
      {dataState === 'normal' && (
        <>
          {isOpen && (
            <div className={styles.modalOverlay} onClick={() => setIsOpen(false)}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.modalTitle}>{title}</h3>
                <p className={styles.modalContent}>{content}</p>
                <div className={styles.modalFooter}>
                  <button className={`${styles.modalBtn} ${styles.cancelBtn}`} onClick={() => setIsOpen(false)}>
                    取消
                  </button>
                  <button className={`${styles.modalBtn} ${styles.confirmBtn}`} onClick={() => setIsOpen(false)}>
                    确定
                  </button>
                </div>
              </div>
            </div>
          )}
          {!isOpen && (
            <button className={styles.openBtn} onClick={() => setIsOpen(true)}>
              打开弹窗
            </button>
          )}
        </>
      )}
    </div>
  );
});

Modal.displayName = 'Modal';

export default Modal;
