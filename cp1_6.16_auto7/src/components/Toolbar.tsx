import React from 'react';

interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoPulse: boolean;
  redoPulse: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoPulse,
  redoPulse
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h1 className="app-title">
          <span className="title-icon">🪴</span>
          虚拟盆栽工作室
        </h1>
      </div>
      <div className="toolbar-right">
        <button
          className={`tool-btn undo-btn ${!canUndo ? 'disabled' : ''} ${undoPulse ? 'pulse' : ''}`}
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
        >
          <svg viewBox="0 0 24 24" className="btn-icon">
            <path
              d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
              fill="currentColor"
            />
          </svg>
          <span className="btn-label">撤销</span>
        </button>
        <button
          className={`tool-btn redo-btn ${!canRedo ? 'disabled' : ''} ${redoPulse ? 'pulse' : ''}`}
          onClick={onRedo}
          disabled={!canRedo}
          title="重做 (Ctrl+Y)"
        >
          <svg viewBox="0 0 24 24" className="btn-icon">
            <path
              d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"
              fill="currentColor"
            />
          </svg>
          <span className="btn-label">重做</span>
        </button>
      </div>

      <style>{`
        .toolbar {
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          background: linear-gradient(135deg, #D2B48C 0%, #F5DEB3 100%);
          border-bottom: 2px solid #C0A080;
          box-shadow: 0 2px 8px rgba(141, 110, 99, 0.15);
          position: relative;
          z-index: 100;
        }
        
        .toolbar-left {
          display: flex;
          align-items: center;
        }
        
        .app-title {
          font-size: 18px;
          font-weight: 600;
          color: #5D4037;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .title-icon {
          font-size: 24px;
        }
        
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .tool-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: none;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.6);
          color: #5D4037;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease-out;
        }
        
        .tool-btn:hover:not(.disabled) {
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(141, 110, 99, 0.2);
        }
        
        .tool-btn:active:not(.disabled) {
          transform: translateY(0);
        }
        
        .tool-btn.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: rgba(255, 255, 255, 0.3);
        }
        
        .btn-icon {
          width: 18px;
          height: 18px;
        }
        
        .btn-label {
          font-size: 13px;
        }
        
        .tool-btn.pulse {
          animation: btnPulse 0.4s ease-out;
        }
        
        @keyframes btnPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 183, 77, 0.7);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(255, 183, 77, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 183, 77, 0);
          }
        }
        
        .undo-btn.pulse {
          animation: undoPulse 0.4s ease-out;
        }
        
        .redo-btn.pulse {
          animation: redoPulse 0.4s ease-out;
        }
        
        @keyframes undoPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(129, 199, 132, 0.6);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 0 0 6px rgba(129, 199, 132, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(129, 199, 132, 0);
          }
        }
        
        @keyframes redoPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 183, 77, 0.6);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 0 0 6px rgba(255, 183, 77, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 183, 77, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default Toolbar;
