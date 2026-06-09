import React from 'react';
import type { Rubbing, Mode } from '../../types';

interface TopNavProps {
  rubbings: Rubbing[];
  selectedRubbingId: string;
  onRubbingChange: (id: string) => void;
  onUpload: () => void;
  onScore: () => void;
  isScoring: boolean;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  rubbings,
  selectedRubbingId,
  onRubbingChange,
  onUpload,
  onScore,
  isScoring,
  mode,
  onModeChange
}) => {
  return (
    <div className="top-nav">
      <div className="logo">
        <div className="logo-seal">墨</div>
        <span>墨池习字</span>
      </div>

      <div className="nav-controls">
        <select
          className="rubbing-select"
          value={selectedRubbingId}
          onChange={(e) => onRubbingChange(e.target.value)}
        >
          <option value="">选择碑帖…</option>
          {rubbings.map(r => (
            <option key={r.id} value={r.id}>
              {r.isExample ? '【示例】' : ''}{r.name}
            </option>
          ))}
        </select>

        <button className="upload-btn" onClick={onUpload}>
          📤 上传碑帖
        </button>

        {mode === 'copy' && (
          <button className="score-btn" onClick={onScore} disabled={isScoring}>
            {isScoring ? '评分中…' : '✦ 评分'}
          </button>
        )}

        <div className="mode-toggle">
          <div
            className={`mode-option ${mode === 'copy' ? 'active' : ''}`}
            onClick={() => onModeChange('copy')}
          >
            临摹模式
          </div>
          <div
            className={`mode-option ${mode === 'creation' ? 'active' : ''}`}
            onClick={() => onModeChange('creation')}
          >
            集字创作
          </div>
        </div>
      </div>
    </div>
  );
};
