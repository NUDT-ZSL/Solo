import { useEffect, useRef, useState, useMemo } from 'react';
import type { ParsedAnimation } from '../editor/animationParser';
import { injectStylesheet, removeStylesheet } from '../editor/animationParser';
import './PreviewPanel.css';

export interface PreviewPanelProps {
  parsedAnimation: ParsedAnimation | null;
  rawCss: string;
  isReverse: boolean;
  reverseCss: string;
  animationDuration: number;
}

const STYLE_ID = 'dynamic-animation-styles';
const REVERSE_STYLE_ID = 'dynamic-reverse-styles';

export function PreviewPanel({
  parsedAnimation,
  rawCss,
  isReverse,
  reverseCss,
  animationDuration,
}: PreviewPanelProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [playKey, setPlayKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const animationName = useMemo(() => {
    if (!parsedAnimation) return 'none';
    return isReverse ? `${parsedAnimation.name}-reverse` : parsedAnimation.name;
  }, [parsedAnimation, isReverse]);

  useEffect(() => {
    if (rawCss.trim()) {
      injectStylesheet(rawCss, STYLE_ID);
    }
    return () => {
      removeStylesheet(STYLE_ID);
    };
  }, [rawCss]);

  useEffect(() => {
    if (reverseCss.trim()) {
      injectStylesheet(reverseCss, REVERSE_STYLE_ID);
    }
    return () => {
      removeStylesheet(REVERSE_STYLE_ID);
    };
  }, [reverseCss]);

  useEffect(() => {
    if (isReverse) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPlayKey((k) => k + 1);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setPlayKey((k) => k + 1);
    }
  }, [isReverse, animationName]);

  useEffect(() => {
    if (!isTransitioning) {
      const timer = setTimeout(() => setPlayKey((k) => k + 1), 10);
      return () => clearTimeout(timer);
    }
  }, [rawCss]);

  const boxStyle: React.CSSProperties = {
    animation: parsedAnimation
      ? `${animationName} ${animationDuration}ms ease-in-out infinite both`
      : 'none',
    opacity: isTransitioning ? 0.5 : 1,
    transform: isTransitioning ? 'scale(0.9)' : 'scale(1)',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
  };

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <h3 className="panel-title preview-title">实时预览</h3>
        <div className="status-indicator">
          <span className={`status-dot ${parsedAnimation ? 'active' : 'idle'}`} />
          <span className="status-text">
            {parsedAnimation
              ? isReverse
                ? `播放: ${animationName}`
                : `播放: ${animationName}`
              : '等待输入动画...'}
          </span>
        </div>
      </div>
      <div className="preview-canvas">
        <div className="canvas-inner">
          <div className="grid-overlay" />
          <div
            key={playKey}
            ref={boxRef}
            className="animated-box"
            style={boxStyle}
          />
        </div>
      </div>
      <div className="preview-footer">
        <div className="info-card">
          <span className="info-label">时长</span>
          <span className="info-value">{animationDuration}ms</span>
        </div>
        <div className="info-card">
          <span className="info-label">模式</span>
          <span className={`info-value mode-${isReverse ? 'reverse' : 'normal'}`}>
            {isReverse ? '反向' : '正向'}
          </span>
        </div>
        <div className="info-card">
          <span className="info-label">关键帧</span>
          <span className="info-value">
            {parsedAnimation ? parsedAnimation.keyframes.length : 0}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PreviewPanel;
