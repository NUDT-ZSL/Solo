import { useState, useRef, useCallback } from 'react';
import CodeEditor from './CodeEditor';
import AnimationPreview, { AnimationPreviewRef } from './AnimationPreview';
import VideoExporter from './VideoExporter';
import {
  Language,
  AnimationParams,
  DEFAULT_ANIMATION_PARAMS,
  ANIMATION_STYLES,
  HIGHLIGHT_COLOR_OPTIONS,
  BACKGROUND_COLOR_OPTIONS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './types';

const SAMPLE_CODE = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log("Fibonacci(10) =", result);`;

function App() {
  const [code, setCode] = useState<string>(SAMPLE_CODE);
  const [language, setLanguage] = useState<Language>('javascript');
  const [params, setParams] = useState<AnimationParams>(DEFAULT_ANIMATION_PARAMS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [frameTime, setFrameTime] = useState<number>(0);

  const previewRef = useRef<AnimationPreviewRef>(null);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    if (isPlaying) setIsPlaying(false);
  }, [isPlaying]);

  const handleLanguageChange = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    if (isPlaying) setIsPlaying(false);
  }, [isPlaying]);

  const handleParamChange = useCallback((key: keyof AnimationParams, value: string | number) => {
    setParams(prev => ({ ...prev, [key]: value }));
    if (isPlaying) setIsPlaying(false);
  }, [isPlaying]);

  const handlePlayPause = useCallback(() => {
    if (isRecording) return;
    setIsPlaying(prev => !prev);
  }, [isRecording]);

  const handleAnimationEnd = useCallback(() => {
    setIsPlaying(false);
    if (isRecording) {
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleRecordingStart = useCallback(() => {
    setIsPlaying(false);
    setIsRecording(true);
  }, []);

  const handleRecordingEnd = useCallback(() => {
    setIsRecording(false);
    setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => {
    setParams(DEFAULT_ANIMATION_PARAMS);
    setIsPlaying(false);
    setIsRecording(false);
    if (previewRef.current) {
      previewRef.current.reset();
    }
  }, []);

  const handleFrameRender = useCallback((time: number) => {
    setFrameTime(time);
  }, []);

  const renderStyleIcon = (iconType: 'T' | 'dashed' | 'solid') => {
    if (iconType === 'T') {
      return (
        <svg width="32" height="32" viewBox="0 0 32" fill="none">
          <text x="16" y="22" fontSize="24" textAnchor="middle" fill="#CCCCCC" fontFamily="monospace" fontWeight="bold">T</text>
        </svg>
      );
    }
    if (iconType === 'dashed') {
      return (
        <svg width="32" height="32" viewBox="0 0 32" fill="none">
          <rect x="4" y="8" width="24" height="16" stroke="#CCCCCC" strokeWidth="2" strokeDasharray="4 2" rx="2" />
        </svg>
      );
    }
    return (
      <svg width="32" height="32" viewBox="0 0 32" fill="none">
        <rect x="4" y="8" width="24" height="16" stroke="#CCCCCC" strokeWidth="2" rx="2" />
      </svg>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1E1E1E',
      padding: '20px',
      color: '#FFFFFF',
      fontFamily: 'sans-serif',
      boxSizing: 'border-box',
    }}>
      <div style={{
        display: 'flex',
        gap: '20px',
        height: 'calc(100vh - 40px)',
        minHeight: '600px',
      }}>
        {/* 左侧：代码编辑器 */}
        <div style={{
          width: '40%',
          minWidth: '300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#CCCCCC' }}>
            代码编辑器
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <CodeEditor
              code={code}
              language={language}
              onChange={handleCodeChange}
              onLanguageChange={handleLanguageChange}
            />
          </div>
          {frameTime > 0 && (
            <div style={{ fontSize: '12px', color: '#888' }}>
              帧渲染时间: {frameTime.toFixed(1)}ms
            </div>
          )}
        </div>

        {/* 中间：动画预览 */}
        <div style={{
          width: '50%',
          minWidth: `${CANVAS_WIDTH}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#CCCCCC' }}>
            动画预览 ({CANVAS_WIDTH}×{CANVAS_HEIGHT})
          </div>
          <AnimationPreview
            ref={previewRef}
            code={code}
            language={language}
            params={params}
            isPlaying={isPlaying}
            isRecording={isRecording}
            onPlayPause={handlePlayPause}
            onAnimationEnd={handleAnimationEnd}
            onFrameRender={handleFrameRender}
          />
          <button
            onClick={handlePlayPause}
            disabled={isRecording || !code.trim()}
            style={{
              padding: '12px 24px',
              borderRadius: '6px',
              border: 'none',
              cursor: isRecording || !code.trim() ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: isPlaying ? '#E74C3C' : '#2ECC40',
              color: '#FFFFFF',
              opacity: isRecording || !code.trim() ? 0.5 : 1,
              transition: 'background-color 0.2s',
              width: '200px',
            }}
            onMouseEnter={(e) => {
              if (!isRecording && code.trim()) {
                e.currentTarget.style.backgroundColor = isPlaying ? '#C0392B' : '#3DDC4F';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isPlaying ? '#E74C3C' : '#2ECC40';
            }}
          >
            {isPlaying ? '⏸ 暂停' : '▶ 播放'}
          </button>
        </div>

        {/* 右侧：控制面板 */}
        <div style={{
          width: 'calc(15% + 200px)',
          minWidth: '200px',
          backgroundColor: '#252526',
          padding: '16px',
          borderRadius: '0 8px 8px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#CCCCCC', marginBottom: '8px' }}>
            控制面板
          </div>

          {/* 动画风格 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '14px', color: '#CCCCCC' }}>动画风格</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ANIMATION_STYLES.map((style) => (
                <div
                  key={style.value}
                  onClick={() => handleParamChange('style', style.value)}
                  style={{
                    width: '100%',
                    height: '80px',
                    backgroundColor: '#2D2D2D',
                    borderRadius: '6px',
                    border: `2px solid ${params.style === style.value ? '#0E639C' : 'transparent'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    gap: '12px',
                    transition: 'border-color 0.2s, background-color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3D3D3D'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2D2D2D'; }}
                >
                  <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {renderStyleIcon(style.icon)}
                  </div>
                  <span style={{ fontSize: '12px', color: '#FFFFFF' }}>{style.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 播放速度 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '14px', color: '#CCCCCC' }}>播放速度: {params.speed.toFixed(1)}x</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={params.speed}
                onChange={(e) => handleParamChange('speed', parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  background: '#555',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '14px', color: '#FFFFFF', minWidth: '40px', textAlign: 'right' }}>
                {params.speed.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* 行高亮颜色 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '14px', color: '#CCCCCC' }}>行高亮颜色</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {HIGHLIGHT_COLOR_OPTIONS.map((color) => (
                <div
                  key={color}
                  onClick={() => handleParamChange('highlightColor', color)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    backgroundColor: color,
                    border: `2px solid ${params.highlightColor === color ? '#0E639C' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, transform 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                />
              ))}
            </div>
          </div>

          {/* 背景颜色 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '14px', color: '#CCCCCC' }}>背景颜色</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {BACKGROUND_COLOR_OPTIONS.map((color) => (
                <div
                  key={color}
                  onClick={() => handleParamChange('backgroundColor', color)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    backgroundColor: color,
                    border: `2px solid ${params.backgroundColor === color ? '#0E639C' : '#555'}`,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, transform 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                />
              ))}
            </div>
          </div>

          {/* 底部操作区 */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <VideoExporter
              canvas={previewRef.current?.getCanvas() || null}
              duration={previewRef.current?.getTotalDuration() || 0}
              isRecording={isRecording}
              onRecordingStart={handleRecordingStart}
              onRecordingEnd={handleRecordingEnd}
            />

            <button
              onClick={handleReset}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                backgroundColor: '#95A5A6',
                color: '#FFFFFF',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7F8C8D'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#95A5A6'; }}
            >
              重置参数
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
