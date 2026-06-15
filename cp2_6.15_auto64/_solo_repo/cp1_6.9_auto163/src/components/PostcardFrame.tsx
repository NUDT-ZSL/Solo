import React, { useRef, useEffect, useCallback } from 'react';
import EffectLayer, { EffectLayerRef } from './EffectLayer';
import type { WeatherType, FrameStyle, RGB } from '../types';

interface PostcardFrameProps {
  imageData: string;
  imageSize: { width: number; height: number };
  weather: WeatherType;
  timeOfDay: number;
  frameStyle: FrameStyle;
  text: string;
  dominantColor: RGB;
  timeColor: { rgb: RGB; alpha: number; brightness: number };
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

const PostcardFrame: React.FC<PostcardFrameProps> = ({
  imageData,
  imageSize,
  weather,
  timeOfDay,
  frameStyle,
  text,
  dominantColor,
  timeColor,
  onCanvasReady,
}) => {
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const effectRef = useRef<EffectLayerRef>(null);
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  const borderWidth = Math.round(imageSize.width * 0.08);
  const textAreaHeight = text ? Math.round(imageSize.height * 0.18) : 0;
  const totalWidth = imageSize.width + borderWidth * 2;
  const totalHeight = imageSize.height + borderWidth * 2 + textAreaHeight;

  const drawSimpleBorder = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    bw: number
  ) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(bw / 2, bw / 2, w - bw, h - bw);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bw, bw, w - bw * 2, h - bw * 2);
  };

  const drawFilmBorder = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    bw: number
  ) => {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    const holeW = bw * 0.35;
    const holeH = bw * 0.5;
    const holeGap = bw * 0.9;
    const holeYTop = (bw - holeH) / 2;
    const holeYBottom = h - bw + (bw - holeH) / 2;

    for (let x = bw * 0.4; x < w - bw * 0.4; x += holeGap) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(x, holeYTop, holeW, holeH, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(x, holeYBottom, holeW, holeH, 3);
      ctx.fill();
    }
  };

  const drawDashedBorder = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    bw: number
  ) => {
    ctx.fillStyle = '#FDF8F0';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);

    const inner = bw - 5;
    ctx.strokeRect(inner, inner, w - inner * 2, h - inner * 2);
    ctx.strokeRect(inner + 5, inner + 5, w - (inner + 5) * 2, h - (inner + 5) * 2);

    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(139, 115, 85, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = bw / 2 + Math.random() * (bw / 2);
      ctx.beginPath();
      ctx.moveTo(bw, y);
      ctx.lineTo(w - bw, y + (Math.random() - 0.5) * 3);
      ctx.stroke();

      const y2 = h - bw / 2 - Math.random() * (bw / 2);
      ctx.beginPath();
      ctx.moveTo(bw, y2);
      ctx.lineTo(w - bw, y2 + (Math.random() - 0.5) * 3);
      ctx.stroke();
    }
  };

  const drawGoldBorder = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    bw: number
  ) => {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#D4AF37');
    gradient.addColorStop(0.25, '#FFD700');
    gradient.addColorStop(0.5, '#F4C430');
    gradient.addColorStop(0.75, '#FFD700');
    gradient.addColorStop(1, '#D4AF37');

    ctx.fillStyle = '#2a1810';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = gradient;
    ctx.fillRect(bw / 4, bw / 4, w - bw / 2, h - bw / 2);

    ctx.fillStyle = '#1a0f08';
    ctx.fillRect(bw * 0.7, bw * 0.7, w - bw * 1.4, h - bw * 1.4);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;

    const patternSize = bw * 0.35;
    const half = patternSize / 2;

    for (let x = bw; x < w - bw; x += patternSize * 1.5) {
      drawGoldFloral(ctx, x, bw * 0.4, half);
      drawGoldFloral(ctx, x, h - bw * 0.4, half);
    }
    for (let y = bw * 2; y < h - bw * 2; y += patternSize * 1.5) {
      drawGoldFloral(ctx, bw * 0.4, y, half);
      drawGoldFloral(ctx, w - bw * 0.4, y, half);
    }

    const cornerSize = bw * 0.7;
    drawGoldCorner(ctx, bw * 0.5, bw * 0.5, cornerSize, 'tl');
    drawGoldCorner(ctx, w - bw * 0.5, bw * 0.5, cornerSize, 'tr');
    drawGoldCorner(ctx, bw * 0.5, h - bw * 0.5, cornerSize, 'bl');
    drawGoldCorner(ctx, w - bw * 0.5, h - bw * 0.5, cornerSize, 'br');
  };

  const drawGoldFloral = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px = x + Math.cos(angle) * r * 0.6;
      const py = y + Math.sin(angle) * r * 0.6;
      ctx.moveTo(x, y);
      ctx.arc(px, py, r * 0.3, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.fill();
  };

  const drawGoldCorner = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    pos: string
  ) => {
    ctx.save();
    ctx.translate(x, y);

    if (pos === 'tr' || pos === 'br') {
      ctx.scale(-1, 1);
    }
    if (pos === 'bl' || pos === 'br') {
      ctx.scale(1, -1);
    }

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.lineTo(size, size * 0.4);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(size * 0.4, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(size * 0.25, size * 0.25, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawStampBorder = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    bw: number
  ) => {
    ctx.fillStyle = '#F0EBE0';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#1A1A2E';
    const holeR = bw * 0.2;
    const gap = bw * 0.55;

    for (let x = gap / 2; x < w; x += gap) {
      ctx.beginPath();
      ctx.arc(x, holeR + 2, holeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, h - holeR - 2, holeR, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let y = gap / 2; y < h; y += gap) {
      ctx.beginPath();
      ctx.arc(holeR + 2, y, holeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w - holeR - 2, y, holeR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(139, 115, 85, 0.4)';
    ctx.lineWidth = 1;
    const inset = bw - holeR * 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.strokeRect(inset + i * 3, inset + i * 3, w - (inset + i * 3) * 2, h - (inset + i * 3) * 2);
    }
  };

  const drawFrame = useCallback(() => {
    const canvas = frameCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = totalWidth;
    const H = totalHeight;

    ctx.clearRect(0, 0, W, H);

    switch (frameStyle) {
      case 'simple':
        drawSimpleBorder(ctx, W, H, borderWidth);
        break;
      case 'film':
        drawFilmBorder(ctx, W, H, borderWidth);
        break;
      case 'dashed':
        drawDashedBorder(ctx, W, H, borderWidth);
        break;
      case 'gold':
        drawGoldBorder(ctx, W, H, borderWidth);
        break;
      case 'stamp':
        drawStampBorder(ctx, W, H, borderWidth);
        break;
    }
  }, [frameStyle, borderWidth, totalWidth, totalHeight]);

  const drawText = useCallback(() => {
    const canvas = textCanvasRef.current;
    if (!canvas || !text) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = totalWidth;
    const H = textAreaHeight;

    ctx.clearRect(0, 0, W, H);

    const bgStyle = frameStyle === 'film'
      ? '#1a1a1a'
      : frameStyle === 'gold'
      ? '#2a1810'
      : frameStyle === 'stamp'
      ? '#F0EBE0'
      : frameStyle === 'dashed'
      ? '#FDF8F0'
      : '#F8F8F8';
    ctx.fillStyle = bgStyle;
    ctx.fillRect(0, 0, W, H);

    const nightness = Math.abs(timeOfDay - 12) / 12;
    const baseR = Math.round(dominantColor.r * (1 - nightness * 0.3) + 30 * nightness);
    const baseG = Math.round(dominantColor.g * (1 - nightness * 0.5));
    const baseB = Math.round(dominantColor.b * (1 - nightness * 0.7));

    const isBgDark = frameStyle === 'film' || frameStyle === 'gold';
    const textColor = isBgDark
      ? `rgb(${Math.min(255, baseR + 100)}, ${Math.min(255, baseG + 100)}, ${Math.min(255, baseB + 120)})`
      : `rgb(${Math.max(30, baseR - 30)}, ${Math.max(30, baseG - 40)}, ${Math.max(50, baseB - 30)})`;

    const fontSize = Math.max(18, Math.round(borderWidth * 0.85));
    ctx.font = `400 ${fontSize}px 'Caveat', cursive`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxWidth = W - borderWidth * 2.5;
    const words: string[] = [];
    let currentLine = '';

    for (const char of text) {
      const testLine = currentLine + char;
      if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
        words.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) words.push(currentLine);

    const lineHeight = fontSize * 1.2;
    const totalTextH = words.length * lineHeight;
    const startY = (H - totalTextH) / 2 + lineHeight / 2;

    words.forEach((line, i) => {
      ctx.fillText(line, W / 2, startY + i * lineHeight);
    });

    if (frameStyle === 'simple' || frameStyle === 'dashed' || frameStyle === 'stamp') {
      ctx.strokeStyle = `rgba(${baseR}, ${baseG}, ${baseB}, 0.15)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(borderWidth, 2);
      ctx.lineTo(W - borderWidth, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(borderWidth, H - 2);
      ctx.lineTo(W - borderWidth, H - 2);
      ctx.stroke();
    }
  }, [text, frameStyle, timeOfDay, dominantColor, borderWidth, totalWidth, textAreaHeight]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  useEffect(() => {
    drawText();
  }, [drawText]);

  useEffect(() => {
    const compose = () => {
      const outCanvas = document.createElement('canvas');
      outCanvas.width = totalWidth;
      outCanvas.height = totalHeight;
      const octx = outCanvas.getContext('2d');

      const frameCanvas = frameCanvasRef.current;
      const effectCanvas = effectRef.current?.getCanvas();
      const textCanvas = textCanvasRef.current;

      if (octx && frameCanvas) {
        octx.drawImage(frameCanvas, 0, 0);
      }
      if (octx && effectCanvas) {
        octx.drawImage(effectCanvas, borderWidth, borderWidth);
      }
      if (octx && textCanvas && text) {
        octx.drawImage(textCanvas, 0, borderWidth * 2 + imageSize.height);
      }

      onCanvasReady?.(outCanvas);
      animFrameRef.current = requestAnimationFrame(compose);
    };

    const timer = setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(compose);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [totalWidth, totalHeight, borderWidth, imageSize.height, text, onCanvasReady]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: `${totalWidth}px`,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: `${totalWidth}px`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 4px 16px rgba(255, 215, 0, 0.08)',
          borderRadius: frameStyle === 'film' ? '2px' : '4px',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={frameCanvasRef}
          width={totalWidth}
          height={totalHeight}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 'auto',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            padding: `${borderWidth}px ${borderWidth}px ${text ? 0 : borderWidth}px ${borderWidth}px`,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <EffectLayer
            ref={effectRef}
            imageData={imageData}
            width={imageSize.width}
            height={imageSize.height}
            weather={weather}
            timeOfDay={timeOfDay}
            timeColor={timeColor}
            dominantColor={dominantColor}
          />
        </div>

        {text && (
          <canvas
            ref={textCanvasRef}
            width={totalWidth}
            height={textAreaHeight}
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              position: 'relative',
              zIndex: 2,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PostcardFrame;
