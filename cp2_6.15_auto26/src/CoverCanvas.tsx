import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { calculateErasePercentage, throttle } from './utils';

export interface CoverCanvasHandle {
  clearAll: () => void;
  reset: () => void;
  getCanvases: () => { bg: HTMLCanvasElement | null; cover: HTMLCanvasElement | null };
}

interface CoverCanvasProps {
  imageSrc: string;
  brushRadius: number;
  onProgressChange: (percent: number) => void;
}

const CoverCanvas = forwardRef<CoverCanvasHandle, CoverCanvasProps>(
  ({ imageSrc, brushRadius, onProgressChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement>(null);
    const coverCanvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);
    const imageLoadedRef = useRef(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const CANVAS_SIZE = 600;
    const MAX_IMG_SIZE = 550;

    const drawCover = useCallback(() => {
      const canvas = coverCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#888888';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const drawImage = useCallback(() => {
      const bgCanvas = bgCanvasRef.current;
      const coverCanvas = coverCanvasRef.current;
      if (!bgCanvas || !coverCanvas) return;

      const bgCtx = bgCanvas.getContext('2d');
      if (!bgCtx) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let { width, height } = img;
        const ratio = width / height;

        if (width > MAX_IMG_SIZE || height > MAX_IMG_SIZE) {
          if (ratio > 1) {
            width = MAX_IMG_SIZE;
            height = MAX_IMG_SIZE / ratio;
          } else {
            height = MAX_IMG_SIZE;
            width = MAX_IMG_SIZE * ratio;
          }
        }

        const offsetX = (CANVAS_SIZE - width) / 2;
        const offsetY = (CANVAS_SIZE - height) / 2;

        bgCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        bgCtx.drawImage(img, offsetX, offsetY, width, height);

        drawCover();
        imageLoadedRef.current = true;
        setImageLoaded(true);
        onProgressChange(0);
      };
      img.src = imageSrc;
    }, [imageSrc, drawCover, onProgressChange]);

    useEffect(() => {
      if (imageSrc) {
        drawImage();
      }
    }, [imageSrc, drawImage]);

    const getPosition = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
      const canvas = coverCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX: number, clientY: number;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return { x: 0, y: 0 };
      }

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    }, []);

    const erase = useCallback((x: number, y: number) => {
      const canvas = coverCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, brushRadius);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
      ctx.fill();
    }, [brushRadius]);

    const eraseLine = useCallback((fromX: number, fromY: number, toX: number, toY: number) => {
      const dist = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
      const steps = Math.max(1, Math.ceil(dist / (brushRadius * 0.4)));

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = fromX + (toX - fromX) * t;
        const y = fromY + (toY - fromY) * t;
        erase(x, y);
      }
    }, [brushRadius, erase]);

    const updateProgress = useCallback(() => {
      const canvas = coverCanvasRef.current;
      if (!canvas || !imageLoadedRef.current) return;
      const percent = calculateErasePercentage(canvas, 150);
      onProgressChange(percent);
    }, [onProgressChange]);

    const throttledUpdateProgress = useCallback(
      throttle(updateProgress, 100),
      [updateProgress]
    );

    const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      if (!imageLoadedRef.current) return;
      e.preventDefault();
      isDrawingRef.current = true;
      const pos = getPosition(e);
      lastPosRef.current = pos;
      erase(pos.x, pos.y);
      throttledUpdateProgress();
    }, [getPosition, erase, throttledUpdateProgress]);

    const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawingRef.current || !imageLoadedRef.current) return;
      e.preventDefault();
      const pos = getPosition(e);
      if (lastPosRef.current) {
        eraseLine(lastPosRef.current.x, lastPosRef.current.y, pos.x, pos.y);
      }
      lastPosRef.current = pos;
      throttledUpdateProgress();
    }, [getPosition, eraseLine, throttledUpdateProgress]);

    const handleEnd = useCallback(() => {
      isDrawingRef.current = false;
      lastPosRef.current = null;
      updateProgress();
    }, [updateProgress]);

    useEffect(() => {
      const handleWindowEnd = () => {
        isDrawingRef.current = false;
        lastPosRef.current = null;
      };
      window.addEventListener('mouseup', handleWindowEnd);
      window.addEventListener('touchend', handleWindowEnd);
      window.addEventListener('touchcancel', handleWindowEnd);
      return () => {
        window.removeEventListener('mouseup', handleWindowEnd);
        window.removeEventListener('touchend', handleWindowEnd);
        window.removeEventListener('touchcancel', handleWindowEnd);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      clearAll: () => {
        const canvas = coverCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        onProgressChange(1);
      },
      reset: () => {
        drawCover();
        onProgressChange(0);
      },
      getCanvases: () => ({
        bg: bgCanvasRef.current,
        cover: coverCanvasRef.current,
      }),
    }));

    return (
      <div className="scratch-canvas-container" ref={containerRef}>
        <canvas
          ref={bgCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="scratch-canvas scratch-canvas--bg"
        />
        <canvas
          ref={coverCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="scratch-canvas scratch-canvas--cover"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
        {!imageLoaded && (
          <div className="scratch-loading">加载中...</div>
        )}
      </div>
    );
  }
);

CoverCanvas.displayName = 'CoverCanvas';

export default CoverCanvas;
