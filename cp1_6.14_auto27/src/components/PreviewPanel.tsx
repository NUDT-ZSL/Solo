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
        const radiusX = config.shape === 'ellipse' ? Math.max(width, height) : Math.max(width, height);
        const radiusY = config.shape === 'ellipse' ? Math.max(width, height) * 0.7 : Math.max(width, height);
        const radius = Math.max(radiusX, radiusY);
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
      ctx.globalCompositeOperation = overlayConfig.blendMode;
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
    <div
      ref={containerRef}
      style={{
        width: '60%',
        backgroundColor: '#1e1e2e',
        position: 'relative',
        minHeight: '500px',
        overflow: 'hidden',
        '@media (max-width: 768px)': {
          width: '100%',
          height: '50vh',
        }
      } as React.CSSProperties}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          backgroundColor: '#2d2d3d',
          borderRadius: '6px',
          padding: '12px',
          fontSize: '12px',
          fontFamily: "'JetBrains Mono', monospace",
          color: '#e0e0e0',
          maxWidth: '320px',
          maxHeight: '120px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          zIndex: 10,
        }}
      >
        {currentInfo}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          width: '280px',
          height: '160px',
          backgroundColor: '#252535',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <pre
          style={{
            margin: 0,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            color: '#ffffff',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            overflow: 'auto',
            flex: 1,
          }}
        >
          {cssSnippet}
        </pre>
        <div style={{ position: 'relative', alignSelf: 'flex-end' }}>
          <button
            onClick={handleCopy}
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#6c63ff',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#7c73ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6c63ff';
            }}
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
              style={{ color: '#ffffff' }}
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <span
            style={{
              position: 'absolute',
              top: '-28px',
              right: '0',
              fontSize: '12px',
              color: '#22c55e',
              opacity: copied ? 1 : 0,
              transition: 'opacity 0.3s ease-out',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            已复制
          </span>
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
