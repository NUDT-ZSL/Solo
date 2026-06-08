import { useState } from 'react';

interface ControlPanelProps {
  text: string;
  speed: number;
  dispersalIntensity: number;
  isAnimating: boolean;
  onTextChange: (text: string) => void;
  onSpeedChange: (speed: number) => void;
  onDispersalChange: (intensity: number) => void;
  onGenerate: () => void;
  onReset: () => void;
}

export default function ControlPanel({
  text,
  speed,
  dispersalIntensity,
  isAnimating,
  onTextChange,
  onSpeedChange,
  onDispersalChange,
  onGenerate,
  onReset,
}: ControlPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [pressing, setPressing] = useState<string | null>(null);

  return (
    <>
      <style>{`
        .control-panel {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(30, 15, 5, 0.65);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 180, 60, 0.3);
          border-radius: 20px;
          padding: 20px 28px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow:
            0 0 30px rgba(255, 140, 0, 0.15),
            0 0 60px rgba(255, 100, 0, 0.08),
            inset 0 1px 0 rgba(255, 200, 100, 0.1);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 100;
          max-width: 90vw;
        }
        .control-panel.collapsed {
          padding: 10px 16px;
          gap: 10px;
        }
        .control-panel.collapsed .control-content {
          display: none;
        }
        .control-toggle {
          display: none;
          background: none;
          border: 1px solid rgba(255, 180, 60, 0.4);
          color: rgba(255, 200, 100, 0.9);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .control-toggle:hover {
          background: rgba(255, 180, 60, 0.2);
        }
        .control-content {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .control-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .control-label {
          font-size: 11px;
          color: rgba(255, 200, 120, 0.7);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-weight: 500;
        }
        .control-text-input {
          background: rgba(255, 180, 60, 0.1);
          border: 1px solid rgba(255, 180, 60, 0.25);
          border-radius: 10px;
          padding: 8px 14px;
          color: rgba(255, 220, 150, 0.95);
          font-size: 14px;
          outline: none;
          width: 180px;
          transition: all 0.3s;
        }
        .control-text-input:focus {
          border-color: rgba(255, 180, 60, 0.5);
          box-shadow: 0 0 15px rgba(255, 140, 0, 0.15);
        }
        .control-text-input::placeholder {
          color: rgba(255, 200, 120, 0.35);
        }
        .control-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 120px;
          height: 4px;
          background: rgba(255, 180, 60, 0.2);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .control-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: radial-gradient(circle, rgba(255, 200, 80, 0.95), rgba(255, 140, 20, 0.9));
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(255, 160, 40, 0.4);
          transition: transform 0.15s ease;
        }
        .control-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .control-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: radial-gradient(circle, rgba(255, 200, 80, 0.95), rgba(255, 140, 20, 0.9));
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(255, 160, 40, 0.4);
        }
        .control-btn {
          background: rgba(255, 180, 60, 0.15);
          border: 1px solid rgba(255, 180, 60, 0.35);
          border-radius: 10px;
          padding: 8px 18px;
          color: rgba(255, 220, 150, 0.95);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }
        .control-btn:hover {
          background: rgba(255, 180, 60, 0.25);
          box-shadow: 0 0 15px rgba(255, 140, 0, 0.2);
        }
        .control-btn:active, .control-btn.pressing {
          transform: scale(0.95);
          background: rgba(255, 180, 60, 0.35);
          transition-duration: 0.1s;
        }
        .control-btn.primary {
          background: rgba(255, 160, 30, 0.3);
          border-color: rgba(255, 180, 60, 0.5);
          box-shadow: 0 0 12px rgba(255, 140, 0, 0.15);
        }
        .control-btn.primary:hover {
          background: rgba(255, 160, 30, 0.45);
          box-shadow: 0 0 20px rgba(255, 140, 0, 0.3);
        }
        .slider-value {
          font-size: 11px;
          color: rgba(255, 200, 120, 0.6);
          min-width: 30px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .control-panel {
            bottom: 12px;
            padding: 14px 18px;
            gap: 12px;
            border-radius: 16px;
            width: calc(100% - 24px);
            max-width: none;
          }
          .control-toggle {
            display: flex;
          }
          .control-panel.collapsed .control-content {
            display: none;
          }
          .control-panel:not(.collapsed) .control-content {
            display: flex;
            flex-direction: column;
            gap: 14px;
            width: 100%;
          }
          .control-text-input {
            width: 100%;
          }
          .control-slider {
            width: 100%;
          }
          .control-group {
            width: 100%;
          }
          .slider-row {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
          }
        }
      `}</style>

      <div className={`control-panel${collapsed ? ' collapsed' : ''}`}>
        <button
          className="control-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? '展开控制面板' : '折叠控制面板'}
        >
          {collapsed ? '▲' : '▼'}
        </button>

        <div className="control-content">
          <div className="control-group">
            <span className="control-label">文字</span>
            <input
              type="text"
              className="control-text-input"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="输入文字..."
              maxLength={20}
            />
          </div>

          <div className="control-group">
            <span className="control-label">动画速度</span>
            <div className="slider-row">
              <input
                type="range"
                className="control-slider"
                min="0.2"
                max="3"
                step="0.1"
                value={speed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              />
              <span className="slider-value">{speed.toFixed(1)}x</span>
            </div>
          </div>

          <div className="control-group">
            <span className="control-label">消散强度</span>
            <div className="slider-row">
              <input
                type="range"
                className="control-slider"
                min="0.2"
                max="2"
                step="0.1"
                value={dispersalIntensity}
                onChange={(e) => onDispersalChange(parseFloat(e.target.value))}
              />
              <span className="slider-value">{dispersalIntensity.toFixed(1)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className={`control-btn primary${pressing === 'generate' ? ' pressing' : ''}`}
              onClick={onGenerate}
              onMouseDown={() => setPressing('generate')}
              onMouseUp={() => setPressing(null)}
              onMouseLeave={() => setPressing(null)}
            >
              生成
            </button>
            <button
              className={`control-btn${pressing === 'reset' ? ' pressing' : ''}`}
              onClick={onReset}
              onMouseDown={() => setPressing('reset')}
              onMouseUp={() => setPressing(null)}
              onMouseLeave={() => setPressing(null)}
              disabled={!isAnimating}
            >
              重置
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
