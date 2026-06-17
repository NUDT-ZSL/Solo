import React, { useState, useCallback } from 'react';
import StrokeCanvas from './components/StrokeCanvas';
import { getSupportedChars } from './utils/strokeData';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('大');
  const [speed, setSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [isPaused, setIsPaused] = useState(false);
  const [replayKey, setReplayKey] = useState(0);

  const supportedChars = getSupportedChars();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const filtered = value.slice(0, 4);
    setInputText(filtered);
    setIsPaused(false);
    setReplayKey(prev => prev + 1);
  }, []);

  const handlePauseToggle = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as 'slow' | 'medium' | 'fast';
    setSpeed(value);
  }, []);

  const handleCharClick = useCallback((char: string) => {
    setInputText(char);
    setIsPaused(false);
    setReplayKey(prev => prev + 1);
  }, []);

  const speedLabels = {
    slow: '慢',
    medium: '中',
    fast: '快',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#faf3e0',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      }}
    >
      <header
        style={{
          height: '64px',
          backgroundColor: '#ffffff',
          borderBottom: '2px solid #e0d8c8',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#424242',
            margin: 0,
            marginRight: '24px',
          }}
        >
          汉字笔顺演示
        </h1>

        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="请输入汉字（最多4个）"
          maxLength={4}
          style={{
            padding: '8px 16px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '1px solid #d4c5a9',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            backgroundColor: '#ffffff',
            color: '#424242',
            width: '180px',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#8d6e63';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d4c5a9';
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: '#616161' }}>速度：</span>
          <span style={{ fontSize: '12px', color: '#9e9e9e' }}>慢</span>
          <input
            type="range"
            min="0"
            max="2"
            step="1"
            value={speed === 'slow' ? 0 : speed === 'medium' ? 1 : 2}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              const speeds: ('slow' | 'medium' | 'fast')[] = ['slow', 'medium', 'fast'];
              setSpeed(speeds[val]);
            }}
            style={{
              width: '80px',
              accentColor: '#8d6e63',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '12px', color: '#9e9e9e' }}>快</span>
          <span
            style={{
              fontSize: '13px',
              color: '#8d6e63',
              fontWeight: 500,
              marginLeft: '4px',
              minWidth: '24px',
            }}
          >
            {speedLabels[speed]}
          </span>
        </div>

        <button
          onClick={handlePauseToggle}
          style={{
            padding: '8px 20px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#ffffff',
            backgroundColor: '#8d6e63',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#6d4c41';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#8d6e63';
          }}
        >
          {isPaused ? '继续' : '暂停'}
        </button>

        <button
          onClick={() => {
            setIsPaused(false);
            setReplayKey(prev => prev + 1);
          }}
          style={{
            padding: '8px 20px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#ffffff',
            backgroundColor: '#8d6e63',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#6d4c41';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#8d6e63';
          }}
        >
          重播
        </button>
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '32px 16px',
          gap: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '640px',
            backgroundColor: '#ffffff',
            boxShadow: 'inset 0 0 8px #e0d8c8',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <StrokeCanvas
            text={inputText}
            speed={speed}
            isPaused={isPaused}
          />
        </div>

        <div style={{ maxWidth: '640px', width: '100%' }}>
          <p style={{ fontSize: '14px', color: '#616161', margin: '0 0 12px 0' }}>
            支持的汉字：
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {supportedChars.map((char) => (
              <button
                key={char}
                onClick={() => handleCharClick(char)}
                style={{
                  width: '44px',
                  height: '44px',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: inputText.includes(char) ? '#ffffff' : '#424242',
                  backgroundColor: inputText.includes(char) ? '#8d6e63' : '#ffffff',
                  border: '1px solid #d4c5a9',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  if (!inputText.includes(char)) {
                    e.currentTarget.style.backgroundColor = '#f5f0e6';
                    e.currentTarget.style.borderColor = '#8d6e63';
                  }
                }}
                onMouseOut={(e) => {
                  if (!inputText.includes(char)) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#d4c5a9';
                  }
                }}
              >
                {char}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            maxWidth: '640px',
            width: '100%',
            padding: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            borderRadius: '8px',
            border: '1px solid #e0d8c8',
          }}
        >
          <p style={{ fontSize: '13px', color: '#616161', margin: '0 0 8px 0', fontWeight: 500 }}>
            使用说明：
          </p>
          <ul style={{ fontSize: '12px', color: '#757575', margin: 0, paddingLeft: '20px', lineHeight: 1.8 }}>
            <li>在顶部输入框中输入简体汉字（最多4个），或点击下方快捷按钮选择汉字</li>
            <li>动画会自动开始逐笔演示书写过程，深蓝圆点标注笔顺编号</li>
            <li>已完成的笔画会变为灰色，方便区分已完成和待完成的笔画</li>
            <li>使用速度滑块可调节书写速度，支持慢、中、快三档</li>
            <li>点击暂停按钮后，可将鼠标悬停在已完成的笔画上查看笔画名称</li>
            <li>左下角缩略图可预览整体字形和书写进度</li>
          </ul>
        </div>
      </main>

      <style>{`
        @media (max-width: 640px) {
          header {
            height: 56px !important;
            padding: 0 16px !important;
          }
          h1 {
            font-size: 18px !important;
            margin-right: 16px !important;
          }
          main {
            padding: 16px 8px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
