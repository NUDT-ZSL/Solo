import React, { useState, useEffect, useRef } from 'react';
import StrokeCanvas from './components/StrokeCanvas';
import { getSupportedCharacters } from './utils/strokeData';

type Speed = 'slow' | 'medium' | 'fast';

const App: React.FC = () => {
  const [input, setInput] = useState('大');
  const [characters, setCharacters] = useState('大');
  const [speed, setSpeed] = useState<Speed>('medium');
  const [isPlaying, setIsPlaying] = useState(true);
  const [playKey, setPlayKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const supported = getSupportedCharacters();

  useEffect(() => {
    const timer = setTimeout(() => {
      setCharacters(input);
      setIsPlaying(true);
      setPlayKey((k) => k + 1);
    }, 150);
    return () => clearTimeout(timer);
  }, [input]);

  const handleTogglePlay = () => {
    setIsPlaying((p) => !p);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setPlayKey((k) => k + 1);
    setTimeout(() => setIsPlaying(true), 50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 4);
    setInput(val);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="title">汉字笔顺演示</div>
          <div className="input-area">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="输入汉字（最多4个）"
              maxLength={4}
              className="char-input"
            />
            <div className="speed-control">
              <span className="speed-label">速度：</span>
              <div className="speed-slider">
                <button
                  className={`speed-btn ${speed === 'slow' ? 'active' : ''}`}
                  onClick={() => setSpeed('slow')}
                >
                  慢
                </button>
                <button
                  className={`speed-btn ${speed === 'medium' ? 'active' : ''}`}
                  onClick={() => setSpeed('medium')}
                >
                  中
                </button>
                <button
                  className={`speed-btn ${speed === 'fast' ? 'active' : ''}`}
                  onClick={() => setSpeed('fast')}
                >
                  快
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <StrokeCanvas
          key={playKey}
          characters={characters}
          speed={speed}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onReset={handleReset}
        />
        <div className="supported-chars">
          <span className="supported-label">支持的汉字：</span>
          {supported.map((c) => (
            <button
              key={c}
              className="char-chip"
              onClick={() => setInput(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </main>

      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body, html, #root {
          width: 100%;
          height: 100%;
        }
        .app {
          min-height: 100vh;
          background: #faf3e0;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
        }
        .topbar {
          height: 64px;
          background: #ffffff;
          border-bottom: 2px solid #e0d8c8;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 24px;
        }
        .topbar-inner {
          width: 100%;
          max-width: 1200px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .title {
          font-size: 20px;
          font-weight: 600;
          color: #5d4037;
          white-space: nowrap;
        }
        .input-area {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .char-input {
          width: 200px;
          height: 40px;
          padding: 0 14px;
          border: 1px solid #d4c5a9;
          border-radius: 8px;
          font-size: 16px;
          color: #3e2723;
          background: #fffef8;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .char-input:focus {
          border-color: #8d6e63;
        }
        .char-input::placeholder {
          color: #a1887f;
          font-size: 14px;
        }
        .speed-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .speed-label {
          font-size: 14px;
          color: #5d4037;
        }
        .speed-slider {
          display: flex;
          background: #efe5d0;
          border-radius: 6px;
          padding: 3px;
          gap: 2px;
        }
        .speed-btn {
          padding: 4px 14px;
          border: none;
          background: transparent;
          color: #8d6e63;
          font-size: 13px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .speed-btn:hover {
          background: rgba(141, 110, 99, 0.1);
        }
        .speed-btn.active {
          background: #8d6e63;
          color: #ffffff;
        }
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          gap: 28px;
        }
        .supported-chars {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          max-width: 700px;
        }
        .supported-label {
          font-size: 13px;
          color: #6d4c41;
          margin-right: 4px;
        }
        .char-chip {
          width: 36px;
          height: 36px;
          border: 1px solid #d4c5a9;
          border-radius: 6px;
          background: #fffef8;
          color: #5d4037;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .char-chip:hover {
          background: #8d6e63;
          color: #ffffff;
          border-color: #8d6e63;
          transform: scale(1.08);
        }
        @media (max-width: 768px) {
          .topbar {
            height: 56px;
            padding: 0 12px;
          }
          .topbar-inner {
            flex-wrap: wrap;
            gap: 8px;
          }
          .title {
            font-size: 16px;
          }
          .input-area {
            gap: 10px;
            flex-wrap: wrap;
          }
          .char-input {
            width: 150px;
            height: 36px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
