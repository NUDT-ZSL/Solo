import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AppliedFilter } from '../utils/filterEngine';

interface PreviewAreaProps {
  imageData: ImageData | null;
  appliedFilters: AppliedFilter[];
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ imageData, appliedFilters }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !imageData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    setIsVisible(false);
    
    requestAnimationFrame(() => {
      ctx.putImageData(imageData, 0, 0);
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });

    return () => {
      setIsVisible(false);
    };
  }, [imageData]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (appliedFilters.length > 0 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + 15;
      const y = e.clientY - rect.top + 15;
      
      const maxX = rect.width - 150;
      const maxY = rect.height - 40;
      
      setTooltipPos({
        x: Math.min(x, maxX),
        y: Math.min(y, maxY)
      });
    }
  }, [appliedFilters]);

  const handleMouseEnter = useCallback(() => {
    if (appliedFilters.length > 0) {
      setShowTooltip(true);
    }
  }, [appliedFilters]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const getTooltipText = useCallback(() => {
    if (appliedFilters.length === 0) return '';
    return appliedFilters
      .map(f => `${f.name}: ${f.value}${f.unit}`)
      .join(' | ');
  }, [appliedFilters]);

  return (
    <div className="preview-section">
      <h3 className="section-title">效果预览</h3>
      <div
        ref={containerRef}
        className="preview-area"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {imageData ? (
          <canvas
            ref={canvasRef}
            className={`preview-canvas ${isVisible ? 'visible' : ''}`}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              opacity: isVisible ? 1 : 0,
              transition: 'opacity 0.3s ease'
            }}
          />
        ) : (
          <div className="preview-placeholder">上传图片后在此预览效果</div>
        )}
        {showTooltip && appliedFilters.length > 0 && (
          <div
            className="filter-tooltip"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              backgroundColor: '#000000aa',
              color: '#ffffff',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              position: 'absolute',
              pointerEvents: 'none',
              zIndex: 9999,
              whiteSpace: 'nowrap'
            }}
          >
            {getTooltipText()}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewArea;
