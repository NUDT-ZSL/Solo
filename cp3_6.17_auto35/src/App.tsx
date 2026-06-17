import { useState, useCallback, useMemo } from 'react';
import StrokeCanvas from './components/StrokeCanvas';
import { getCharacterStrokes, getSupportedCharacters } from './utils/strokeData';
import './App.css';

type SpeedLevel = 'slow' | 'medium' | 'fast';

const SPEED_MAP: Record<SpeedLevel, number> = {
  slow: 0.8,
  medium: 0.5,
  fast: 0.3
};

export default function App() {
  const [inputValue, setInputValue] = useState('大');
  const [speedLevel, setSpeedLevel] = useState<SpeedLevel>('medium');
  const [isPaused, setIsPaused] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);

  const characterStrokes = useMemo(() => {
    return getCharacterStrokes(inputValue);
  }, [inputValue]);

  const supportedChars = getSupportedCharacters();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 4);
    setInputValue(value);
    setIsPaused(false);
  }, []);

  const handleProgressChange = useCallback((current: number, total: number) => {
    setCurrentStroke(current);
    setTotalStrokes(total);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (value === 0) setSpeedLevel('slow');
    else if (value === 1) setSpeedLevel('medium');
    else setSpeedLevel('fast');
  }, []);

  const speedSliderValue = speedLevel === 'slow' ? 0 : speedLevel === 'medium' ? 1 : 2;

  const handleCharClick = useCallback((char: string) => {
    setInputValue(char);
    setIsPaused(false);
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-input-group">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="输入汉字（最多4个）"
            maxLength={4}
            className="char-input"
          />
        </div>

        <div className="header-controls">
          <div className="speed-control">
            <span className="speed-label">速度：</span>
            <span className="speed-mark">慢</span>
            <input
              type="range"
              min="0"
              max="2"
              step="1"
              value={speedSliderValue}
              onChange={handleSpeedChange}
              className="speed-slider"
            />
            <span className="speed-mark">快</span>
          </div>

          <button
            onClick={togglePause}
            className="control-button"
          >
            {isPaused ? '继续' : '暂停'}
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="char-buttons-container">
          <span className="char-buttons-label">支持的汉字：</span>
          {supportedChars.map((char) => (
            <button
              key={char}
              onClick={() => handleCharClick(char)}
              className={`char-button ${inputValue.includes(char) ? 'char-button-active' : ''}`}
            >
              {char}
            </button>
          ))}
        </div>

        <div className="canvas-container">
          <StrokeCanvas
            characters={characterStrokes}
            speed={SPEED_MAP[speedLevel]}
            isPaused={isPaused}
            onProgressChange={handleProgressChange}
          />

          {totalStrokes > 0 && (
            <div className="progress-info">
              <div className="progress-text">
                当前：第 <strong className="progress-highlight">{currentStroke}</strong> / {totalStrokes} 笔
              </div>
              <div className="progress-status">
                {isPaused ? '（已暂停 - 悬停笔画查看详情）' : '（正在演示）'}
              </div>
            </div>
          )}
        </div>

        {characterStrokes.length === 0 && inputValue.length > 0 && (
          <div className="error-message">
            暂不支持该汉字，请尝试：{supportedChars.join('、')}
          </div>
        )}
      </main>
    </div>
  );
}
