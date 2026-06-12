import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
const TRANSITION_MS = 500;

interface FrozenState {
  transform: string;
  opacity: string;
}

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
  const [frozenState, setFrozenState] = useState<FrozenState | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

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

  const captureCurrentState = useCallback((): FrozenState | null => {
    if (!boxRef.current) return null;
    const computed = window.getComputedStyle(boxRef.current);
    return {
      transform: computed.transform !== 'none' ? computed.transform : 'matrix(1, 0, 0, 1, 0, 0)',
      opacity: computed.opacity,
    };
  }, []);

  useEffect(() => {
    if (!parsedAnimation) {
      setPlayKey((k) => k + 1);
      return;
    }

    if (isTransitioning) return;

    const currentState = captureCurrentState();

    if (currentState) {
      setFrozenState(currentState);
      setIsTransitioning(true);

      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }

      transitionTimerRef.current = window.setTimeout(() => {
        setFrozenState(null);
        setIsTransitioning(false);
        setPlayKey((k) => k + 1);
        transitionTimerRef.current = null;
      }, TRANSITION_MS);
    } else {
      setPlayKey((k) => k + 1);
    }

    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, [isReverse, animationName, parsedAnimation, captureCurrentState]);

  useEffect(() => {
    if (!isTransitioning) {
      const timer = window.setTimeout(() => setPlayKey((k) => k + 1), 10);
      return () => window.clearTimeout(timer);
    }
  }, [rawCss, isTransitioning]);

  const baseAnimation = parsedAnimation
    ? `${animationName} ${animationDuration}ms ease-in-out infinite both`
    : 'none';

  const boxStyle: React.CSSProperties = frozenState
    ? {
        animation: 'none',
        transform: frozenState.transform,
        opacity: parseFloat(frozenState.opacity),
        transition: `transform ${TRANSITION_MS}ms ease-in-out, opacity ${TRANSITION_MS}ms ease-in-out, filter ${TRANSITION_MS}ms ease-in-out`,
      }
    : {
        animation: baseAnimation,
        transform: undefined,
        opacity: undefined,
        transition: 'none',
      };

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <h3 className="panel-title preview-title">实时预览</h3>
        <div className="status-indicator">
          <span className={`status-dot ${parsedAnimation ? 'active' : 'idle'}`} />
          <span className="status-text">
            {parsedAnimation
              ? `播放: ${animationName}${isTransitioning ? ' (过渡中)' : ''}`
              : '等待输入动画...'}
          </span>
        </div>
      </div>
      <div className="preview-canvas">
        <div className="canvas-inner">
          <div className="grid-overlay" />
          <div className="shadow-floor" />
          <div
            key={playKey}
            ref={boxRef}
            className={`animated-box ${frozenState ? 'is-transitioning' : ''}`}
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
        <div className="info-card">
          <span className="info-label">过渡</span>
          <span className={`info-value ${isTransitioning ? 'mode-reverse' : 'mode-normal'}`}>
            {isTransitioning ? `${TRANSITION_MS}ms` : '空闲'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PreviewPanel;
