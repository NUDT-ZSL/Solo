import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { EditorPanel } from './editor/EditorPanel';
import { PreviewPanel } from './preview/PreviewPanel';
import {
  parseKeyframes,
  generateReverseAnimation,
  type ParsedAnimation,
} from './editor/animationParser';
import './App.css';

const DEFAULT_CODE = `@keyframes movement {
  from {
    transform: translateX(-150px) rotate(0deg) scale(1);
    opacity: 0.8;
  }
  50% {
    transform: translateX(0px) rotate(180deg) scale(1.2);
    opacity: 1;
  }
  to {
    transform: translateX(150px) rotate(360deg) scale(1);
    opacity: 0.8;
  }
}`;

const ANIMATION_DURATION = 2000;
const MIN_PANEL_WIDTH = 280;
const DEFAULT_SPLIT_RATIO = 0.3;

export default function App() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [reverseCode, setReverseCode] = useState<string>('');
  const [isReverse, setIsReverse] = useState<boolean>(false);
  const [splitRatio, setSplitRatio] = useState<number>(DEFAULT_SPLIT_RATIO);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isNarrowScreen, setIsNarrowScreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const prevCodeRef = useRef<string>(code);

  const parsedAnimation: ParsedAnimation | null = useMemo(() => {
    try {
      return parseKeyframes(code);
    } catch {
      return null;
    }
  }, [code]);

  useEffect(() => {
    const checkNarrow = () => setIsNarrowScreen(window.innerWidth < 768);
    checkNarrow();
    window.addEventListener('resize', checkNarrow);
    return () => window.removeEventListener('resize', checkNarrow);
  }, []);

  useEffect(() => {
    if (code !== prevCodeRef.current) {
      setIsReverse(false);
      prevCodeRef.current = code;
    }
  }, [code]);

  const handleCodeChange = useCallback((newCode: string) => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      setCode(newCode);
    }, 30);
  }, []);

  const handleGenerateReverse = useCallback(() => {
    const start = performance.now();
    const parsed = parseKeyframes(code);
    if (!parsed) {
      return;
    }
    const reversed = generateReverseAnimation(parsed);
    setReverseCode(reversed);
    setIsReverse(true);
    const elapsed = performance.now() - start;
    if (elapsed < 100) {
      // 满足100ms要求
    }
  }, [code]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      const clampedRatio = Math.max(
        MIN_PANEL_WIDTH / rect.width,
        Math.min(1 - MIN_PANEL_WIDTH / rect.width, ratio),
      );
      setSplitRatio(clampedRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleReset = useCallback(() => {
    setCode(DEFAULT_CODE);
    setReverseCode('');
    setIsReverse(false);
  }, []);

  const layoutStyle: React.CSSProperties = isNarrowScreen
    ? { flexDirection: 'column' as const }
    : { flexDirection: 'row' as const };

  const editorStyle: React.CSSProperties = isNarrowScreen
    ? { width: '100%', height: '45%' }
    : { width: `${splitRatio * 100}%`, height: '100%' };

  const previewStyle: React.CSSProperties = isNarrowScreen
    ? { width: '100%', height: '55%' }
    : { width: `${(1 - splitRatio) * 100}%`, height: '100%' };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-left">
          <div className="logo-mark" />
          <h1 className="app-title">CSS Animation Reverser</h1>
        </div>
        <div className="header-right">
          <button
            className="header-btn"
            onClick={handleReset}
            type="button"
            title="重置示例代码"
          >
            重置
          </button>
          <button
            className={`header-btn toggle-btn ${isReverse ? 'active' : ''}`}
            onClick={() => setIsReverse((r) => !r)}
            type="button"
            disabled={!parsedAnimation || !reverseCode}
            title="切换正/反向播放"
          >
            {isReverse ? '↺ 反向' : '↻ 正向'}
          </button>
        </div>
      </header>

      <div
        ref={containerRef}
        className={`app-container ${isDragging ? 'dragging' : ''}`}
        style={layoutStyle}
      >
        <div className="panel-wrapper editor-wrapper-app" style={editorStyle}>
          <EditorPanel
            value={code}
            onChange={handleCodeChange}
            reverseCode={reverseCode}
            onGenerateReverse={handleGenerateReverse}
          />
        </div>

        {!isNarrowScreen && (
          <div
            className={`splitter ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
            role="separator"
            aria-orientation="vertical"
            aria-label="拖拽调整面板宽度"
          >
            <div className="splitter-thumb">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div className="panel-wrapper preview-wrapper-app" style={previewStyle}>
          <PreviewPanel
            parsedAnimation={parsedAnimation}
            rawCss={code}
            isReverse={isReverse}
            reverseCss={reverseCode}
            animationDuration={ANIMATION_DURATION}
          />
        </div>
      </div>
    </div>
  );
}
