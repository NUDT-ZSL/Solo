import { useState, useRef, useEffect, useCallback } from 'react';
import { Poem } from '../data/poems';
import { CharScore } from '../App';
import throttle from 'lodash.throttle';

interface PracticePanelProps {
  poem: Poem;
  chars: string[];
  onScoreUpdate: (index: number, char: string, score: number) => void;
  scores: CharScore[];
}

const CANVAS_WIDTH = 650;
const CANVAS_HEIGHT = 320;
const GRID_SIZE = 60;
const GRID_PADDING = 10;
const GRID_GAP = 5;
const COLS = 10;

const PracticePanel: React.FC<PracticePanelProps> = ({ poem, chars, onScoreUpdate, scores }) => {
  const demoCanvasRef = useRef<HTMLCanvasElement>(null);
  const practiceCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeCellIndex, setActiveCellIndex] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [animProgress, setAnimProgress] = useState(0);
  const animationRef = useRef<number | null>(null);

  const getGridPosition = (index: number) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    return {
      x: GRID_PADDING + col * (GRID_SIZE + GRID_GAP),
      y: GRID_PADDING + row * (GRID_SIZE + GRID_GAP)
    };
  };

  const getIndexFromPosition = (x: number, y: number): number => {
    const col = Math.floor((x - GRID_PADDING) / (GRID_SIZE + GRID_GAP));
    const row = Math.floor((y - GRID_PADDING) / (GRID_SIZE + GRID_GAP));
    const index = row * COLS + col;
    if (index >= 0 && index < chars.length) {
      const pos = getGridPosition(index);
      if (x >= pos.x && x <= pos.x + GRID_SIZE && y >= pos.y && y <= pos.y + GRID_SIZE) {
        return index;
      }
    }
    return activeCellIndex;
  };

  const drawNoiseBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#f5f0e6';
    ctx.fillRect(0, 0, width, height);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 3;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, count: number, isDemo: boolean) => {
    ctx.strokeStyle = isDemo ? 'rgba(139, 115, 85, 0.3)' : 'rgba(139, 115, 85, 0.2)';
    ctx.lineWidth = 1;

    for (let i = 0; i < count; i++) {
      const { x, y } = getGridPosition(i);
      
      ctx.beginPath();
      ctx.rect(x, y, GRID_SIZE, GRID_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(x, y + GRID_SIZE / 2);
      ctx.lineTo(x + GRID_SIZE, y + GRID_SIZE / 2);
      ctx.moveTo(x + GRID_SIZE / 2, y);
      ctx.lineTo(x + GRID_SIZE / 2, y + GRID_SIZE);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, []);

  const drawChar = useCallback((
    ctx: CanvasRenderingContext2D,
    char: string,
    x: number,
    y: number,
    options: { alpha?: number; isOutline?: boolean } = {}
  ) => {
    const { alpha = 1, isOutline = false } = options;
    ctx.save();
    
    ctx.font = `${GRID_SIZE - 10}px "KaiTi", "STKaiti", "楷体", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    
    if (isOutline) {
      ctx.fillStyle = 'rgba(213, 201, 179, 0.3)';
    } else {
      ctx.fillStyle = '#2c1810';
    }
    ctx.fillText(char, x + GRID_SIZE / 2, y + GRID_SIZE / 2);
    
    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = demoCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const STROKE_DURATION = 600;
    const STROKE_GAP = 800;
    const FADE_DURATION = 300;
    const charCount = chars.length;
    const totalAnimTime = charCount * (STROKE_DURATION + STROKE_GAP) + FADE_DURATION;

    let startTime: number | null = null;
    let fullDisplayTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / totalAnimTime, 1);
      setAnimProgress(progress);

      drawNoiseBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawGrid(ctx, charCount, true);

      chars.forEach((char, index) => {
        const charStartTime = index * (STROKE_DURATION + STROKE_GAP);
        const charEndTime = charStartTime + STROKE_DURATION;
        const { x, y } = getGridPosition(index);

        if (elapsed >= charEndTime) {
          drawChar(ctx, char, x, y);
        } else if (elapsed >= charStartTime) {
          const charProgress = (elapsed - charStartTime) / STROKE_DURATION;
          drawChar(ctx, char, x, y, { alpha: charProgress });
        }
      });

      if (elapsed >= totalAnimTime - FADE_DURATION) {
        if (!fullDisplayTime) fullDisplayTime = timestamp;
        const fadeProgress = Math.min((timestamp - fullDisplayTime) / FADE_DURATION, 1);
        ctx.save();
        ctx.globalAlpha = fadeProgress * 0.08;
        ctx.fillStyle = '#f5f0e6';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [poem.id, chars, drawNoiseBackground, drawGrid, drawChar]);

  const initPracticeCanvas = useCallback(() => {
    const canvas = practiceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(250, 245, 235, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawGrid(ctx, chars.length, false);
    chars.forEach((char, i) => {
      const { x, y } = getGridPosition(i);
      drawChar(ctx, char, x, y, { isOutline: true });
    });
  }, [chars, drawGrid, drawChar]);

  useEffect(() => {
    initPracticeCanvas();
  }, [poem.id, initPracticeCanvas]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
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
  };

  const drawStroke = useCallback(
    throttle((canvas: HTMLCanvasElement, from: { x: number; y: number }, to: { x: number; y: number }) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }, 16),
    []
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = practiceCanvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const point = getCanvasPoint(e, canvas);
    const cellIndex = getIndexFromPosition(point.x, point.y);
    setActiveCellIndex(cellIndex);
    setLastPos(point);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = practiceCanvasRef.current;
    if (!canvas || !lastPos) return;
    
    const point = getCanvasPoint(e, canvas);
    drawStroke(canvas, lastPos, point);
    setLastPos(point);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  const handleCheck = (index: number) => {
    const canvas = practiceCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getGridPosition(index);
    const cellImageData = ctx.getImageData(x, y, GRID_SIZE, GRID_SIZE);
    
    const userPixels: boolean[][] = [];
    let userPixelCount = 0;
    
    for (let py = 0; py < GRID_SIZE; py++) {
      userPixels[py] = [];
      for (let px = 0; px < GRID_SIZE; px++) {
        const idx = (py * GRID_SIZE + px) * 4;
        const alpha = cellImageData.data[idx + 3];
        const r = cellImageData.data[idx];
        const g = cellImageData.data[idx + 1];
        const b = cellImageData.data[idx + 2];
        const isInk = alpha > 50 && r < 100 && g < 60 && b < 50;
        userPixels[py][px] = isInk;
        if (isInk) userPixelCount++;
      }
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = GRID_SIZE;
    tempCanvas.height = GRID_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.font = `${GRID_SIZE - 10}px "KaiTi", "STKaiti", "楷体", serif`;
    tempCtx.fillStyle = '#000';
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillText(chars[index], GRID_SIZE / 2, GRID_SIZE / 2);

    const charImageData = tempCtx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
    let charPixelCount = 0;
    let overlapCount = 0;

    for (let py = 0; py < GRID_SIZE; py++) {
      for (let px = 0; px < GRID_SIZE; px++) {
        const idx = (py * GRID_SIZE + px) * 4;
        const alpha = charImageData.data[idx + 3];
        const isCharPixel = alpha > 50;
        if (isCharPixel) {
          charPixelCount++;
          if (userPixels[py]?.[px]) {
            overlapCount++;
          }
        }
      }
    }

    const precision = charPixelCount > 0 ? overlapCount / charPixelCount : 0;
    const recall = userPixelCount > 0 ? overlapCount / userPixelCount : 0;
    const f1Score = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const score = Math.round(f1Score * 100);

    onScoreUpdate(index, chars[index], score);
  };

  const handleClear = (index: number) => {
    const canvas = practiceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getGridPosition(index);
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, GRID_SIZE, GRID_SIZE);
    ctx.clip();
    
    ctx.fillStyle = 'rgba(250, 245, 235, 0.7)';
    ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
    drawGrid(ctx, chars.length, false);
    chars.forEach((char, i) => {
      const pos = getGridPosition(i);
      drawChar(ctx, char, pos.x, pos.y, { isOutline: true });
    });
    
    ctx.restore();
  };

  const getScoreColor = (score: number) => {
    if (score > 80) return '#27ae60';
    if (score >= 60) return '#f39c12';
    return '#e74c3c';
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ color: '#2c1810', marginBottom: '8px', fontSize: '16px' }}>书写演示</h3>
        <div style={{
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <canvas
            ref={demoCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              display: 'block',
              width: '100%',
              maxWidth: CANVAS_WIDTH,
              height: 'auto'
            }}
          />
        </div>
      </div>

      <div>
        <h3 style={{ color: '#2c1810', marginBottom: '8px', fontSize: '16px' }}>临摹练习区（按住鼠标在格子内书写）</h3>
        <div style={{
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          marginBottom: '12px'
        }}>
          <canvas
            ref={practiceCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              display: 'block',
              width: '100%',
              maxWidth: CANVAS_WIDTH,
              height: 'auto',
              cursor: 'crosshair'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => {
              e.preventDefault();
              const canvas = practiceCanvasRef.current;
              if (!canvas) return;
              setIsDrawing(true);
              const point = getCanvasPoint(e, canvas);
              const cellIndex = getIndexFromPosition(point.x, point.y);
              setActiveCellIndex(cellIndex);
              setLastPos(point);
            }}
            onTouchMove={(e) => {
              if (!isDrawing) return;
              e.preventDefault();
              const canvas = practiceCanvasRef.current;
              if (!canvas || !lastPos) return;
              const point = getCanvasPoint(e, canvas);
              drawStroke(canvas, lastPos, point);
              setLastPos(point);
            }}
            onTouchEnd={handleMouseUp}
          />
          
          {chars.map((char, index) => {
            const { x, y } = getGridPosition(index);
            const score = scores.find(s => s.index === index)?.score;
            const scaleX = 100 / CANVAS_WIDTH;
            const scaleY = 100 / CANVAS_HEIGHT;
            
            return (
              <div key={index} style={{
                position: 'absolute',
                left: `${x * scaleX}%`,
                top: `${y * scaleY}%`,
                width: `${GRID_SIZE * scaleX}%`,
                height: `${GRID_SIZE * scaleY}%`,
                pointerEvents: 'none'
              }}>
                {score !== undefined && (
                  <div
                    style={{
                      position: 'absolute',
                      right: '2px',
                      bottom: '2px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: getScoreColor(score),
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      animation: 'badgePop 0.3s ease-out'
                    }}
                  >
                    {score}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px'
        }}>
          {chars.map((char, index) => {
            const score = scores.find(s => s.index === index)?.score;
            const isActive = activeCellIndex === index;
            return (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                background: isActive ? 'rgba(39, 174, 96, 0.1)' : 'rgba(255,255,255,0.6)',
                borderRadius: '6px',
                border: isActive ? '2px solid #27ae60' : '1px solid #c9bfa8',
                cursor: 'pointer'
              }}
              onClick={() => setActiveCellIndex(index)}
              >
                <span style={{ fontSize: '14px', color: '#2c1810' }}>{char}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCheck(index);
                  }}
                  style={{
                    padding: '4px 10px',
                    background: 'linear-gradient(180deg, #27ae60 0%, #1e8449 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'box-shadow 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                  }}
                >
                  检查
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear(index);
                  }}
                  style={{
                    padding: '4px 10px',
                    background: '#95a5a6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  清除
                </button>
                {score !== undefined && (
                  <span style={{
                    fontSize: '12px',
                    color: getScoreColor(score),
                    fontWeight: 'bold'
                  }}>
                    {score}分
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes badgePop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default PracticePanel;
