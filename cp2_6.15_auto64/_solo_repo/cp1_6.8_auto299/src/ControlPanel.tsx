import React, { useState } from 'react';
import {
  EmotionType,
  EMOTIONS,
  EMOTION_LABELS,
  getEmotionColor,
} from './utils/colorMap';

interface ControlPanelProps {
  selectedEmotion: EmotionType | null;
  onEmotionChange: (emotion: EmotionType) => void;
  intensity: number;
  onIntensityChange: (val: number) => void;
  note: string;
  onNoteChange: (val: string) => void;
  onSubmit: () => void;
  onExport: () => void;
  viewMode: 'week' | 'month';
  onViewModeChange: (mode: 'week' | 'month') => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedEmotion,
  onEmotionChange,
  intensity,
  onIntensityChange,
  note,
  onNoteChange,
  onSubmit,
  onExport,
  viewMode,
  onViewModeChange,
}) => {
  const [hoveredEmotion, setHoveredEmotion] = useState<EmotionType | null>(null);

  return (
    <div className="control-panel">
      <div className="control-row">
        <div className="emotion-buttons">
          {EMOTIONS.map((emotion) => {
            const colors = getEmotionColor(emotion);
            const isActive = selectedEmotion === emotion;
            const isHovered = hoveredEmotion === emotion;
            return (
              <button
                key={emotion}
                className={`emotion-btn ${isActive ? 'active' : ''}`}
                style={{
                  '--btn-color': colors.main,
                  '--btn-glow': colors.glow,
                  backgroundColor: isActive ? colors.main : isHovered ? colors.light : 'rgba(255,255,255,0.6)',
                  color: isActive ? '#fff' : '#333',
                  boxShadow: isActive
                    ? `0 0 16px ${colors.glow}`
                    : isHovered
                    ? `0 0 20px ${colors.glow}`
                    : 'none',
                } as React.CSSProperties}
                onClick={() => onEmotionChange(emotion)}
                onMouseEnter={() => setHoveredEmotion(emotion)}
                onMouseLeave={() => setHoveredEmotion(null)}
              >
                {EMOTION_LABELS[emotion]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="control-row">
        <div className="slider-group">
          <label className="slider-label">强度</label>
          <input
            type="range"
            min={1}
            max={10}
            value={intensity}
            onChange={(e) => onIntensityChange(Number(e.target.value))}
            className="intensity-slider"
          />
          <span className="slider-value">{intensity}</span>
        </div>
      </div>

      <div className="control-row">
        <input
          type="text"
          className="note-input"
          placeholder="添加备注..."
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          maxLength={100}
        />
      </div>

      <div className="control-row actions">
        <button className="submit-btn" onClick={onSubmit} disabled={!selectedEmotion}>
          记录
        </button>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => onViewModeChange('week')}
          >
            周
          </button>
          <button
            className={`toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => onViewModeChange('month')}
          >
            月
          </button>
        </div>
        <button className="export-btn" onClick={onExport}>
          导出图片
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
