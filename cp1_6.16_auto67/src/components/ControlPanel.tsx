import { useState, useCallback, useRef, useEffect } from 'react';
import './ControlPanel.css';

interface ControlPanelProps {
  dihedralAngle: number;
  onDihedralChange: (angle: number) => void;
  onReset: () => void;
  onSaveConformation: () => void;
  onToggleComparison: () => void;
  isComparisonMode: boolean;
  hasSavedConformation: boolean;
}

function ControlPanel({
  dihedralAngle,
  onDihedralChange,
  onReset,
  onSaveConformation,
  onToggleComparison,
  isComparisonMode,
  hasSavedConformation,
}: ControlPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResetFlashing, setIsResetFlashing] = useState(false);
  const [showSavedTip, setShowSavedTip] = useState(false);
  const savedTipTimerRef = useRef<number | null>(null);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      onDihedralChange(value);
    },
    [onDihedralChange]
  );

  const handleSliderMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleSliderMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleResetClick = useCallback(() => {
    onReset();
    setIsResetFlashing(true);
    window.setTimeout(() => {
      setIsResetFlashing(false);
    }, 300);
  }, [onReset]);

  const handleSaveClick = useCallback(() => {
    onSaveConformation();
    if (savedTipTimerRef.current) {
      window.clearTimeout(savedTipTimerRef.current);
    }
    setShowSavedTip(true);
    savedTipTimerRef.current = window.setTimeout(() => {
      setShowSavedTip(false);
      savedTipTimerRef.current = null;
    }, 2000);
  }, [onSaveConformation]);

  useEffect(() => {
    return () => {
      if (savedTipTimerRef.current) {
        window.clearTimeout(savedTipTimerRef.current);
      }
    };
  }, []);

  return (
    <aside className="control-panel">
      <h2 className="panel-title">控制面板</h2>

      <div className="slider-section">
        <label className="slider-label">
          二面角调节
          <span className="slider-value">{dihedralAngle.toFixed(1)}°</span>
        </label>
        <div className="slider-container">
          <input
            type="range"
            min={-180}
            max={180}
            step={0.1}
            value={dihedralAngle}
            onChange={handleSliderChange}
            onMouseDown={handleSliderMouseDown}
            onMouseUp={handleSliderMouseUp}
            onTouchStart={handleSliderMouseDown}
            onTouchEnd={handleSliderMouseUp}
            className="dihedral-slider"
          />
        </div>
        <div className="slider-current-value">
          当前二面角：{dihedralAngle.toFixed(1)}°
        </div>
        <div className="slider-range">
          <span>-180°</span>
          <span>0°</span>
          <span>180°</span>
        </div>
      </div>

      <div className="buttons-section">
        <button
          className={`control-btn reset-btn ${isResetFlashing ? 'flashing' : ''}`}
          onClick={handleResetClick}
        >
          重置构象
        </button>

        <div className="save-btn-wrapper">
          <button
            className="control-btn save-btn"
            onClick={handleSaveClick}
          >
            保存当前构象
          </button>
          {showSavedTip && <span className="saved-tip">已保存</span>}
        </div>

        <button
          className={`control-btn compare-btn ${isComparisonMode ? 'active' : ''}`}
          onClick={onToggleComparison}
        >
          {isComparisonMode ? '退出对比模式' : '进入叠加对比模式'}
        </button>
      </div>

      {hasSavedConformation && (
        <div className="status-badge">
          已保存参考构象
        </div>
      )}

      <div className="instructions">
        <p>🖱️ 鼠标拖拽旋转视角</p>
        <p>🔍 滚轮缩放场景</p>
      </div>
    </aside>
  );
}

export default ControlPanel;
