import { useCallback, useRef } from 'react';
import type { ThemeData, PoemData } from '@/types';
import { randomColorInRange, rgba } from '@/utils/colorUtils';

const CARD_WIDTH = 800;
const CARD_HEIGHT = 1200;
const PARTICLES_PER_CHAR = 8;

export function useCardRenderer() {
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const renderCardToCanvas = useCallback((
    targetCanvas: HTMLCanvasElement,
    poem: PoemData,
    theme: ThemeData
  ): void => {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    targetCanvas.width = CARD_WIDTH * dpr;
    targetCanvas.height = CARD_HEIGHT * dpr;
    targetCanvas.style.width = `${CARD_WIDTH}px`;
    targetCanvas.style.height = `${CARD_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    const gradient = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
    gradient.addColorStop(0, theme.gradientStart);
    gradient.addColorStop(1, theme.gradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    const centerX = CARD_WIDTH / 2;
    const centerY = CARD_HEIGHT / 2;
    const maxRadius = Math.max(CARD_WIDTH, CARD_HEIGHT) * 0.5;

    for (let i = 0; i < 6; i++) {
      const radius = maxRadius * ((i + 1) / 7);
      const ringGradient = ctx.createRadialGradient(
        centerX, centerY, radius * 0.85,
        centerX, centerY, radius * 1.1
      );
      const t = i / 6;
      ringGradient.addColorStop(0, 'transparent');
      ringGradient.addColorStop(0.5, rgba(theme.accentColor, 0.12 * (1 - t * 0.5)));
      ringGradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = ringGradient;
      ctx.fill();
    }

    const paddingX = CARD_WIDTH * 0.1;
    const paddingTop = CARD_HEIGHT * 0.18;
    const lineCount = poem.lines.length;
    const lineHeight = (CARD_HEIGHT * 0.55) / Math.max(lineCount, 4);
    const fontSize = Math.min(40, lineHeight * 0.58);

    ctx.save();
    ctx.font = `600 ${48}px "Noto Serif SC", serif`;
    ctx.fillStyle = theme.accentColor;
    ctx.textAlign = 'center';
    ctx.shadowColor = rgba(theme.accentColor, 0.5);
    ctx.shadowBlur = 20;
    ctx.fillText(poem.title, centerX, CARD_HEIGHT * 0.11);
    ctx.restore();

    ctx.save();
    ctx.font = `400 24px "Noto Serif SC", serif`;
    ctx.fillStyle = rgba(theme.accentColor, 0.85);
    ctx.textAlign = 'center';
    ctx.fillText(`—— ${poem.author}`, centerX, CARD_HEIGHT * 0.16);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = rgba(theme.accentColor, 0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(paddingX, CARD_HEIGHT * 0.185);
    ctx.lineTo(CARD_WIDTH - paddingX, CARD_HEIGHT * 0.185);
    ctx.stroke();
    ctx.restore();

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.font = `${fontSize}px "Noto Serif SC", serif`;

    poem.lines.forEach((line, lineIndex) => {
      const charCount = line.length;
      const textWidth = tempCtx.measureText(line).width;
      const startX = (CARD_WIDTH - textWidth) / 2;
      const baseY = paddingTop + lineIndex * lineHeight + fontSize / 2;

      for (let charIndex = 0; charIndex < charCount; charIndex++) {
        const charMetrics = tempCtx.measureText(line.substring(0, charIndex + 1));
        const prevMetrics = tempCtx.measureText(line.substring(0, charIndex));
        const charCenterX = startX + (prevMetrics.width + charMetrics.width) / 2;

        for (let p = 0; p < PARTICLES_PER_CHAR; p++) {
          const baseColor = Math.random() > 0.5 ? theme.accentColor : theme.gradientEnd;
          const color = randomColorInRange(baseColor, 15);
          const size = 2.5 + Math.random() * 3;
          const offsetX = (Math.random() - 0.5) * 7;
          const offsetY = (Math.random() - 0.5) * 5;

          ctx.save();
          ctx.beginPath();
          ctx.arc(charCenterX + offsetX, baseY + offsetY, size, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.85 + Math.random() * 0.15;
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.restore();
        }
      }
    });

    ctx.save();
    ctx.font = `14px "Noto Sans SC", sans-serif`;
    ctx.fillStyle = rgba(theme.accentColor, 0.55);
    ctx.textAlign = 'left';
    ctx.fillText(`主题 · ${theme.name}`, CARD_WIDTH * 0.08, CARD_HEIGHT * 0.94);
    ctx.restore();

    ctx.save();
    ctx.font = `14px "Noto Sans SC", sans-serif`;
    ctx.fillStyle = rgba(theme.accentColor, 0.55);
    ctx.textAlign = 'right';
    ctx.fillText(`读诗·流光书签`, CARD_WIDTH * 0.92, CARD_HEIGHT * 0.94);
    ctx.restore();
  }, []);

  const generateThumbnail = useCallback((
    poem: PoemData,
    theme: ThemeData
  ): string => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    const canvas = offscreenCanvasRef.current;
    const thumbnailWidth = 400;
    const thumbnailHeight = 600;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CARD_WIDTH;
    tempCanvas.height = CARD_HEIGHT;
    renderCardToCanvas(tempCanvas, poem, theme);

    const ctx = canvas.getContext('2d')!;
    canvas.width = thumbnailWidth;
    canvas.height = thumbnailHeight;
    ctx.drawImage(tempCanvas, 0, 0, CARD_WIDTH, CARD_HEIGHT, 0, 0, thumbnailWidth, thumbnailHeight);

    return canvas.toDataURL('image/jpeg', 0.85);
  }, [renderCardToCanvas]);

  return {
    renderCardToCanvas,
    generateThumbnail,
    CARD_WIDTH,
    CARD_HEIGHT,
  };
}
