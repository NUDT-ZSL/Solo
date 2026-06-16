import { useRef, useEffect } from 'react';
import type { KspacePoint, ImageData } from '../types';

interface KspaceCanvasProps {
  width: number;
  height: number;
  points: KspacePoint[];
  imageData: ImageData | null;
}

function lerpColor2(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function KspaceCanvas({ width, height, points, imageData }: KspaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(15, 52, 96, 0.5)';
      ctx.lineWidth = 0.5;

      const gridSize = 8;
      for (let i = 0; i <= gridSize; i++) {
        const x = (i / gridSize) * width;
        const y = (i / gridSize) * height;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (imageData) {
        const imgWidth = imageData.width;
        const imgHeight = imageData.height;
        const scale = Math.min(width / imgWidth, height / imgHeight);
        const drawWidth = imgWidth * scale;
        const drawHeight = imgHeight * scale;
        const offsetX = (width - drawWidth) / 2;
        const offsetY = (height - drawHeight) / 2;

        const imgData = ctx.createImageData(imgWidth, imgHeight);
        for (let i = 0; i < imgWidth * imgHeight; i++) {
          const val = imageData.pixels[i];
          imgData.data[i * 4] = val;
          imgData.data[i * 4 + 1] = val;
          imgData.data[i * 4 + 2] = val;
          imgData.data[i * 4 + 3] = 255;
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imgWidth;
        tempCanvas.height = imgHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.putImageData(imgData, 0, 0);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tempCanvas, offsetX, offsetY, drawWidth, drawHeight);
        }
      }

      if (points.length > 0 && !imageData) {
        const centerX = width / 2;
        const centerY = height / 2;
        const scaleX = width * 0.4;
        const scaleY = height * 0.4;

        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const px = centerX + p.x * scaleX;
          const py = centerY + p.y * scaleY;

          const t = (p.y + 1) / 2;
          const color = lerpColor2('#3498db', '#e74c3c', t);

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }

        if (points.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(52, 152, 219, 0.4)';
          ctx.lineWidth = 1;
          const firstP = points[0];
          ctx.moveTo(
            centerX + firstP.x * scaleX,
            centerY + firstP.y * scaleY
          );
          for (let i = 1; i < points.length; i++) {
            const p = points[i];
            ctx.lineTo(
              centerX + p.x * scaleX,
              centerY + p.y * scaleY
            );
          }
          ctx.stroke();
        }
      }

      if (points.length === 0 && !imageData) {
        ctx.fillStyle = '#4a5568';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('等待采集...', width / 2, height / 2);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, points, imageData]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: 'block',
        borderRadius: '4px',
        border: '1px solid #0f3460',
        maxWidth: '100%',
        maxHeight: '100%',
      }}
    />
  );
}

export default KspaceCanvas;
