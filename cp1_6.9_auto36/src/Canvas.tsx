import React, { useRef, useState, useEffect, useCallback } from 'react';

interface CanvasProps {
  onSave: (base64Data: string) => void;
  onCancel: () => void;
}

const COLORS = ['#000000', '#E74C3C', '#E67E22', '#F1C40F', '#27AE60', '#2563EB', '#8E44AD', '#D2B48C'];
const WIDTH = 600;
const HEIGHT = 400;

const DrawingCanvas: React.FC<CanvasProps> = ({ onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const hasDrawn = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pos = getPos(e);
    lastPos.current = pos;
    setIsDrawing(true);
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPos.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const pos = getPos(e);
    ctx.strokeStyle = isEraser ? '#FFFFFF' : color;
    ctx.lineWidth = isEraser ? brushSize * 4 : brushSize;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    hasDrawn.current = true;
  }, [isDrawing, color, brushSize, isEraser, getPos]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    hasDrawn.current = false;
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL('image/png');
    onSave(data);
  }, [onSave]);

  return (
    <div className="canvas-container">
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          style={{ width: '100%', maxWidth: WIDTH, aspectRatio: `${WIDTH}/${HEIGHT}` }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div className="canvas-toolbar">
        <div className="tool-group">
          <span className="tool-label">颜色</span>
          <div className="color-swatches">
            {COLORS.map(c => (
              <div
                key={c}
                className={`color-swatch ${color === c && !isEraser ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => { setColor(c); setIsEraser(false); }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => { setColor(e.target.value); setIsEraser(false); }}
              style={{ width: 24, height: 24, border: 'none', cursor: 'pointer', borderRadius: 4 }}
            />
          </div>
        </div>
        <div className="tool-group">
          <span className="tool-label">粗细 {brushSize}px</span>
          <input
            type="range"
            className="brush-slider"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />
        </div>
        <div className="tool-group">
          <button
            className={`tool-btn ${isEraser ? 'active' : ''}`}
            onClick={() => setIsEraser(true)}
          >
            🧽 橡皮擦
          </button>
          <button
            className={`tool-btn ${!isEraser ? 'active' : ''}`}
            onClick={() => setIsEraser(false)}
          >
            ✏️ 画笔
          </button>
          <button className="tool-btn" onClick={clearCanvas}>
            🗑️ 清空
          </button>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={onCancel}>取消</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={!hasDrawn.current}>
          确认使用
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas;
