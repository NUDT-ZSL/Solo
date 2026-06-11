import { useState } from 'react';

interface Props {
  onGenerate: () => void;
  onClear: () => void;
  isGenerating: boolean;
  ratingsCount: number;
}

export default function Toolbar({ onGenerate, onClear, isGenerating, ratingsCount }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirmClear = () => {
    setShowConfirm(false);
    onClear();
  };

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-info">
          <span className="data-count">
            数据条数: <strong>{ratingsCount}</strong>
          </span>
        </div>
        <div className="toolbar-actions">
          <button
            className="primary-btn"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? '生成中...' : '生成模拟评分'}
          </button>
          <button
            className="danger-btn"
            onClick={() => setShowConfirm(true)}
            disabled={isGenerating || ratingsCount === 0}
          >
            清空所有数据
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <p className="modal-text">确定要清空所有评分数据吗？此操作不可恢复。</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowConfirm(false)}>取消</button>
              <button className="confirm-btn" onClick={handleConfirmClear}>确定清空</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
