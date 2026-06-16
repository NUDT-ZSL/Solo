import React, { useEffect, useState } from 'react';
import { THEME } from '../types';

interface Props {
  progress: number;
}

const ExportProgress: React.FC<Props> = ({ progress }) => {
  const [showComplete, setShowComplete] = useState(false);
  const [prevProgress, setPrevProgress] = useState(0);

  useEffect(() => {
    if (progress >= 100 && prevProgress < 100) {
      setShowComplete(true);
    }
    setPrevProgress(progress);
  }, [progress, prevProgress]);

  const isComplete = progress >= 100;

  return (
    <div className="export-overlay">
      <div className={`export-dialog ${isComplete ? 'complete' : ''}`}>
        {isComplete && showComplete ? (
          <>
            <div className="export-success-icon">
              <svg viewBox="0 0 52 52" width="64" height="64">
                <circle
                  className="export-success-circle"
                  cx="26"
                  cy="26"
                  r="24"
                  fill="none"
                  stroke={THEME.accent}
                  strokeWidth="2"
                />
                <path
                  className="export-success-check"
                  d="M14 27l7 7 16-16"
                  fill="none"
                  stroke={THEME.accent}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="export-title">导出完成！</div>
            <div className="export-subtitle">文件已开始下载</div>
          </>
        ) : (
          <>
            <div className="export-title">正在导出混音...</div>
            <div className="export-bar-container">
              <div
                className="export-bar-fill"
                style={{ width: `${progress}%` }}
              />
              <div className="export-bar-stripe" />
            </div>
            <div className="export-percent">{Math.round(progress)}%</div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExportProgress;
