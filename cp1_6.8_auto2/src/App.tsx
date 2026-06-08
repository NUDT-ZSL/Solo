import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { FrameEditor, GRID_SIZE, FrameData } from './FrameEditor';
import { AnimationPlayer } from './AnimationPlayer';
import { ControlPanel } from './ControlPanel';

const App: React.FC = () => {
  const editorRef = useRef<FrameEditor>(new FrameEditor());
  const playerRef = useRef<AnimationPlayer>(new AnimationPlayer());
  const editorCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [, forceUpdate] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasScale, setCanvasScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = editorRef.current;
  const player = playerRef.current;

  const pixelSize = useMemo(() => Math.floor(24 * canvasScale), [canvasScale]);
  const canvasSize = GRID_SIZE * pixelSize;

  useEffect(() => {
    const unsub = editor.subscribe(() => {
      forceUpdate((n) => n + 1);
      player.setFrames(editor.getFrames());
    });
    player.setFrames(editor.getFrames());
    return unsub;
  }, [editor, player]);

  useEffect(() => {
    const unsub = player.subscribe(() => {
      forceUpdate((n) => n + 1);
    });
    return unsub;
  }, [player]);

  useEffect(() => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return;
    const frame = editor.getCurrentFrame();
    editor.renderFrameToCanvas(frame, canvas, pixelSize);
  }, [editor, pixelSize, editor.getState()]);

  useEffect(() => {
    if (!player.getIsPlaying()) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    player.renderToCanvas(canvas, pixelSize, (frame, c, ps) =>
      editor.renderFrameToCanvas(frame, c, ps)
    );
  }, [player, editor, pixelSize]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w < 600) {
          setCanvasScale(0.6);
        } else if (w < 900) {
          setCanvasScale(0.8);
        } else {
          setCanvasScale(1);
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getGridPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
      const canvas = editorCanvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / pixelSize);
      const y = Math.floor((e.clientY - rect.top) / pixelSize);
      return [
        Math.max(0, Math.min(GRID_SIZE - 1, x)),
        Math.max(0, Math.min(GRID_SIZE - 1, y)),
      ];
    },
    [pixelSize]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      setIsDrawing(true);
      const [x, y] = getGridPos(e);
      if (e.button === 2) {
        editor.setEraser(true);
      }
      editor.paint(x, y);
    },
    [editor, getGridPos]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const [x, y] = getGridPos(e);
      editor.paint(x, y);
    },
    [isDrawing, editor, getGridPos]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setIsDrawing(false);
    editor.setEraser(false);
  }, [editor]);

  const handleCanvasMouseLeave = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
    },
    []
  );

  const isPlaying = player.getIsPlaying();

  const drawEditorGrid = useCallback(
    (canvas: HTMLCanvasElement, frame: FrameData) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      ctx.imageSmoothingEnabled = false;

      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const color = frame[y][x];
          ctx.fillStyle = color || '#1a1a2e';
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * pixelSize + 0.5, 0);
        ctx.lineTo(i * pixelSize + 0.5, canvasSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * pixelSize + 0.5);
        ctx.lineTo(canvasSize, i * pixelSize + 0.5);
        ctx.stroke();
      }
    },
    [pixelSize, canvasSize]
  );

  useEffect(() => {
    const canvas = editorCanvasRef.current;
    if (!canvas) return;
    drawEditorGrid(canvas, editor.getCurrentFrame());
  }, [drawEditorGrid, editor]);

  return (
    <div className="app-container" ref={containerRef}>
      <header className="app-header">
        <h1 className="app-title">✦ 流萤剧场 ✦</h1>
        <p className="app-subtitle">Firefly Theater</p>
      </header>

      <div className="app-main">
        <div className="editor-area">
          <div className="canvas-wrapper">
            <canvas
              ref={editorCanvasRef}
              className="editor-canvas"
              width={canvasSize}
              height={canvasSize}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
              onContextMenu={handleCanvasContextMenu}
              style={{
                width: canvasSize,
                height: canvasSize,
                imageRendering: 'pixelated',
              }}
            />
          </div>
        </div>

        <div className="preview-area">
          <h3 className="area-title">预览</h3>
          <div className="preview-wrapper">
            <canvas
              ref={previewCanvasRef}
              className="preview-canvas"
              width={canvasSize}
              height={canvasSize}
              style={{
                width: canvasSize,
                height: canvasSize,
                imageRendering: 'pixelated',
              }}
            />
          </div>
          {!isPlaying && (
            <p className="preview-hint">点击 ▶ 开始预览动画</p>
          )}
        </div>

        <ControlPanel editor={editor} player={player} />
      </div>
    </div>
  );
};

export default App;
