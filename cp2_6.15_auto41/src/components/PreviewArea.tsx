import React, { useRef, useEffect, useState } from 'react';
import { AppliedFilter } from '../utils/filterEngine';

interface PreviewAreaProps {
  imageData: ImageData | null;
  appliedFilters: AppliedFilter[];
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ imageData, appliedFilters }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !imageData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    requestAnimationFrame(() => {
      ctx.putImageData(imageData, 0, 0);
      setIsVisible(true);
    });

    return () => {
      setIsVisible(false);
    };
  }, [imageData]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (appliedFilters.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top + 15
      });
    }
  };

  const handleMouseEnter = () => {
    if (appliedFilters.length > 0) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const getTooltipText = () => {
    if (appliedFilters.length === 0) return '';
    return appliedFilters
      .map(f => `${f.name}: ${f.value}${f.unit}`)
      .join(' | ');
  };

  return (
    <div className="preview-section">
      <h3 className="section-title">效果预览</h3>
      <div
        className="preview-area"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {imageData ? (
          <canvas
            ref={canvasRef}
            className={`preview-canvas ${isVisible ? 'visible' : ''}`}
          />
        ) : (
          <div className="preview-placeholder">上传图片后在此预览效果</div>
        )}
        {showTooltip && (
          <div
            className="filter-tooltip"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            {getTooltipText()}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewArea;
