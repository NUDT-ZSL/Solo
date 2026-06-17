import { useState, useEffect, useCallback } from 'react';
import StrokeCanvas from './components/StrokeCanvas';
import { getStrokeDataForString } from './utils/strokeData';

type Speed = 'slow' | 'medium' | 'fast';

const SPEED_DURATION: Record<Speed, number> = {
  slow: 0.8,
  medium: 0.5,
  fast: 0.3,
};

function App() {
  const [inputValue, setInputValue] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<Speed>('medium');
  const [currentStroke, setCurrentStroke] = useState<number>(0);
  const [totalStrokes, setTotalStrokes] = useState<number>(0);
  const [unsupportedChar, setUnsupportedChar] = useState<string | null>(null);

  const strokeData = inputValue ? getStrokeDataForString(inputValue) : null;

  useEffect(() => {
    if (inputValue.length > 0) {
      const supportedChars = getStrokeDataForString(inputValue);
      if (supportedChars === null) {
        const firstChar = inputValue[0];
        setUnsupportedChar(firstChar);
      } else {
        setUnsupportedChar(null);
      }
    } else {
      setUnsupportedChar(null);
    }
    setIsPlaying(false);
    setCurrentStroke(0);
    setTotalStrokes(0);
  }, [inputValue]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const chineseRegex = /^[\u4e00-\u9fa5]*$/;
    if (chineseRegex.test(value) && value.length <= 4) {
      setInputValue(value);
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!strokeData) return;
    setIsPlaying((prev) => !prev);
  }, [strokeData]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStroke(0);
  }, []);

  const handleStrokeProgress = useCallback((current: number, total: number) => {
    setCurrentStroke(current);
    setTotalStrokes(total);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: Speed) => {
    setSpeed(newSpeed);
  }, []);

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .app-topbar {
          background-color: #ffffff;
          height: 64px;
          border-bottom: 2px solid #e0d8c8;
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .app-input {
          padding: 8px 12px;
          border: 1px solid #d4c5a9;
          border-radius: 8px;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s;
          width: 180px;
        }
        .app-input:focus {
          border-color: #8d6e63;
        }
        .app-button {
          padding: 8px 16px;
          background-color: #8d6e63;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .app-button:hover {
          background-color: #6d4c41;
        }
        .app-button:disabled {
          background-color: #bcaaa4;
          cursor: not-allowed;
        }
        .app-speed-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .app-speed-label {
          font-size: 14px;
          color: #5d4037;
        }
        .app-speed-option {
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          font-size: 14px;
          color: #5d4037;
        }
        .app-speed-option input[type="radio"] {
          accent-color: #8d6e63;
          cursor: pointer;
        }
        .app-progress {
          font-size: 14px;
          color: #5d4037;
          margin-left: auto;
        }
        .app-warning {
          font-size: 14px;
          color: #c62828;
          margin-left: auto;
        }
        .app-main {
          background-color: #faf3e0;
          min-height: calc(100vh - 64px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        @media (max-width: 768px) {
          .app-topbar {
            height: 56px;
            padding: 0 12px;
            gap: 8px;
          }
          .app-input {
            width: 140px;
            font-size: 14px;
            padding: 6px 10px;
          }
          .app-button {
            padding: 6px 12px;
            font-size: 13px;
          }
          .app-progress {
            font-size: 13px;
            margin-left: 0;
            width: 100%;
            order: 5;
          }
          .app-warning {
            font-size: 13px;
            margin-left: 0;
            width: 100%;
            order: 5;
          }
          .app-main {
            min-height: calc(100vh - 56px);
            padding: 16px;
          }
          .app-speed-group {
            order: 4;
          }
        }
      `}</style>
      <div className="app-topbar">
        <input
          type="text"
          className="app-input"
          value={inputValue}
          onChange={handleInputChange}
          maxLength={4}
          placeholder="请输入1-4个汉字"
        />
        <button
          className="app-button"
          onClick={handlePlayPause}
          disabled={!strokeData || unsupportedChar !== null}
        >
          {isPlaying ? '暂停' : '播放'}
        </button>
        <button
          className="app-button"
          onClick={handleReset}
          disabled={!strokeData}
        >
          重置
        </button>
        <div className="app-speed-group">
          <span className="app-speed-label">速度:</span>
          <label className="app-speed-option">
            <input
              type="radio"
              name="speed"
              value="slow"
              checked={speed === 'slow'}
              onChange={() => handleSpeedChange('slow')}
            />
            慢
          </label>
          <label className="app-speed-option">
            <input
              type="radio"
              name="speed"
              value="medium"
              checked={speed === 'medium'}
              onChange={() => handleSpeedChange('medium')}
            />
            中
          </label>
          <label className="app-speed-option">
            <input
              type="radio"
              name="speed"
              value="fast"
              checked={speed === 'fast'}
              onChange={() => handleSpeedChange('fast')}
            />
            快
          </label>
        </div>
        {unsupportedChar !== null ? (
          <div className="app-warning">暂不支持该字: {unsupportedChar}</div>
        ) : totalStrokes > 0 ? (
          <div className="app-progress">
            第 {currentStroke} 笔 / 共 {totalStrokes} 笔
          </div>
        ) : null}
      </div>
      <div className="app-main">
        {strokeData && !unsupportedChar && (
          <StrokeCanvas
            strokeData={strokeData}
            isPlaying={isPlaying}
            speed={SPEED_DURATION[speed]}
            onStrokeProgress={handleStrokeProgress}
            onAnimationEnd={() => setIsPlaying(false)}
          />
        )}
      </div>
    </>
  );
}

export default App;
