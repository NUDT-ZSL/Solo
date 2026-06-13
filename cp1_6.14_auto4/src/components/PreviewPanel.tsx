import { useEffect, useRef, useCallback } from 'react';
import type { Viewport, DiffRegion } from '../types';
import { Smartphone, Tablet, Laptop, Monitor } from 'lucide-react';

interface PreviewPanelProps {
  viewport: Viewport;
  registerRef?: (name: string, el: HTMLDivElement | null) => void;
  overrideScreenshot?: string;
  diffRegions?: DiffRegion[];
  diffImage?: string;
  crosshair?: { nx: number; ny: number } | null;
  onMouseMove?: (name: string, nx: number, ny: number) => void;
  onMouseLeave?: () => void;
}

const iconMap = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  monitor: Monitor,
};

export default function PreviewPanel({
  viewport,
  registerRef,
  overrideScreenshot,
  diffRegions = [],
  diffImage,
  crosshair,
  onMouseMove,
  onMouseLeave,
}: PreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const Icon = iconMap[viewport.icon];

  useEffect(() => {
    if (registerRef) {
      registerRef(viewport.name, containerRef.current);
    }
    return () => {
      if (registerRef) {
        registerRef(viewport.name, null);
      }
    };
  }, [registerRef, viewport.name]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onMouseMove || !bodyRef.current) return;
      const rect = bodyRef.current.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      onMouseMove(viewport.name, Math.max(0, Math.min(1, nx)), Math.max(0, Math.min(1, ny)));
    },
    [onMouseMove, viewport.name]
  );

  const handleMouseLeave = useCallback(() => {
    if (onMouseLeave) {
      onMouseLeave();
    }
  }, [onMouseLeave]);

  const crossH = crosshair ? crosshair.ny * 100 : -1;
  const crossV = crosshair ? crosshair.nx * 100 : -1;

  return (
    <div className="preview-panel fade-in" ref={containerRef} data-viewport={viewport.name}>
      <div className="preview-panel-header">
        <Icon size={18} />
        <span className="preview-panel-name">{viewport.name}</span>
        <span className="preview-panel-size">
          {viewport.width} × {viewport.height}
        </span>
      </div>
      <div
        className="preview-panel-body"
        ref={bodyRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {overrideScreenshot ? (
          <img
            src={overrideScreenshot}
            alt={`${viewport.name} preview`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
              display: 'block',
            }}
          />
        ) : (
          <iframe
            className="preview-iframe"
            src={''}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            title={`${viewport.name} preview`}
            style={{
              width: viewport.width,
              height: viewport.height,
            }}
          />
        )}

        {diffImage && (
          <img
            src={diffImage}
            alt="diff overlay"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              mixBlendMode: 'multiply',
              objectFit: 'cover',
              objectPosition: 'top center',
            }}
          />
        )}

        {diffRegions.length > 0 && !diffImage && (
          <div className="diff-mask-overlay">
            {diffRegions.map((region, i) => (
              <div
                key={i}
                className="diff-region"
                style={{
                  left: `${region.x}px`,
                  top: `${region.y}px`,
                  width: `${region.width}px`,
                  height: `${region.height}px`,
                }}
              />
            ))}
          </div>
        )}

        {crosshair && (
          <div className="crosshair-overlay">
            <div className="crosshair-h" style={{ top: `${crossH}%` }} />
            <div className="crosshair-v" style={{ left: `${crossV}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
