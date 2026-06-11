import React from 'react';
import { useRaceStore } from '../store/useRaceStore';

const ShareModal: React.FC = () => {
  const { showShareModal, shareImageData, setShowShareModal, setShareImageData } =
    useRaceStore();

  if (!showShareModal) return null;

  const handleClose = () => {
    setShowShareModal(false);
    setTimeout(() => setShareImageData(null), 300);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">分 享 快 照</div>
          <button className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>
        {shareImageData ? (
          <img src={shareImageData} alt="Race Snapshot" className="modal-image" />
        ) : (
          <div className="empty-state" style={{ minHeight: 200 }}>
            <div className="empty-icon">⏳</div>
            <div className="empty-text">正在生成快照...</div>
          </div>
        )}
        <div className="modal-hint">右键图片另存为本地文件保存</div>
      </div>
    </div>
  );
};

export default ShareModal;
