import React, { useState, useRef, useEffect } from 'react';
import { DEFAULT_COLORS, DEFAULT_STROKE_WIDTH, MIN_STROKE_WIDTH, MAX_STROKE_WIDTH } from '../logic/DataModel';

export type ToolType = 'pen' | 'rectangle' | 'circle' | 'line' | 'sticky' | 'annotation' | 'select';

interface ToolbarProps {
  currentTool: ToolType;
  currentColor: string;
  strokeWidth: number;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  currentColor,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStrokeSlider, setShowStrokeSlider] = useState(false);
  const [sliderPosition, setSliderPosition] = useState({ x: 0, y: 0 });
  const sliderRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const tools: { type: ToolType; icon: string; label: string }[] = [
    { type: 'select', icon: '↖', label: '选择' },
    { type: 'pen', icon: '✏️', label: '画笔' },
    { type: 'rectangle', icon: '▭', label: '矩形' },
    { type: 'circle', icon: '○', label: '圆形' },
    { type: 'line', icon: '／', label: '直线' },
    { type: 'sticky', icon: '📝', label: '便签' },
    { type: 'annotation', icon: '💬', label: '批注' }
  ];

  const handleStrokeSliderMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = sliderRef.current?.getBoundingClientRect();
    if (rect) {
      const updatePosition = (clientX: number) => {
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const width = Math.round(MIN_STROKE_WIDTH + percentage * (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH));
        const snappedWidth = width <= 2 ? 1 : width <= 4 ? 3 : 5;
        onStrokeWidthChange(snappedWidth);
        setSliderPosition({ x: Math.max(0, Math.min(rect.width, x)), y: 0 });
      };
      updatePosition(e.clientX);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        updatePosition(moveEvent.clientX);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="toolbar">
      <div className="toolbar-current-color">
        <div
          className="color-circle"
          style={{ backgroundColor: currentColor }}
          onClick={() => setShowColorPicker(!showColorPicker)}
        />
        {showColorPicker && (
          <div className="color-picker-popup" ref={colorPickerRef}>
            <div className="color-swatch-grid">
              {DEFAULT_COLORS.map((color) => (
                <div
                  key={color}
                  className={`color-swatch ${currentColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onColorChange(color);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
            <div className="color-picker-input">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => onColorChange(e.target.value)}
              />
              <span>自定义颜色</span>
            </div>
          </div>
        )}
      </div>

      <div className="toolbar-divider" />

      {tools.map((tool) => (
        <div
          key={tool.type}
          className={`tool-button ${currentTool === tool.type ? 'active' : ''}`}
          onClick={() => onToolChange(tool.type)}
          title={tool.label}
        >
          <span className="tool-icon">{tool.icon}</span>
          <span className="tool-tooltip">{tool.label}</span>
          {currentTool === tool.type && <div className="tool-underline" />}
        </div>
      ))}

      <div className="toolbar-divider" />

      <div
        className="stroke-width-control"
        onMouseEnter={() => setShowStrokeSlider(true)}
        onMouseLeave={() => setShowStrokeSlider(false)}
      >
        <div className="stroke-preview">
          <div
            className="stroke-dot"
            style={{ width: strokeWidth * 2, height: strokeWidth * 2 }}
          />
        </div>
        <span className="tool-tooltip">笔触粗细</span>
        {showStrokeSlider && (
          <div className="stroke-slider-popup">
            <div className="stroke-slider-track" ref={sliderRef} onMouseDown={handleStrokeSliderMouseDown}>
              <div
                className="stroke-slider-thumb"
                style={{ left: `calc(${(strokeWidth - MIN_STROKE_WIDTH) / (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH) * 100}% - 8px)` }}
              >
                <div
                  className="stroke-preview-dot"
                  style={{ width: strokeWidth * 3, height: strokeWidth * 3 }}
                />
              </div>
            </div>
            <div className="stroke-labels">
              <span>1px</span>
              <span>3px</span>
              <span>5px</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .toolbar {
          width: 60px;
          background: #ffffff;
          border-right: 1px solid #e0e0e0;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 0;
          gap: 4px;
          box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
          position: relative;
          z-index: 100;
        }

        .toolbar-current-color {
          position: relative;
          margin-bottom: 8px;
        }

        .color-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid #bdbdbd;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
        }

        .color-circle:hover {
          transform: scale(1.15);
          box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.3);
        }

        .color-picker-popup {
          position: absolute;
          left: 70px;
          top: 0;
          background: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          width: 180px;
        }

        .color-swatch-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
          margin-bottom: 12px;
        }

        .color-swatch {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .color-swatch:hover {
          transform: scale(1.1);
        }

        .color-swatch.active {
          border-color: #4FC3F7;
          box-shadow: 0 0 0 2px rgba(79, 195, 247, 0.3);
        }

        .color-picker-input {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .color-picker-input input[type="color"] {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .color-picker-input span {
          font-size: 12px;
          color: #666;
        }

        .toolbar-divider {
          width: 36px;
          height: 1px;
          background: #e0e0e0;
          margin: 8px 0;
        }

        .tool-button {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          cursor: pointer;
          position: relative;
          transition: background-color 0.2s ease;
        }

        .tool-button:hover {
          background-color: #f0f0f0;
        }

        .tool-button.active {
          background-color: #E0F7FA;
        }

        .tool-icon {
          font-size: 20px;
          color: #212121;
        }

        .tool-tooltip {
          position: absolute;
          left: 56px;
          top: 50%;
          transform: translateY(-50%);
          background: #212121;
          color: #ffffff;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, visibility 0.2s ease;
          z-index: 1000;
        }

        .tool-button:hover .tool-tooltip {
          opacity: 1;
          visibility: visible;
        }

        .tool-underline {
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 3px;
          background-color: #4FC3F7;
          border-radius: 2px;
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from {
            width: 0;
            opacity: 0;
          }
          to {
            width: 24px;
            opacity: 1;
          }
        }

        .stroke-width-control {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          cursor: pointer;
          position: relative;
          transition: background-color 0.2s ease;
        }

        .stroke-width-control:hover {
          background-color: #f0f0f0;
        }

        .stroke-preview {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stroke-dot {
          background-color: #212121;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .stroke-slider-popup {
          position: absolute;
          left: 56px;
          top: 50%;
          transform: translateY(-50%);
          background: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          width: 140px;
        }

        .stroke-slider-track {
          height: 6px;
          background: #e0e0e0;
          border-radius: 3px;
          position: relative;
          cursor: pointer;
          margin-bottom: 12px;
        }

        .stroke-slider-thumb {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          background: #4FC3F7;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          cursor: grab;
        }

        .stroke-slider-thumb:active {
          cursor: grabbing;
        }

        .stroke-preview-dot {
          background-color: #212121;
          border-radius: 50%;
        }

        .stroke-labels {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #999;
        }

        @media (max-width: 768px) {
          .toolbar {
            width: 100%;
            height: 60px;
            border-right: none;
            border-bottom: 1px solid #e0e0e0;
            flex-direction: row;
            padding: 0 16px;
            overflow-x: auto;
          }

          .toolbar-divider {
            width: 1px;
            height: 36px;
            margin: 0 8px;
          }

          .tool-tooltip {
            display: none;
          }

          .color-picker-popup {
            left: auto;
            top: 70px;
          }

          .stroke-slider-popup {
            left: auto;
            top: 70px;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Toolbar;
