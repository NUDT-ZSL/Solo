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

interface PerformanceMetrics {
  lastPreviewUpdateMs: number;
  lastReverseGenMs: number;
  previewUpdateHistory: number[];
  reverseGenHistory: number[];
}

export default function App() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [reverseCode, setReverseCode] = useState<string>('');
  const [isReverse, setIsReverse] = useState<boolean>(false);
  const [splitRatio, setSplitRatio] = useState<number>(DEFAULT_SPLIT_RATIO);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isNarrowScreen, setIsNarrowScreen] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lastPreviewUpdateMs: 0,
    lastReverseGenMs: 0,
    previewUpdateHistory: [],
    reverseGenHistory: [],
  });
  const [showMetrics, setShowMetrics] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const prevCodeRef = useRef<string>(code);
  const codeChangeStartRef = useRef<number>(0);

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
      if (codeChangeStartRef.current > 0) {
        const elapsed = performance.now() - codeChangeStartRef.current;
        setMetrics((m) => ({
          ...m,
          lastPreviewUpdateMs: elapsed,
          previewUpdateHistory: [...m.previewUpdateHistory.slice(-9), elapsed],
        }));
        if (elapsed > 50) {
          console.warn(`[Performance] 预览更新延迟 ${elapsed.toFixed(1)}ms，超过 50ms 阈值`);
        } else {
          console.info(`[Performance] 预览更新延迟 ${elapsed.toFixed(1)}ms ✅`);
        }
        codeChangeStartRef.current = 0;
      }
      setIsReverse(false);
      prevCodeRef.current = code;
    }
  }, [code]);

  const handleCodeChange = useCallback((newCode: string) => {
    if (codeChangeStartRef.current === 0) {
      codeChangeStartRef.current = performance.now();
    }
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      setCode(newCode);
    }, 30);
  }, []);

  const handleGenerateReverse = useCallback(() => {
    const start = performance.now();
    console.time('generateReverseAnimation');
    const parsed = parseKeyframes(code);
    if (!parsed) {
      console.timeEnd('generateReverseAnimation');
      return;
    }
    const reversed = generateReverseAnimation(parsed);
    setReverseCode(reversed);
    setIsReverse(true);
    console.timeEnd('generateReverseAnimation');
    const elapsed = performance.now() - start;
    setMetrics((m) => ({
      ...m,
      lastReverseGenMs: elapsed,
      reverseGenHistory: [...m.reverseGenHistory.slice(-9), elapsed],
    }));
    if (elapsed > 100) {
      console.warn(`[Performance] 反向动画生成 ${elapsed.toFixed(1)}ms，超过 100ms 阈值`);
    } else {
      console.info(`[Performance] 反向动画生成 ${elapsed.toFixed(1)}ms ✅`);
    }
  }, [code]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      const minRatio = MIN_PANEL_WIDTH / rect.width;
      const maxRatio = 1 - minRatio;
      const clampedRatio = Math.max(minRatio, Math.min(maxRatio, ratio));
      setSplitRatio(clampedRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const handleReset = useCallback(() => {
    setCode(DEFAULT_CODE);
    setReverseCode('');
    setIsReverse(false);
  }, []);

  const handleToggleReverse = useCallback(() => {
    setIsReverse((r) => !r);
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

  const avgPreview = metrics.previewUpdateHistory.length > 0
    ? metrics.previewUpdateHistory.reduce((a, b) => a + b, 0) / metrics.previewUpdateHistory.length
    : 0;
  const avgReverse = metrics.reverseGenHistory.length > 0
    ? metrics.reverseGenHistory.reduce((a, b) => a + b, 0) / metrics.reverseGenHistory.length
    : 0;

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-left">
          <div className="logo-mark" />
          <h1 className="app-title">CSS Animation Reverser</h1>
        </div>
        <div className="header-right">
          <button
            className="header-btn metrics-btn"
            onClick={() => setShowMetrics((s) => !s)}
            type="button"
            title="显示/隐藏性能数据"
          >
            {showMetrics ? '隐藏性能' : '显示性能'}
          </button>
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
            onClick={handleToggleReverse}
            type="button"
            disabled={!parsedAnimation || !reverseCode}
            title="切换正/反向播放"
          >
            {isReverse ? '↺ 反向' : '↻ 正向'}
          </button>
        </div>
      </header>

      {showMetrics && (
        <div className="metrics-bar">
          <div className="metric-item">
            <span className="metric-label">最近预览更新</span>
            <span className={`metric-value ${metrics.lastPreviewUpdateMs > 50 ? 'warn' : 'ok'}`}>
              {metrics.lastPreviewUpdateMs.toFixed(1)}ms / 50ms
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">平均预览更新</span>
            <span className={`metric-value ${avgPreview > 50 ? 'warn' : 'ok'}`}>
              {avgPreview.toFixed(1)}ms
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">最近反向生成</span>
            <span className={`metric-value ${metrics.lastReverseGenMs > 100 ? 'warn' : 'ok'}`}>
              {metrics.lastReverseGenMs.toFixed(1)}ms / 100ms
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">平均反向生成</span>
            <span className={`metric-value ${avgReverse > 100 ? 'warn' : 'ok'}`}>
              {avgReverse.toFixed(1)}ms
            </span>
          </div>
        </div>
      )}

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
            aria-valuemin={MIN_PANEL_WIDTH}
            aria-valuemax={100 - MIN_PANEL_WIDTH}
            aria-valuenow={Math.round(splitRatio * 100)}
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
            reverseCss={reverseCss}
            animationDuration={ANIMATION_DURATION}
          />
        </div>
      </div>
    </div>
  );
}
