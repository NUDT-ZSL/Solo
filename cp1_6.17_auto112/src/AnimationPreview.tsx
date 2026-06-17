import React, { useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  Language,
  AnimationParams,
  FPS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  FONT_FAMILY,
  FONT_SIZE,
  LINE_HEIGHT,
  PADDING,
  HIGHLIGHT_COLORS,
} from './types';
import { parseToTokens } from './utils/highlight';

interface AnimationPreviewProps {
  code: string;
  language: Language;
  params: AnimationParams;
  isPlaying: boolean;
  isRecording: boolean;
  onPlayPause: () => void;
  onAnimationEnd: () => void;
  onFrameRender?: (frameTime: number) => void;
}

export interface AnimationPreviewRef {
  getCanvas: () => HTMLCanvasElement | null;
  getTotalDuration: () => number;
  reset: () => void;
}

const AnimationPreview = forwardRef<AnimationPreviewRef, AnimationPreviewProps>((
  { code, language, params, isPlaying, isRecording, onPlayPause, onAnimationEnd, onFrameRender },
  ref
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const currentProgressRef = useRef<number>(0);
  const pausedProgressRef = useRef<number>(0);

  const tokens = useMemo(() => parseToTokens(code, language), [code, language]);
  const lines = useMemo(() => code.split('\n'), [code]);
  const lineHeightPx = FONT_SIZE * LINE_HEIGHT;

  const totalDuration = useMemo(() => {
    if (!code.trim()) return 0;

    switch (params.style) {
      case 'typewriter': {
        const charInterval = 60 / params.speed;
        return code.length * charInterval;
      }
      case 'fade': {
        const lineInterval = 100 / params.speed;
        return lines.length * lineInterval + 200;
      }
      case 'highlight': {
        const highlightDuration = 300 / params.speed;
        return lines.length * highlightDuration;
      }
      default:
        return 0;
    }
  }, [code, params.style, params.speed, lines.length]);

  const getTextColor = (bgColor: string): string => {
    return bgColor === '#FFFFFF' ? '#333333' : HIGHLIGHT_COLORS.default;
  };

  const renderFrame = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameStart = performance.now();

    ctx.fillStyle = params.backgroundColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (!code.trim()) {
      if (onFrameRender) {
        onFrameRender(performance.now() - frameStart);
      }
      return;
    }

    ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.textBaseline = 'top';

    switch (params.style) {
      case 'typewriter': {
        const charInterval = 60 / params.speed;
        const charsToShow = Math.min(Math.floor(progress / charInterval), code.length);
        let charCount = 0;

        for (let lineIdx = 0; lineIdx < tokens.length; lineIdx++) {
          const lineTokens = tokens[lineIdx];
          const y = PADDING + lineIdx * lineHeightPx;

          if (charCount >= charsToShow) break;

          let x = PADDING;
          for (const token of lineTokens) {
            if (charCount >= charsToShow) break;

            const charsInToken = Math.min(token.value.length, charsToShow - charCount);
            const displayText = token.value.substring(0, charsInToken);

            ctx.fillStyle = params.backgroundColor === '#FFFFFF' && token.type === 'default'
              ? '#333333'
              : token.color;

            if (displayText) {
              ctx.fillText(displayText, x, y);
            }

            x += ctx.measureText(displayText).width;
            charCount += charsInToken;

            if (charsInToken < token.value.length) break;
          }

          if (charCount < charsToShow) {
            charCount++;
          }
        }
        break;
      }

      case 'fade': {
        const lineInterval = 100 / params.speed;
        const fadeDuration = 200;

        for (let lineIdx = 0; lineIdx < tokens.length; lineIdx++) {
          const lineStart = lineIdx * lineInterval;
          const y = PADDING + lineIdx * lineHeightPx;

          if (progress < lineStart) continue;

          const timeInLine = progress - lineStart;
          const opacity = Math.min(timeInLine / fadeDuration, 1);

          if (opacity <= 0) continue;

          ctx.globalAlpha = opacity;

          let x = PADDING;
          for (const token of tokens[lineIdx]) {
            ctx.fillStyle = params.backgroundColor === '#FFFFFF' && token.type === 'default'
              ? '#333333'
              : token.color;

            if (token.value) {
              ctx.fillText(token.value, x, y);
            }
            x += ctx.measureText(token.value).width;
          }

          ctx.globalAlpha = 1;
        }
        break;
      }

      case 'highlight': {
        const highlightDuration = 300 / params.speed;
        const currentLineIdx = Math.floor(progress / highlightDuration);

        for (let lineIdx = 0; lineIdx < tokens.length; lineIdx++) {
          const y = PADDING + lineIdx * lineHeightPx;

          if (lineIdx > currentLineIdx) break;

          if (lineIdx === currentLineIdx) {
            const lineProgress = (progress % highlightDuration) / highlightDuration;
            ctx.fillStyle = params.highlightColor;
            ctx.globalAlpha = Math.sin(lineProgress * Math.PI);
            ctx.fillRect(PADDING - 4, y, CANVAS_WIDTH - PADDING * 2 + 8, lineHeightPx);
            ctx.globalAlpha = 1;
          }

          let x = PADDING;
          for (const token of tokens[lineIdx]) {
            ctx.fillStyle = lineIdx === currentLineIdx
              ? '#000000'
              : params.backgroundColor === '#FFFFFF' && token.type === 'default'
                ? '#333333'
                : token.color;

            if (token.value) {
              ctx.fillText(token.value, x, y);
            }
            x += ctx.measureText(token.value).width;
          }
        }
        break;
      }
    }

    if (onFrameRender) {
      onFrameRender(performance.now() - frameStart);
    }
  }, [code, tokens, params, lineHeightPx, onFrameRender]);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getTotalDuration: () => totalDuration,
    reset: () => {
      pausedProgressRef.current = 0;
      currentProgressRef.current = 0;
      renderFrame(0);
    },
  }), [totalDuration, renderFrame]);

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
      lastFrameTimeRef.current = timestamp;
    }

    const frameInterval = 1000 / FPS;
    if (timestamp - lastFrameTimeRef.current >= frameInterval) {
      const elapsed = timestamp - startTimeRef.current + pausedProgressRef.current;
      currentProgressRef.current = elapsed;

      if (elapsed >= totalDuration && totalDuration > 0) {
        currentProgressRef.current = totalDuration;
        renderFrame(totalDuration);
        onAnimationEnd();
        return;
      }

      renderFrame(elapsed);
      lastFrameTimeRef.current = timestamp;
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [totalDuration, renderFrame, onAnimationEnd]);

  useEffect(() => {
    if (isPlaying || isRecording) {
      startTimeRef.current = 0;
      lastFrameTimeRef.current = 0;
      if (isRecording) {
        pausedProgressRef.current = 0;
        currentProgressRef.current = 0;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
        pausedProgressRef.current = currentProgressRef.current;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
    };
  }, [isPlaying, isRecording, animate]);

  useEffect(() => {
    renderFrame(currentProgressRef.current);
  }, [params.backgroundColor, params.highlightColor, params.style, renderFrame]);

  useEffect(() => {
    if (!isPlaying && !isRecording) {
      renderFrame(currentProgressRef.current);
    }
  }, [code, language, isPlaying, isRecording, renderFrame]);

  useEffect(() => {
    if (!isPlaying && !isRecording) {
      currentProgressRef.current = 0;
      pausedProgressRef.current = 0;
      renderFrame(0);
    }
  }, [code, params.style, params.speed, isPlaying, isRecording, renderFrame]);

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    minWidth: '600px',
    borderRadius: '8px',
    border: '1px solid #444',
    overflow: 'hidden',
    backgroundColor: params.backgroundColor,
  };

  const canvasStyles: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height: 'auto',
    maxWidth: `${CANVAS_WIDTH}px`,
    margin: '0 auto',
  };

  const overlayStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    opacity: isPlaying || isRecording ? 0 : 1,
    pointerEvents: isPlaying || isRecording ? 'none' : 'auto',
    transition: 'opacity 0.2s',
  };

  const playButtonStyles: React.CSSProperties = {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#2ECC40',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '32px',
    transition: 'background-color 0.2s, transform 0.1s',
  };

  const handlePlayClick = () => {
    onPlayPause();
  };

  return (
    <div style={containerStyles}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={canvasStyles}
      />
      <div style={overlayStyles}>
        <button
          onClick={handlePlayClick}
          style={playButtonStyles}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3DDC4F')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2ECC40')}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          ▶
        </button>
      </div>
    </div>
  );
});

AnimationPreview.displayName = 'AnimationPreview';

export default AnimationPreview;
