import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WordBlock, COLOR_SCHEMES, interpolateColor } from './wordcloudUtils';

interface WordCloudCanvasProps {
  words: WordBlock[];
  onWordsChange: (words: WordBlock[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  colorSchemeIndex: number;
  previousColorSchemeIndex: number;
  colorTransitionProgress: number;
  readonly?: boolean;
  onExportTrigger?: (trigger: () => void) => void;
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

interface HoverState {
  id: string | null;
  startTime: number;
  baseRotation: number;
  randomRotation: number;
}

const WordCloudCanvas: React.FC<WordCloudCanvasProps> = ({
  words,
  onWordsChange,
  selectedId,
  onSelect,
  colorSchemeIndex,
  previousColorSchemeIndex,
  colorTransitionProgress,
  readonly = false,
  onExportTrigger,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverState, setHoverState] = useState<HoverState>({ id: null, startTime: 0, baseRotation: 0, randomRotation: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const animationRef = useRef<number>();
  const lastFrameRef = useRef<number>(0);

  const getInterpolatedColor = useCallback((wordIndex: number, totalWords: number): string => {
    const colorRatio = totalWords > 1 ? wordIndex / (totalWords - 1) : 0;
    const currentColors = COLOR_SCHEMES[colorSchemeIndex].colors;
    const prevColors = COLOR_SCHEMES[previousColorSchemeIndex].colors;
    
    const currentColor = interpolateColor(currentColors, colorRatio);
    const prevColor = interpolateColor(prevColors, colorRatio);
    
    const parseRgb = (rgbStr: string) => {
      const match = rgbStr.match(/rgb\((\d+),(\d+),(\d+)\)/);
      if (match) {
        return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
      }
      return { r: 0, g: 0, b: 0 };
    };

    const c1 = parseRgb(prevColor);
    const c2 = parseRgb(currentColor);
    const t = colorTransitionProgress;

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r},${g},${b})`;
  }, [colorSchemeIndex, previousColorSchemeIndex, colorTransitionProgress]);

  const getWordBounds = useCallback((ctx: CanvasRenderingContext2D, word: WordBlock, scale: number = 1): { x: number; y: number; width: number; height: number } => {
    ctx.save();
    const scaledFontSize = word.fontSize * scale;
    ctx.font = `${scaledFontSize}px "${word.fontFamily}"`;
    const metrics = ctx.measureText(word.text);
    const baseWidth = metrics.width;
    const baseHeight = scaledFontSize;
    ctx.restore();

    const rad = (word.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const width = baseWidth * cos + baseHeight * sin;
    const height = baseWidth * sin + baseHeight * cos;

    return {
      x: word.x - width / 2,
      y: word.y - height / 2,
      width,
      height,
    };
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = performance.now();
    const hoverAnimProgress = hoverState.id 
      ? Math.min(1, (now - hoverState.startTime) / 200)
      : 0;

    words.forEach((word, index) => {
      const isSelected = word.id === selectedId;
      const isHovered = word.id === hoverState.id;
      const isDragging = dragState?.id === word.id;
      const displayColor = getInterpolatedColor(index, words.length);

      let scale = 1;
      let displayRotation = word.rotation;

      if (isHovered && !isDragging && !readonly) {
        const hoverScale = 1 + 0.05 * hoverAnimProgress;
        scale = hoverScale;
        const rotDelta = hoverState.randomRotation * hoverAnimProgress;
        displayRotation = hoverState.baseRotation + rotDelta;
      }

      ctx.save();
      ctx.globalAlpha = word.opacity;

      const shadowOffsetX = isDragging || isSelected ? 6 : 3;
      const shadowOffsetY = isDragging || isSelected ? 6 : 3;
      const shadowBlur = isDragging || isSelected ? 10 : 5;
      const shadowColor = isDragging || isSelected ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)';

      if (isDragging) {
        ctx.globalAlpha = word.opacity * 0.7;
      }

      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = shadowOffsetX;
      ctx.shadowOffsetY = shadowOffsetY;

      ctx.translate(word.x, word.y);
      ctx.rotate((displayRotation * Math.PI) / 180);
      ctx.scale(scale, scale);

      const scaledFontSize = word.fontSize;
      ctx.font = `${scaledFontSize}px "${word.fontFamily}"`;
      ctx.fillStyle = displayColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(word.text, 0, 0);

      if (isSelected && !readonly) {
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([5, 5]);
        
        const metrics = ctx.measureText(word.text);
        const padding = 6;
        ctx.strokeRect(
          -metrics.width / 2 - padding,
          -scaledFontSize / 2 - padding,
          metrics.width + padding * 2,
          scaledFontSize + padding * 2
        );
      }

      ctx.restore();
    });
  }, [words, selectedId, dragState, hoverState, getInterpolatedColor, readonly]);

  const animate = useCallback((timestamp: number) => {
    if (timestamp - lastFrameRef.current >= 16) {
      render();
      lastFrameRef.current = timestamp;
    }
    animationRef.current = requestAnimationFrame(animate);
  }, [render]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      if (container) {
        const width = container.clientWidth;
        const height = Math.max(500, Math.min(800, width * 0.67));
        setCanvasSize({ width, height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getMousePos = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const hitTest = (x: number, y: number): WordBlock | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      const bounds = getWordBounds(ctx, word, 1.05);
      if (x >= bounds.x && x <= bounds.x + bounds.width &&
          y >= bounds.y && y <= bounds.y + bounds.height) {
        return word;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readonly) return;
    e.preventDefault();

    const pos = getMousePos(e);
    const hit = hitTest(pos.x, pos.y);

    if (hit) {
      onSelect(hit.id);
      setDragState({
        id: hit.id,
        offsetX: pos.x - hit.x,
        offsetY: pos.y - hit.y,
      });
    } else {
      onSelect(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);

    if (dragState) {
      const newWords = words.map(w => {
        if (w.id === dragState.id) {
          return {
            ...w,
            x: Math.max(50, Math.min(canvasSize.width - 50, pos.x - dragState.offsetX)),
            y: Math.max(50, Math.min(canvasSize.height - 50, pos.y - dragState.offsetY)),
          };
        }
        return w;
      });
      onWordsChange(newWords);
    } else if (!readonly) {
      const hit = hitTest(pos.x, pos.y);
      if (hit?.id !== hoverState.id) {
        if (hit) {
          const randomRot = (Math.random() - 0.5) * 10;
          setHoverState({
            id: hit.id,
            startTime: performance.now(),
            baseRotation: hit.rotation,
            randomRotation: randomRot,
          });
        } else {
          setHoverState({ id: null, startTime: 0, baseRotation: 0, randomRotation: 0 });
        }
      }
    }
  };

  const handleMouseUp = () => {
    setDragState(null);
  };

  const handleMouseLeave = () => {
    setDragState(null);
    setHoverState({ id: null, startTime: 0, baseRotation: 0, randomRotation: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (readonly) return;
    if (!selectedId) return;
    if (!e.shiftKey) return;

    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;

    const newWords = words.map(w => {
      if (w.id === selectedId) {
        const newSize = Math.max(16, Math.min(150, Math.round(w.fontSize * delta)));
        return { ...w, fontSize: newSize };
      }
      return w;
    });
    onWordsChange(newWords);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (readonly) return;
    e.preventDefault();

    const pos = getMousePos(e);
    const hit = hitTest(pos.x, pos.y);

    if (hit) {
      onSelect(hit.id);
      const newWords = words.map(w => {
        if (w.id === hit.id) {
          return { ...w, rotation: (w.rotation + 30) % 360 };
        }
        return w;
      });
      onWordsChange(newWords);
    }
  };

  const exportImage = useCallback((): string => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 1920;
    exportCanvas.height = 1080;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return '';

    const scaleX = 1920 / canvasSize.width;
    const scaleY = 1080 / canvasSize.height;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (1920 - canvasSize.width * scale) / 2;
    const offsetY = (1080 - canvasSize.height * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    words.forEach((word, index) => {
      const displayColor = getInterpolatedColor(index, words.length);
      ctx.save();
      ctx.globalAlpha = word.opacity;
      ctx.translate(word.x, word.y);
      ctx.rotate((word.rotation * Math.PI) / 180);
      ctx.font = `${word.fontSize}px "${word.fontFamily}"`;
      ctx.fillStyle = displayColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(word.text, 0, 0);
      ctx.restore();
    });

    ctx.restore();

    return exportCanvas.toDataURL('image/png');
  }, [words, canvasSize, getInterpolatedColor]);

  useEffect(() => {
    if (onExportTrigger) {
      onExportTrigger(exportImage);
    }
  }, [onExportTrigger, exportImage]);

  return (
    <div ref={containerRef} className="canvas-container">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="wordcloud-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
};

export default WordCloudCanvas;
