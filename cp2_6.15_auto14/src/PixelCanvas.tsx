import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePixelState } from './PixelState';
import { ToolType, RGB } from './types';
import { drawGrid, drawFrameOnCtx, getLinePixels, getRectanglePixels, getCirclePixels } from './utils/canvasUtils';

interface ShapeStart {
  x: number;
  y: number;
}

const PixelCanvas: React.FC = () => {
  const { state, dispatch } = usePixelState();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onionSkinRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPixel = useRef<{ x: number; y: number } | null>(null);
  const shapeStart = useRef<ShapeStart | null>(null);
  const [animZoom, setAnimZoom] = useState(state.zoom);
  const animFrame = useRef<number | null>(null);

  const project = state.project;
  const currentFrame = project.frames[project.currentFrameIndex];
  const tool = state.tool.currentTool;
  const currentColor = state.color.currentColor;
  const targetZoom = state.zoom;

  useEffect(() => {
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    const startZoom = animZoom;
    const delta = targetZoom - startZoom;
    const duration = 200;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimZoom(startZoom + delta * ease);
      if (t < 1) animFrame.current = requestAnimationFrame(tick);
    };
    animFrame.current = requestAnimationFrame(tick);
    return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetZoom]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const onionCanvas = onionSkinRef.current;
    if (!canvas || !onionCanvas) return;
    const w = project.width * animZoom;
    const h = project.height * animZoom;
    canvas.width = w;
    canvas.height = h;
    onionCanvas.width = w;
    onionCanvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const octx = onionCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    octx.imageSmoothingEnabled = false;

    drawGrid(ctx, project.width, project.height, animZoom);
    drawFrameOnCtx(ctx, currentFrame, animZoom, {
      currentLayerId: project.currentLayerId,
      hideNonActive: true
    });

    if (state.onionSkin.enabled && !state.playback.isPlaying) {
      octx.clearRect(0, 0, w, h);
      const baseOpacity = state.onionSkin.opacity / 100;
      const count = state.onionSkin.frameCount;
      for (let i = 1; i <= count; i++) {
        const prevIdx = project.currentFrameIndex - i;
        if (prevIdx < 0) break;
        const prevFrame = project.frames[prevIdx];
        const opacityFactor = 1 - (i - 1) / count;
        drawFrameOnCtx(octx, prevFrame, animZoom, {
          globalOpacity: baseOpacity * opacityFactor
        });
      }
    } else if (!state.onionSkin.enabled || state.playback.isPlaying) {
      octx.clearRect(0, 0, w, h);
    }
  }, [project, currentFrame, animZoom, state.onionSkin, state.playback.isPlaying]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    if (!state.playback.isPlaying) return;
    const intervalMs = 1000 / state.playback.fps;
    const timer = setInterval(() => {
      dispatch({ type: 'ADVANCE_FRAME' });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [state.playback.isPlaying, state.playback.fps, dispatch]);

  const getPixelCoords = (e: React.MouseEvent<HTMLDivElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / animZoom);
    const y = Math.floor((e.clientY - rect.top) / animZoom);
    if (x < 0 || x >= project.width || y < 0 || y >= project.height) return null;
    return { x, y };
  };

  const applyPixels = (pixels: Array<[number, number]>, color: RGB | null) => {
    dispatch({
      type: 'SET_PIXELS_BATCH',
      payload: {
        pixels: pixels.map(([x, y]) => ({ x, y, color }))
      }
    });
  };

  const handleToolAction = (x: number, y: number, toolType: ToolType, coords: { x: number; y: number } | null = null) => {
    switch (toolType) {
      case 'pencil':
      case 'eraser': {
        const color = toolType === 'eraser' ? null : currentColor;
        if (lastPixel.current) {
          const line = getLinePixels(lastPixel.current.x, lastPixel.current.y, x, y);
          applyPixels(line, color);
        } else {
          applyPixels([[x, y]], color);
        }
        lastPixel.current = { x, y };
        break;
      }
      case 'fill':
        dispatch({
          type: 'FILL_REGION',
          payload: { x, y, color: currentColor }
        });
        break;
      case 'picker': {
        const frame = currentFrame;
        let picked: RGB | null = null;
        for (let li = frame.layers.length - 1; li >= 0; li--) {
          const pixel = frame.layers[li].pixels[y]?.[x];
          if (pixel) { picked = pixel; break; }
        }
        if (picked) {
          dispatch({ type: 'SET_COLOR', payload: picked });
          dispatch({ type: 'SET_TOOL', payload: 'pencil' });
        }
        break;
      }
      case 'rectangle':
      case 'circle': {
        if (coords && shapeStart.current) {
          const pts = toolType === 'rectangle'
            ? getRectanglePixels(shapeStart.current.x, shapeStart.current.y, coords.x, coords.y)
            : getCirclePixels(
                Math.round((shapeStart.current.x + coords.x) / 2),
                Math.round((shapeStart.current.y + coords.y) / 2),
                Math.max(1, Math.round(Math.max(Math.abs(coords.x - shapeStart.current.x), Math.abs(coords.y - shapeStart.current.y)) / 2))
              );
          applyPixels(pts, currentColor);
        }
        break;
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const coords = getPixelCoords(e);
    if (!coords) return;
    isDrawing.current = true;
    lastPixel.current = null;
    if (tool === 'rectangle' || tool === 'circle') {
      shapeStart.current = { ...coords };
    }
    handleToolAction(coords.x, coords.y, tool);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing.current) return;
    const coords = getPixelCoords(e);
    if (!coords) return;
    if (tool === 'pencil' || tool === 'eraser') {
      handleToolAction(coords.x, coords.y, tool);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing.current) return;
    const coords = getPixelCoords(e);
    if ((tool === 'rectangle' || tool === 'circle') && shapeStart.current && coords) {
      handleToolAction(coords.x, coords.y, tool, coords);
    }
    isDrawing.current = false;
    lastPixel.current = null;
    shapeStart.current = null;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    handleMouseUp(e);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -2 : 2;
    dispatch({ type: 'SET_ZOOM', payload: state.zoom + delta });
  };

  return (
    <div
      ref={containerRef}
      style={styles.wrapper}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      <div style={styles.zoomIndicator}>
        <span style={{ fontSize: '12px', color: '#888' }}>缩放: {animZoom.toFixed(0)}x</span>
      </div>
      <div style={styles.canvasStage}>
        <div style={styles.canvasBorder}>
          <div style={{ position: 'relative', lineHeight: 0 }}>
            <canvas
              ref={canvasRef}
              style={{
                display: 'block',
                imageRendering: 'pixelated',
                cursor: getCursorForTool(tool),
                position: 'relative',
                zIndex: 1
              }}
            />
            <canvas
              ref={onionSkinRef}
              style={{
                display: 'block',
                imageRendering: 'pixelated',
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 2,
                opacity: state.onionSkin.enabled && !state.playback.isPlaying ? 1 : 0,
                transition: 'opacity 0.2s ease'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

function getCursorForTool(tool: ToolType): string {
  switch (tool) {
    case 'pencil': return 'crosshair';
    case 'eraser': return 'cell';
    case 'fill': return 'copy';
    case 'picker': return 'pointer';
    case 'rectangle':
    case 'circle':
      return 'crosshair';
    default: return 'crosshair';
  }
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    flex: 1,
    backgroundColor: '#333333',
    position: 'relative',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column'
  },
  canvasStage: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    minHeight: '200px'
  },
  canvasBorder: {
    border: '1px solid #555555',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    padding: 0,
    backgroundColor: '#808080'
  },
  zoomIndicator: {
    position: 'absolute',
    top: '10px',
    right: '16px',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: '4px 10px',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: 10
  }
};

export default PixelCanvas;
