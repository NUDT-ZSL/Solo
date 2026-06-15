import React, { useState } from 'react';
import { SketchPicker } from 'react-color';
import { LayoutElement, BackgroundConfig } from '../types';
import { GRADIENT_PRESETS, CHINESE_FONTS } from '../utils/constants';

interface ToolPanelProps {
  selectedElement: LayoutElement | null;
  background: BackgroundConfig;
  onUpdateElement: (id: string, updates: Partial<LayoutElement>) => void;
  onUpdateBackground: (bg: Partial<BackgroundConfig>) => void;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  selectedElement,
  background,
  onUpdateElement,
  onUpdateBackground,
}) => {
  const [showFontColorPicker, setShowFontColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [showFillColorPicker, setShowFillColorPicker] = useState(false);
  const [showStrokeColorPicker, setShowStrokeColorPicker] = useState(false);
  const [showLineColorPicker, setShowLineColorPicker] = useState(false);
  const [activeGradientIndex, setActiveGradientIndex] = useState<number | null>(null);

  const handleNumberChange = (field: keyof LayoutElement, value: string) => {
    if (!selectedElement) return;
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onUpdateElement(selectedElement.id, { [field]: numValue });
    }
  };

  const handleInputChange = (field: keyof LayoutElement, value: string) => {
    if (!selectedElement) return;
    onUpdateElement(selectedElement.id, { [field]: value });
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onUpdateBackground({
          type: 'image',
          imageUrl: dataUrl,
          imageFit: background.imageFit || 'cover',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderElementProperties = () => {
    if (!selectedElement) {
      return (
        <div className="panel-section">
          <div className="panel-section-title">画布设置</div>
          
          <div className="background-type-switch">
            <button
              className={`bg-type-btn ${background.type === 'solid' ? 'active' : ''}`}
              onClick={() => onUpdateBackground({ type: 'solid' })}
            >
              纯色
            </button>
            <button
              className={`bg-type-btn ${background.type === 'gradient' ? 'active' : ''}`}
              onClick={() => onUpdateBackground({ type: 'gradient' })}
            >
              渐变
            </button>
            <button
              className={`bg-type-btn ${background.type === 'image' ? 'active' : ''}`}
              onClick={() => onUpdateBackground({ type: 'image' })}
            >
              图片
            </button>
          </div>

          {background.type === 'solid' && (
            <div className="form-group">
              <label className="form-label">背景颜色</label>
              <div className="color-picker-wrapper">
                <div
                  className="color-preview"
                  style={{ backgroundColor: background.color || '#ffffff' }}
                  onClick={() => setShowBgColorPicker(!showBgColorPicker)}
                />
                {showBgColorPicker && (
                  <div className="color-picker-popover">
                    <div className="color-picker-cover" onClick={() => setShowBgColorPicker(false)} />
                    <SketchPicker
                      color={background.color || '#ffffff'}
                      onChange={(color) => {
                        onUpdateBackground({ color: color.hex });
                      }}
                      disableAlpha
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {background.type === 'gradient' && (
            <>
              <div className="form-group">
                <label className="form-label">渐变预设</label>
                <div className="gradient-presets">
                  {GRADIENT_PRESETS.map((preset, index) => (
                    <div
                      key={index}
                      className={`gradient-preset ${activeGradientIndex === index ? 'active' : ''}`}
                      style={{
                        background: `linear-gradient(${preset.gradient.angle}deg, ${preset.gradient.from}, ${preset.gradient.to})`,
                      }}
                      onClick={() => {
                        setActiveGradientIndex(index);
                        onUpdateBackground({
                          type: 'gradient',
                          gradient: preset.gradient,
                        });
                      }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>
              {background.gradient && (
                <div className="form-group">
                  <label className="form-label">渐变角度: {background.gradient.angle}°</label>
                  <div className="form-slider">
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={background.gradient.angle}
                      onChange={(e) => {
                        const angle = parseInt(e.target.value);
                        onUpdateBackground({
                          gradient: { ...background.gradient!, angle },
                        });
                      }}
                    />
                    <span className="slider-value">{background.gradient.angle}°</span>
                  </div>
                </div>
              )}
            </>
          )}

          {background.type === 'image' && (
            <>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">背景图片</label>
                <label className="image-upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleBgImageUpload}
                  />
                  {background.imageUrl ? '更换背景图片' : '点击上传背景图片'}
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">拉伸模式</label>
                <div className="fit-mode-switch">
                  <button
                    className={`fit-btn ${background.imageFit === 'cover' ? 'active' : ''}`}
                    onClick={() => onUpdateBackground({ imageFit: 'cover' })}
                  >
                    覆盖
                  </button>
                  <button
                    className={`fit-btn ${background.imageFit === 'contain' ? 'active' : ''}`}
                    onClick={() => onUpdateBackground({ imageFit: 'contain' })}
                  >
                    包含
                  </button>
                  <button
                    className={`fit-btn ${background.imageFit === 'fill' ? 'active' : ''}`}
                    onClick={() => onUpdateBackground({ imageFit: 'fill' })}
                  >
                    填充
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    return (
      <>
        <div className="panel-section">
          <div className="panel-section-title">位置与尺寸</div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">X 坐标</label>
              <input
                type="number"
                className="form-input"
                value={Math.round(selectedElement.x)}
                onChange={(e) => handleNumberChange('x', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Y 坐标</label>
              <input
                type="number"
                className="form-input"
                value={Math.round(selectedElement.y)}
                onChange={(e) => handleNumberChange('y', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">宽度</label>
              <input
                type="number"
                className="form-input"
                value={Math.round(selectedElement.width)}
                onChange={(e) => handleNumberChange('width', e.target.value)}
                min="10"
              />
            </div>
            <div className="form-group">
              <label className="form-label">高度</label>
              <input
                type="number"
                className="form-input"
                value={Math.round(selectedElement.height)}
                onChange={(e) => handleNumberChange('height', e.target.value)}
                min="10"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">旋转角度</label>
              <div className="form-slider">
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={selectedElement.rotation}
                  onChange={(e) => handleNumberChange('rotation', e.target.value)}
                />
                <span className="slider-value">{selectedElement.rotation}°</span>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">不透明度</label>
              <div className="form-slider">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(selectedElement.opacity * 100)}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) / 100;
                    onUpdateElement(selectedElement.id, { opacity: value });
                  }}
                />
                <span className="slider-value">{Math.round(selectedElement.opacity * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {selectedElement.type === 'text' && (
          <div className="panel-section">
            <div className="panel-section-title">文本属性</div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">文本内容</label>
              <textarea
                className="form-input"
                value={selectedElement.text || ''}
                onChange={(e) => handleInputChange('text', e.target.value)}
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">字体族</label>
              <select
                className="form-select"
                value={selectedElement.fontFamily || ''}
                onChange={(e) => handleInputChange('fontFamily', e.target.value)}
              >
                {CHINESE_FONTS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">字号</label>
                <div className="form-slider">
                  <input
                    type="range"
                    min="12"
                    max="120"
                    value={selectedElement.fontSize || 32}
                    onChange={(e) => handleNumberChange('fontSize', e.target.value)}
                  />
                  <span className="slider-value">{selectedElement.fontSize}px</span>
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">字体颜色</label>
              <div className="color-picker-wrapper">
                <div
                  className="color-preview"
                  style={{ backgroundColor: selectedElement.fontColor || '#000000' }}
                  onClick={() => setShowFontColorPicker(!showFontColorPicker)}
                />
                {showFontColorPicker && (
                  <div className="color-picker-popover">
                    <div className="color-picker-cover" onClick={() => setShowFontColorPicker(false)} />
                    <SketchPicker
                      color={selectedElement.fontColor || '#000000'}
                      onChange={(color) => {
                        onUpdateElement(selectedElement.id, { fontColor: color.hex });
                      }}
                      disableAlpha
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">行高</label>
                <div className="form-slider">
                  <input
                    type="range"
                    min="0.8"
                    max="3"
                    step="0.1"
                    value={selectedElement.lineHeight || 1.4}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      onUpdateElement(selectedElement.id, { lineHeight: value });
                    }}
                  />
                  <span className="slider-value">{selectedElement.lineHeight?.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">字间距</label>
                <div className="form-slider">
                  <input
                    type="range"
                    min="-5"
                    max="20"
                    step="0.5"
                    value={selectedElement.letterSpacing || 0}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      onUpdateElement(selectedElement.id, { letterSpacing: value });
                    }}
                  />
                  <span className="slider-value">{selectedElement.letterSpacing}px</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">对齐方式</label>
              <div className="align-buttons">
                <button
                  className={`align-btn ${selectedElement.textAlign === 'left' ? 'active' : ''}`}
                  onClick={() => onUpdateElement(selectedElement.id, { textAlign: 'left' })}
                >
                  左
                </button>
                <button
                  className={`align-btn ${selectedElement.textAlign === 'center' ? 'active' : ''}`}
                  onClick={() => onUpdateElement(selectedElement.id, { textAlign: 'center' })}
                >
                  中
                </button>
                <button
                  className={`align-btn ${selectedElement.textAlign === 'right' ? 'active' : ''}`}
                  onClick={() => onUpdateElement(selectedElement.id, { textAlign: 'right' })}
                >
                  右
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedElement.type === 'image' && (
          <div className="panel-section">
            <div className="panel-section-title">图片属性</div>
            
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">图片</label>
              <label className="image-upload-btn">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const dataUrl = event.target?.result as string;
                        onUpdateElement(selectedElement.id, { imageUrl: dataUrl });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {selectedElement.imageUrl ? '更换图片' : '上传图片'}
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">拉伸模式</label>
              <div className="fit-mode-switch">
                <button
                  className={`fit-btn ${selectedElement.imageFit === 'cover' ? 'active' : ''}`}
                  onClick={() => onUpdateElement(selectedElement.id, { imageFit: 'cover' })}
                >
                  覆盖
                </button>
                <button
                  className={`fit-btn ${selectedElement.imageFit === 'contain' ? 'active' : ''}`}
                  onClick={() => onUpdateElement(selectedElement.id, { imageFit: 'contain' })}
                >
                  包含
                </button>
                <button
                  className={`fit-btn ${selectedElement.imageFit === 'fill' ? 'active' : ''}`}
                  onClick={() => onUpdateElement(selectedElement.id, { imageFit: 'fill' })}
                >
                  填充
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedElement.type === 'shape' && (
          <div className="panel-section">
            <div className="panel-section-title">形状属性</div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">形状类型</label>
              <select
                className="form-select"
                value={selectedElement.shapeType || 'rectangle'}
                onChange={(e) => handleInputChange('shapeType', e.target.value)}
              >
                <option value="rectangle">矩形</option>
                <option value="circle">圆形</option>
                <option value="triangle">三角形</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">填充颜色</label>
              <div className="color-picker-wrapper">
                <div
                  className="color-preview"
                  style={{ backgroundColor: selectedElement.fillColor || '#e94560' }}
                  onClick={() => setShowFillColorPicker(!showFillColorPicker)}
                />
                {showFillColorPicker && (
                  <div className="color-picker-popover">
                    <div className="color-picker-cover" onClick={() => setShowFillColorPicker(false)} />
                    <SketchPicker
                      color={selectedElement.fillColor || '#e94560'}
                      onChange={(color) => {
                        onUpdateElement(selectedElement.id, { fillColor: color.hex });
                      }}
                      disableAlpha
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">边框宽度</label>
                <div className="form-slider">
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={selectedElement.strokeWidth || 0}
                    onChange={(e) => handleNumberChange('strokeWidth', e.target.value)}
                  />
                  <span className="slider-value">{selectedElement.strokeWidth}px</span>
                </div>
              </div>
            </div>

            {selectedElement.strokeWidth && selectedElement.strokeWidth > 0 && (
              <div className="form-group">
                <label className="form-label">边框颜色</label>
                <div className="color-picker-wrapper">
                  <div
                    className="color-preview"
                    style={{ backgroundColor: selectedElement.strokeColor || '#000000' }}
                    onClick={() => setShowStrokeColorPicker(!showStrokeColorPicker)}
                  />
                  {showStrokeColorPicker && (
                    <div className="color-picker-popover">
                      <div className="color-picker-cover" onClick={() => setShowStrokeColorPicker(false)} />
                      <SketchPicker
                        color={selectedElement.strokeColor || '#000000'}
                        onChange={(color) => {
                          onUpdateElement(selectedElement.id, { strokeColor: color.hex });
                        }}
                        disableAlpha
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedElement.type === 'line' && (
          <div className="panel-section">
            <div className="panel-section-title">装饰线属性</div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">线条样式</label>
              <select
                className="form-select"
                value={selectedElement.lineStyle || 'solid'}
                onChange={(e) => handleInputChange('lineStyle', e.target.value)}
              >
                <option value="solid">实线</option>
                <option value="dashed">虚线</option>
                <option value="dotted">点线</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">线条颜色</label>
              <div className="color-picker-wrapper">
                <div
                  className="color-preview"
                  style={{ backgroundColor: selectedElement.lineColor || '#e94560' }}
                  onClick={() => setShowLineColorPicker(!showLineColorPicker)}
                />
                {showLineColorPicker && (
                  <div className="color-picker-popover">
                    <div className="color-picker-cover" onClick={() => setShowLineColorPicker(false)} />
                    <SketchPicker
                      color={selectedElement.lineColor || '#e94560'}
                      onChange={(color) => {
                        onUpdateElement(selectedElement.id, { lineColor: color.hex });
                      }}
                      disableAlpha
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">线条粗细</label>
              <div className="form-slider">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={selectedElement.lineThickness || 2}
                  onChange={(e) => handleNumberChange('lineThickness', e.target.value)}
                />
                <span className="slider-value">{selectedElement.lineThickness}px</span>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="tool-panel">
      <div className="tool-panel-header">
        <span>{selectedElement ? '元素属性' : '画布设置'}</span>
        {selectedElement && (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {selectedElement.type === 'text' ? '文本' : 
             selectedElement.type === 'image' ? '图片' : 
             selectedElement.type === 'line' ? '装饰线' : '形状'}
          </span>
        )}
      </div>
      <div className="tool-panel-content">
        {renderElementProperties()}
      </div>
    </div>
  );
};
