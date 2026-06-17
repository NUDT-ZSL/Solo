import React, { useState, useCallback, useMemo } from 'react';
import StrokeCanvas from './components/StrokeCanvas';
import { getStrokesForString, getSupportedCharacters } from './utils/strokeData';

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState<string>('大');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [restartKey, setRestartKey] = useState<number>(0);

  const supportedChars = useMemo(() => getSupportedCharacters(), []);

  const characters = useMemo(() => {
    const cleanInput = inputValue.slice(0, 4);
    return getStrokesForString(cleanInput);
  }, [inputValue]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const filtered = value.split('').filter(char => /[\u4e00-\u9fa5]/.test(char)).join('');
    setInputValue(filtered.slice(0, 4));
    setIsPlaying(true);
    setRestartKey(prev => prev + 1);
  }, []);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    if (value === 0) setSpeed('slow');
    else if (value === 1) setSpeed('medium');
    else setSpeed('fast');
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleRestart = useCallback(() => {
    setRestartKey(prev => prev + 1);
    setIsPlaying(true);
  }, []);

  const handleComplete = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleCharClick = useCallback((char: string) => {
    setInputValue(char);
    setIsPlaying(true);
    setRestartKey(prev => prev + 1);
  }, []);

  const speedLabel = useMemo(() => {
    switch (speed) {
      case 'slow': return '慢 (0.8s/笔)';
      case 'medium': return '中 (0.5s/笔)';
      case 'fast': return '快 (0.3s/笔)';
    }
  }, [speed]);

  const speedValue = useMemo(() => {
    switch (speed) {
      case 'slow': return 0;
      case 'medium': return 1;
      case 'fast': return 2;
    }
  }, [speed]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#faf3e0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <header style={{
        height: '64px',
        backgroundColor: '#ffffff',
        borderBottom: '2px solid #e0d8c8',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#5d4037',
          margin: 0,
          marginRight: '16px'
        }}>
          汉字笔顺演示
        </h1>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flex: 1,
          minWidth: '200px'
        }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="输入简体汉字（最多4个）"
            maxLength={4}
            style={{
              height: '40px',
              padding: '0 16px',
              borderRadius: '8px',
              border: '1px solid #d4c5a9',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              minWidth: '180px',
              flex: 1,
              maxWidth: '280px'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#8d6e63';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d4c5a9';
            }}
          />

          <button
            onClick={handlePlayPause}
            style={{
              height: '40px',
              padding: '0 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#8d6e63',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              minWidth: '80px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#6d4c41';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#8d6e63';
            }}
          >
            {isPlaying ? '暂停' : '继续'}
          </button>

          <button
            onClick={handleRestart}
            style={{
              height: '40px',
              padding: '0 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#8d6e63',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              minWidth: '80px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#6d4c41';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#8d6e63';
            }}
          >
            重播
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '200px'
        }}>
          <span style={{ fontSize: '14px', color: '#5d4037', whiteSpace: 'nowrap' }}>速度：</span>
          <input
            type="range"
            min="0"
            max="2"
            step="1"
            value={speedValue}
            onChange={handleSpeedChange}
            style={{
              width: '120px',
              cursor: 'pointer',
              accentColor: '#8d6e63'
            }}
          />
          <span style={{ fontSize: '13px', color: '#6d4c41', minWidth: '90px' }}>{speedLabel}</span>
        </div>
      </header>

      <main style={{
        padding: '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'center',
          maxWidth: '640px'
        }}>
          <span style={{ fontSize: '14px', color: '#6d4c41', marginRight: '8px', alignSelf: 'center' }}>
            快速选择：
          </span>
          {supportedChars.map(char => (
            <button
              key={char}
              onClick={() => handleCharClick(char)}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                border: inputValue.includes(char) ? '2px solid #8d6e63' : '1px solid #d4c5a9',
                backgroundColor: inputValue.includes(char) ? '#efebe9' : '#ffffff',
                fontSize: '20px',
                color: '#5d4037',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#efebe9';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = inputValue.includes(char) ? '#efebe9' : '#ffffff';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {char}
            </button>
          ))}
        </div>

        <div style={{
          width: '640px',
          maxWidth: '96%',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <StrokeCanvas
            key={restartKey}
            characters={characters}
            speed={speed}
            isPlaying={isPlaying}
            onComplete={handleComplete}
            onRestart={() => setRestartKey(prev => prev + 1)}
          />
        </div>

        <div style={{
          maxWidth: '640px',
          textAlign: 'center',
          color: '#6d4c41',
          fontSize: '13px',
          lineHeight: 1.8
        }}>
          <p style={{ margin: '8px 0' }}>
            <strong>使用说明：</strong>在顶部输入框输入1-4个简体汉字，或点击上方快速选择按钮。
          </p>
          <p style={{ margin: '8px 0' }}>
            暂停时将鼠标悬停在笔画上可查看笔顺编号和笔画名称。
          </p>
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          header {
            height: 56px !important;
            padding: 0 16px !important;
          }
          h1 {
            font-size: 18px !important;
          }
          input[type="text"] {
            height: 36px !important;
            font-size: 14px !important;
          }
          button {
            height: 36px !important;
            padding: 0 16px !important;
            font-size: 13px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
