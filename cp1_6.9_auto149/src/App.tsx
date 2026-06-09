import React, { useRef, useEffect, useState, useCallback } from 'react';
import { processImage, type PixelData } from './ImageProcessor';
import { ParticleEngine } from './ParticleEngine';
import { ParticleRenderer } from './ParticleRenderer';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const rendererRef = useRef<ParticleRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const fpsFramesRef = useRef<number>(0);
  const fpsTimeRef = useRef<number>(0);

  const [particleCount, setParticleCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasImage, setHasImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (engineRef.current) {
      engineRef.current.setCanvasSize(w, h);
    } else {
      engineRef.current = new ParticleEngine(w, h);
    }

    if (rendererRef.current) {
      rendererRef.current.setSize(w, h);
    } else {
      rendererRef.current = new ParticleRenderer(ctx, w, h);
    }
  }, []);

  const handleImageData = useCallback((pixels: PixelData[]) => {
    if (!engineRef.current) return;

    if (hasImage) {
      engineRef.current.transitionToPixels(pixels);
    } else {
      engineRef.current.initializeFromPixels(pixels, true);
    }
    setHasImage(true);
    setParticleCount(engineRef.current.getParticleCount());
  }, [hasImage]);

  const handleFile = useCallback(async (file: File) => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      const pixels = await processImage(file);
      if (pixels.length === 0) {
        throw new Error('图片有效像素过少，请换一张图片');
      }
      handleImageData(pixels);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '处理图片时出错');
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  }, [handleImageData]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      isDraggingRef.current = false;
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = false;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    engineRef.current.setMousePosition(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const handleMouseLeave = useCallback(() => {
    engineRef.current?.clearMouse();
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      fpsFramesRef.current++;
      if (time - fpsTimeRef.current >= 1000) {
        setFps(fpsFramesRef.current);
        fpsFramesRef.current = 0;
        fpsTimeRef.current = time;
      }

      if (engineRef.current && rendererRef.current) {
        engineRef.current.update(delta);
        rendererRef.current.render(engineRef.current.state);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#0a0a2e'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block'
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 50,
          width: 80,
          height: 80,
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.3s ease-out, transform 0.3s ease-out',
          backgroundColor: isDraggingRef.current
            ? 'rgba(255,255,255,0.3)'
            : 'rgba(255,255,255,0.1)',
          transform: isLoading ? 'scale(1.0)' : undefined,
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          zIndex: 10,
          overflow: 'hidden'
        }}
        className="upload-btn"
        onClick={handleUploadClick}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isDraggingRef.current
            ? 'rgba(255,255,255,0.3)'
            : 'rgba(255,255,255,0.1)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isLoading ? (
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            style={{ animation: 'spin 0.8s linear infinite' }}
          >
            <circle
              cx="20"
              cy="20"
              r="15"
              fill="none"
              stroke="rgba(0, 212, 255, 0.2)"
              strokeWidth="3"
            />
            <circle
              cx="20"
              cy="20"
              r="15"
              fill="none"
              stroke="#00d4ff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="60 40"
              transform="rotate(-90 20 20)"
            />
          </svg>
        ) : (
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {errorMsg && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            backgroundColor: 'rgba(255, 80, 80, 0.9)',
            color: 'white',
            borderRadius: 8,
            fontSize: 14,
            zIndex: 20,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}
        >
          {errorMsg}
        </div>
      )}

      {!hasImage && !isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.5)',
            pointerEvents: 'none',
            zIndex: 5
          }}
        >
          <div style={{ fontSize: 20, marginBottom: 8, letterSpacing: 4 }}>
            流 影 相 册
          </div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            点击左下角按钮或拖拽图片到此 · 开始你的风景记忆
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '8px 20px',
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          color: 'white',
          opacity: 0.5,
          fontSize: 12,
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        <span>粒子总数: {particleCount}</span>
        <span>FPS: {fps}</span>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
