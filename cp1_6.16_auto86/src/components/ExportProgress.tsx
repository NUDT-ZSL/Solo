import React from 'react';
import { THEME } from '../types';

interface Props {
  progress: number;
}

const ExportProgress: React.FC<Props> = ({ progress }) => {
  return (
    <div className="export-overlay">
      <div className="export-dialog">
        <div className="export-title">正在导出混音...</div>
        <div className="export-bar-container">
          <div
            className="export-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="export-percent">{Math.round(progress)}%</div>
      </div>
    </div>
  );
};

export default ExportProgress;
