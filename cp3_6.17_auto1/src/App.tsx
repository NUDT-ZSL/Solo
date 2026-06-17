import { useState, useCallback, useEffect } from 'react';
import StrokeCanvas from './components/StrokeCanvas';
import { SUPPORTED_CHARACTERS } from './utils/strokeData';

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; height: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
      "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    background: #faf3e0;
    color: #424242;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  .app-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
  .topbar {
    height: 64px;
    background: #ffffff;
    border-bottom: 2px solid #e0d8c8;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 20px;
    gap: 16px;
    flex-wrap: wrap;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-input {
    width: 260px;
    height: 40px;
    border-radius: 8px;
    border: 1px solid #d4c5a9;
    background: #fffdf8;
    padding: 0 14px 0 14px;
    font-size: 16px;
    color: #424242;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .search-input:focus {
    border-color: #8d6e63;
    box-shadow: 0 0 0 3px rgba(141, 110, 99, 0.15);
  }
  .char-counter {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: #a1887f;
    pointer-events: none;
  }
  .speed-group {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #f7f0e2;
    border-radius: 8px;
    padding: 4px;
  }
  .speed-label {
    font-size: 13px;
    color: #8d6e63;
    padding: 0 8px;
    font-weight: 500;
  }
  .speed-btn {
    border: none;
    background: transparent;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 13px;
    color: #6d4c41;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, transform 0.1s ease;
    font-weight: 500;
    min-height: 32px;
  }
  .speed-btn:hover { background: rgba(141, 110, 99, 0.1); }
  .speed-btn.active {
    background: #8d6e63;
    color: #ffffff;
  }
  .btn-group { display: flex; gap: 8px; }
  .btn {
    border: none;
    height: 40px;
    padding: 0 18px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    background: #8d6e63;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
    min-width: 80px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 40px;
  }
  .btn:hover { background: #6d4c41; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(109,76,65,0.2); }
  .btn:active { transform: translateY(0); }
  .btn.secondary {
    background: #d7ccc8;
    color: #4e342e;
  }
  .btn.secondary:hover { background: #bcaaa4; }
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 40px 20px;
    gap: 24px;
  }
  .canvas-wrapper {
    display: flex;
    justify-content: center;
    width: 100%;
    max-width: 680px;
  }
  .hint-bar {
    max-width: 640px;
    width: 100%;
    background: rgba(255, 255, 255, 0.7);
    border: 1px solid #e0d8c8;
    border-radius: 10px;
    padding: 14px 18px;
    font-size: 13px;
    color: #6d4c41;
    line-height: 1.6;
  }
  .hint-title {
    font-weight: 600;
    margin-bottom: 4px;
    color: #5d4037;
  }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    background: #fff;
    border: 1px solid #d4c5a9;
    font-size: 13px;
    cursor: pointer;
    color: #5d4037;
    transition: all 0.15s ease;
    user-select: none;
  }
  .chip:hover { background: #8d6e63; color: #fff; border-color: #8d6e63; }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
  }
  .status-playing { background: #e3f2fd; color: #1565c0; }
  .status-paused { background: #fff3e0; color: #ef6c00; }
  .status-done { background: #e8f5e9; color: #2e7d32; }
  .status-idle { background: #eceff1; color: #546e7a; }
  .dot { width: 8px; height: 8px; border-radius: 50%; }
  .status-playing .dot { background: #1565c0; animation: pulse 1.2s infinite; }
  .status-paused .dot { background: #ef6c00; }
  .status-done .dot { background: #2e7d32; }
  .status-idle .dot { background: #90a4ae; }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  @media (max-width: 768px) {
    .topbar {
      height: auto;
      min-height: 56px;
      padding: 10px 12px;
      gap: 10px;
    }
    .search-input { width: 100%; max-width: 220px; }
    .canvas-wrapper > div { width: 96% !important; }
    .main { padding: 20px 8px; }
    .btn { padding: 0 14px; min-width: 64px; }
  }
`;

type Speed = 'slow' | 'normal' | 'fast';

interface PlayReport {
  currentStrokeGlobal: number;
  totalStrokes: number;
  completed: boolean;
}

export default function App() {
  const [input, setInput] = useState<string>('大');
  const [speed, setSpeed] = useState<Speed>('normal');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [replayKey, setReplayKey] = useState<number>(0);
  const [report, setReport] = useState<PlayReport>({
    currentStrokeGlobal: 0,
    totalStrokes: 0,
    completed: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Array.from(e.target.value).slice(0, 4).join('');
    setInput(val);
    setIsPlaying(true);
    setReplayKey((k) => k + 1);
  };

  const togglePlayPause = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const replay = useCallback(() => {
    setIsPlaying(true);
    setReplayKey((k) => k + 1);
  }, []);

  const pickChar = (ch: string) => {
    setInput(ch);
    setIsPlaying(true);
    setReplayKey((k) => k + 1);
  };

  const clearInput = () => {
    setInput('');
    setIsPlaying(false);
    setReplayKey((k) => k + 1);
  };

  useEffect(() => {
    if (input) {
      const t = setTimeout(() => {
        setIsPlaying(true);
      }, 100);
      return () => clearTimeout(t);
    }
  }, [input, replayKey]);

  const getStatus = (): { cls: string; text: string } => {
    if (!input) return { cls: 'status-idle', text: '待输入' };
    if (report.completed && report.totalStrokes > 0) return { cls: 'status-done', text: '演示完成' };
    if (!isPlaying) return { cls: 'status-paused', text: '已暂停' };
    return { cls: 'status-playing', text: '演示中' };
  };

  const status = getStatus();

  return (
    <>
      <style>{CSS}</style>
      <div className="app-root">
        <header className="topbar">
          <div style={{ position: 'absolute', left: 24, fontSize: 17, fontWeight: 700, color: '#5d4037', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>✍️</span>
            <span style={{ display: 'none' }} className={''}>&nbsp;</span>
            <span>笔顺演示</span>
          </div>

          <div className="search-wrap">
            <input
              className="search-input"
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="输入1-4个简体汉字..."
              maxLength={4}
              aria-label="汉字输入"
            />
            <span className="char-counter">{Array.from(input).length}/4</span>
          </div>

          <div className="speed-group" role="radiogroup" aria-label="播放速度">
            <span className="speed-label">速度</span>
            {(['slow', 'normal', 'fast'] as Speed[]).map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={speed === s}
                className={`speed-btn ${speed === s ? 'active' : ''}`}
                onClick={() => setSpeed(s)}
              >
                {s === 'slow' ? '慢' : s === 'normal' ? '中' : '快'}
              </button>
            ))}
          </div>

          <div className="btn-group">
            <button className="btn secondary" onClick={clearInput} title="清空">
              清空
            </button>
            <button className="btn secondary" onClick={replay} title="重播">
              重播
            </button>
            <button className="btn" onClick={togglePlayPause} title={isPlaying ? '暂停' : '继续'}>
              {isPlaying ? '⏸ 暂停' : '▶ 继续'}
            </button>
          </div>
        </header>

        <main className="main">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className={`status-badge ${status.cls}`}>
              <span className="dot" />
              <span>{status.text}</span>
            </span>
            {report.totalStrokes > 0 && (
              <span style={{ fontSize: 13, color: '#6d4c41' }}>
                进度 {report.currentStrokeGlobal} / {report.totalStrokes}
              </span>
            )}
          </div>

          <div className="canvas-wrapper">
            <StrokeCanvas
              key={replayKey}
              characters={input}
              speed={speed}
              isPlaying={isPlaying}
              onPlayStateChange={setReport}
            />
          </div>

          <div className="hint-bar">
            <div className="hint-title">使用说明</div>
            <div>1. 在输入框输入 1–4 个简体汉字，系统自动开始演示笔顺动画。</div>
            <div>2. 点击 <b>暂停</b> 后可将鼠标悬停在笔画上，查看笔顺编号与方向提示。</div>
            <div>3. 使用 <b>慢 / 中 / 快</b> 调整播放速度，<b>重播</b> 按钮可重新开始。</div>
            <div className="chips">
              <span style={{ fontWeight: 600, marginRight: 4, alignSelf: 'center' }}>快速选择：</span>
              {SUPPORTED_CHARACTERS.map((ch) => (
                <span key={ch} className="chip" onClick={() => pickChar(ch)}>
                  {ch}
                </span>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
