import React from 'react';
import { Shuffle, Download } from 'lucide-react';

interface ControlBarProps {
  gridSize: number;
  onGridSizeChange: (size: number) => void;
  onRandomize: () => void;
  onExport: () => void;
  hasImage: boolean;
  isExporting: boolean;
}

const ControlBar: React.FC<ControlBarProps> = ({
  gridSize,
  onGridSizeChange,
  onRandomize,
  onExport,
  hasImage,
  isExporting,
}) => {
  return (
    <div style={styles.container}>
      <style>{`
        .control-btn {
          transition: all 0.2s ease-out;
          cursor: pointer;
          border: none;
          outline: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .control-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .dice-btn {
          width: 44px;
          height: 44px;
          border-radius: 22px;
          background: #8b5cf6;
        }
        .dice-btn:hover:not(:disabled) {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
        }
        .dice-btn:active:not(:disabled) {
          transform: scale(0.95);
        }
        .export-btn {
          width: 160px;
          height: 48px;
          border-radius: 24px;
          background: #ec4899;
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          gap: 8px;
        }
        .export-btn:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);
          background: #f472b6;
        }
        .export-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
        .grid-selector {
          display: flex;
          background: #16213e;
          border-radius: 12px;
          padding: 4px;
          gap: 4px;
        }
        .grid-option {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.2s ease-out;
          user-select: none;
        }
        .grid-option:hover {
          color: #e5e7eb;
        }
        .grid-option.active {
          background: #8b5cf6;
          color: #ffffff;
        }
        @media (max-width: 768px) {
          .control-bar {
            height: 60px !important;
            padding: 0 12px !important;
          }
          .export-btn {
            width: 120px !important;
            height: 40px !important;
            font-size: 14px !important;
          }
          .dice-btn {
            width: 40px !important;
            height: 40px !important;
            border-radius: 20px !important;
          }
          .grid-option {
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
      
      <div className="control-bar" style={styles.bar}>
        <div style={styles.buttonGroup}>
          <div className="grid-selector">
            <div
              className={`grid-option ${gridSize === 8 ? 'active' : ''}`}
              onClick={() => hasImage && onGridSizeChange(8)}
              style={{ opacity: hasImage ? 1 : 0.4, cursor: hasImage ? 'pointer' : 'not-allowed' }}
            >
              8×8
            </div>
            <div
              className={`grid-option ${gridSize === 16 ? 'active' : ''}`}
              onClick={() => hasImage && onGridSizeChange(16)}
              style={{ opacity: hasImage ? 1 : 0.4, cursor: hasImage ? 'pointer' : 'not-allowed' }}
            >
              16×16
            </div>
          </div>

          <button
            className="control-btn dice-btn"
            onClick={onRandomize}
            disabled={!hasImage}
            title="随机重排"
          >
            <Shuffle size={20} color="#ffffff" />
          </button>

          <button
            className="control-btn export-btn"
            onClick={onExport}
            disabled={!hasImage || isExporting}
          >
            <Download size={18} />
            {isExporting ? '导出中...' : '导出作品'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
  },
  bar: {
    height: '80px',
    background: '#0f3460',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 24px',
  },
  buttonGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
};

export default ControlBar;
