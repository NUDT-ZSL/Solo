import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterVolume: number;
  onVolumeChange: (volume: number) => void;
  textSpeed: number;
  onTextSpeedChange: (speed: number) => void;
  onResetGame: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  masterVolume,
  onVolumeChange,
  onResetGame,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    onResetGame();
    setShowResetConfirm(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">设置</h2>

        <div className="setting-item">
          <label className="setting-label">主音量</label>
          <input
            type="range"
            min="0"
            max="100"
            value={masterVolume * 100}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            className="volume-slider"
          />
          <span className="setting-value">{Math.round(masterVolume * 100)}%</span>
        </div>

        <div className="setting-item">
          <button className="game-btn danger" onClick={handleReset}>
            重置游戏进度
          </button>
        </div>

        {showResetConfirm && (
          <div className="confirm-dialog">
            <p>确定要重置所有游戏进度吗？此操作不可撤销。</p>
            <div className="confirm-buttons">
              <button className="game-btn small" onClick={() => setShowResetConfirm(false)}>
                取消
              </button>
              <button className="game-btn danger small" onClick={confirmReset}>
                确定
              </button>
            </div>
          </div>
        )}

        <button className="modal-close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;
