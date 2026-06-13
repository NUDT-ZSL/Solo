import React, { useEffect, useRef, useState } from 'react';
import type { GradientConfig, OverlayConfig } from '../utils/gradientUtils';
import { generateFullCSS, generateGradientCSS } from '../utils/gradientUtils';

interface PreviewPanelProps {
  gradientConfig: GradientConfig;
  overlayConfig: OverlayConfig;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ gradientConfig, overlayConfig }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [cssSnippet, setCssSnippet] = useState('');
  const animationFrameRef = useRef<number | null>(null);

  const drawCheckerboard = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const size = 30;
    for (let x = 0; x < width; x += size) {
      for (let y = 0; y < height; y += size) {
        const isEven = ((x / size) + (y / size)) % 2 === 0;
        ctx.fillStyle = isEven ? '#ffffff' : '#cccccc';
        ctx.fillRect(x, y, size, size);
      }
    }
  };

  const createGradient = (ctx: CanvasRenderingContext2D, config: GradientConfig, width: number, height: number) => {
    const sortedColors = [...config.colors].sort((a, b) => a.position - b.position);
    
    let gradient: CanvasGradient;
    
    switch (config.type) {
      case 'linear': {
        const angleRad = (config.angle - 90) * Math.PI / 180;
        const centerX = width / 2;
        const centerY = height / 2;
        const length = Math.sqrt(width * width + height * height) / 2;
        const x1 = centerX - Math.cos(angleRad) * length;
        const y1 = centerY - Math.sin(angleRad) * length;
        const x2 = centerX + Math.cos(angleRad) * length;
        const y2 = centerY + Math.sin(angleRad) * length;
        gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        break;
      }
      case 'radial': {
        const centerX = (config.centerX / 100) * width;
        const centerY = (config.centerY / 100) * height;
        const radius = Math.max(width, height);
        gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        break;
      }
      case 'conic': {
        const centerX = (config.centerX / 100) * width;
        const centerY = (config.centerY / 100) * height;
        gradient = ctx.createConicGradient(config.angle * Math.PI / 180, centerX, centerY);
        break;
      }
      default:
        gradient = ctx.createLinearGradient(0, 0, width, height);
    }

    sortedColors.forEach(stop => {
      gradient.addColorStop(stop.position / 100, stop.color);
    });

    return gradient;
  };

  const render = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(rect.width * dpr);
    const height = Math.floor(rect.height * dpr);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cssWidth = rect.width;
    const cssHeight = rect.height;

    drawCheckerboard(ctx, cssWidth, cssHeight);

    ctx.fillStyle = createGradient(ctx, gradientConfig, cssWidth, cssHeight);
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    if (overlayConfig.enabled) {
      ctx.save();
      ctx.globalAlpha = overlayConfig.opacity / 100;
      ctx.globalCompositeOperation = overlayConfig.blendMode as GlobalCompositeOperation;
      ctx.fillStyle = createGradient(ctx, overlayConfig.gradient, cssWidth, cssHeight);
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      ctx.restore();
    }

    const fullCSS = generateFullCSS(gradientConfig, overlayConfig);
    setCssSnippet(fullCSS);
  };

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gradientConfig, overlayConfig]);

  useEffect(() => {
    const handleResize = () => render();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cssSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 300);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const overlayCSS = overlayConfig.enabled ? generateGradientCSS(overlayConfig.gradient) : '';
  const currentInfo = overlayConfig.enabled
    ? `渐变1: ${generateGradientCSS(gradientConfig).substring(0, 60)}...\n叠加层(${overlayConfig.blendMode}, ${overlayConfig.opacity}%): ${overlayCSS.substring(0, 60)}...`
    : `渐变: ${generateGradientCSS(gradientConfig).substring(0, 80)}...`;

  return (
    <div ref={containerRef} className="preview-panel">
      <canvas
        ref={canvasRef}
        className="preview-canvas"
      />

      <div className="preview-info">
        {currentInfo}
      </div>

      <div className="css-export-panel">
        <pre className="css-code">{cssSnippet}</pre>
        <div className="copy-button-container">
          <button
            className="copy-button"
            onClick={handleCopy}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <span className={`copied-tooltip ${copied ? 'visible' : ''}`}>
            已复制
          </span>
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
