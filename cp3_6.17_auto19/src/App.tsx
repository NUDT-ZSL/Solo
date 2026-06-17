import { useState, useMemo, useCallback, useEffect } from 'react';
import { PenTool } from 'lucide-react';
import StrokeCanvas from './components/StrokeCanvas';
import { getStrokes, getAllChars, StrokeData } from './utils/strokeData';

function App() {
  const [input, setInput] = useState<string>('');
  const [strokes, setStrokes] = useState<StrokeData[]>([]);
  const [speed, setSpeed] = useState<number>(0.5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const supportedChars = useMemo(() => getAllChars(), []);

  const currentChar = useMemo(() => {
    if (!input || input.length === 0) return '';
    const chars = Array.from(input);
    return chars[chars.length - 1] || '';
  }, [input]);

  useEffect(() => {
    if (!currentChar) {
      setStrokes([]);
      setIsPlaying(false);
      return;
    }

    const charStrokes = getStrokes(currentChar);
    setStrokes(charStrokes);
  }, [currentChar]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const chars = Array.from(value);
    if (chars.length > 4) {
      setInput(chars.slice(0, 4).join(''));
    } else {
      setInput(value);
    }
    setIsPlaying(false);
  }, []);

  const handleChipClick = useCallback((char: string) => {
    setInput(char);
    setIsPlaying(false);
  }, []);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
  }, []);

  const handlePlayingChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  return (
    <div className="app-container">
      <header className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8d6e63' }}>
          <PenTool size={22} strokeWidth={1.5} />
          <span style={{ fontSize: '18px', fontWeight: 600, fontFamily: '"Noto Serif SC", serif' }}>
            笔顺演示
          </span>
        </div>

        <div className="input-wrapper">
          <input
            type="text"
            className="char-input"
            placeholder="请输入简体汉字"
            value={input}
            onChange={handleInputChange}
            maxLength={4}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <span className="char-count">
            {Array.from(input).length}/4
          </span>
        </div>

        <button
          className="control-btn"
          onClick={() => handlePlayingChange(!isPlaying)}
          disabled={strokes.length === 0}
          style={{ minWidth: '96px' }}
        >
          {isPlaying ? '重新演示' : '开始演示'}
        </button>
      </header>

      <main className="main-content">
        <div className="supported-chars">
          {supportedChars.map((char) => (
            <div
              key={char}
              className="char-chip"
              onClick={() => handleChipClick(char)}
              title={`点击演示"${char}"`}
            >
              {char}
            </div>
          ))}
        </div>

        <StrokeCanvas
          strokes={strokes}
          speed={speed}
          onSpeedChange={handleSpeedChange}
          isPlaying={isPlaying}
          onPlayingChange={handlePlayingChange}
        />
      </main>
    </div>
  );
}

export default App;
