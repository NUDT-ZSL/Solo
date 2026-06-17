import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ExtractedColor, ThemeAdjustments, Theme } from '../themeEngine';

interface ColorExtractorProps {
  extractedColors: ExtractedColor[];
  currentTheme: Theme;
  adjustments: ThemeAdjustments;
  savedThemes: Array<{ id: string; colors: ExtractedColor[]; theme: Theme }>;
  isExtracting: boolean;
  onExtractFromColors: (colors: string[], title: string, thumbnailColor: string) => void;
  onThemeColorClick: (colorIndex: number) => void;
  onAdjustmentsChange: (adjustments: ThemeAdjustments) => void;
  onSaveTheme: () => void;
  onSavedThemeClick: (index: number) => void;
  onPreviewAreaClick: () => void;
}

const presetColorSquares = [
  { colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'], title: '活力糖果', thumbnail: '#FF6B6B' },
  { colors: ['#2C3E50', '#34495E', '#7F8C8D', '#BDC3C7', '#ECF0F1'], title: '都市灰调', thumbnail: '#2C3E50' },
  { colors: ['#F39C12', '#E74C3C', '#9B59B6', '#3498DB', '#2ECC71'], title: '彩虹交响', thumbnail: '#F39C12' },
  { colors: ['#D4A574', '#C19A6B', '#8B7355', '#6B4423', '#3E2723'], title: '大地温暖', thumbnail: '#D4A574' },
];

const ColorExtractor: React.FC<ColorExtractorProps> = ({
  extractedColors,
  currentTheme,
  adjustments,
  savedThemes,
  isExtracting,
  onExtractFromColors,
  onThemeColorClick,
  onAdjustmentsChange,
  onSaveTheme,
  onSavedThemeClick,
  onPreviewAreaClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handlePresetClick = useCallback((preset: typeof presetColorSquares[0]) => {
    onExtractFromColors(preset.colors, preset.title, preset.thumbnail);
  }, [onExtractFromColors]);

  const handleHueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onAdjustmentsChange({ ...adjustments, hueOffset: parseInt(e.target.value) });
  }, [adjustments, onAdjustmentsChange]);

  const handleSaturationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onAdjustmentsChange({ ...adjustments, saturation: parseInt(e.target.value) });
  }, [adjustments, onAdjustmentsChange]);

  const handleLightnessChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onAdjustmentsChange({ ...adjustments, lightness: parseInt(e.target.value) });
  }, [adjustments, onAdjustmentsChange]);

  const sliderStyle: React.CSSProperties = {
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    background: `linear-gradient(to right, ${currentTheme.primary} 0%, ${currentTheme.primary} ${adjustments.hueOffset / 3.6}%, #E0E0E0 ${adjustments.hueOffset / 3.6}%, #E0E0E0 100%)`,
    outline: 'none',
    cursor: 'pointer',
  };

  const saturationSliderStyle: React.CSSProperties = {
    ...sliderStyle,
    background: `linear-gradient(to right, ${currentTheme.primary} 0%, ${currentTheme.primary} ${adjustments.saturation}%, #E0E0E0 ${adjustments.saturation}%, #E0E0E0 100%)`,
  };

  const lightnessSliderStyle: React.CSSProperties = {
    ...sliderStyle,
    background: `linear-gradient(to right, ${currentTheme.primary} 0%, ${currentTheme.primary} ${adjustments.lightness}%, #E0E0E0 ${adjustments.lightness}%, #E0E0E0 100%)`,
  };

  const panelContent = (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ 
          fontFamily: "'Playfair Display', serif", 
          fontWeight: 700, 
          fontSize: '18px', 
          margin: '0 0 12px 0',
          color: 'var(--color-text)'
        }}>
          上传新作品
        </h3>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={onPreviewAreaClick}
          style={{
            width: '100%',
            height: '120px',
            backgroundColor: '#E8E8E8',
            border: `2px dashed ${isDragging ? currentTheme.primary : '#CCCCCC'}`,
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '12px',
          }}
        >
          {isExtracting ? (
            <span style={{ color: '#666', fontFamily: "'Inter', sans-serif" }}>提取中...</span>
          ) : (
            <>
              <span style={{ fontSize: '24px', marginBottom: '8px' }}>📁</span>
              <span style={{ color: '#666', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
                拖拽或点击选择预设
              </span>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {presetColorSquares.map((preset, index) => (
            <div
              key={index}
              onClick={() => handlePresetClick(preset)}
              style={{
                height: '60px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                fontWeight: 600,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                background: `linear-gradient(135deg, ${preset.colors.join(', ')})`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {preset.title}
            </div>
          ))}
        </div>
      </div>

      {extractedColors.length > 0 && (
        <>
          <div>
            <h3 style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontWeight: 700, 
              fontSize: '18px', 
              margin: '0 0 12px 0',
              color: 'var(--color-text)'
            }}>
              提取的主色调
            </h3>
            <div style={{ display: 'flex', gap: '4px', height: '160px', marginBottom: '16px' }}>
              {extractedColors.map((color, index) => (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    backgroundColor: color.hex,
                    borderRadius: '4px',
                    transition: 'transform 0.2s ease',
                    cursor: 'pointer',
                  }}
                  title={color.hex}
                  onClick={() => onThemeColorClick(index)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scaleY(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scaleY(1)';
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
              {extractedColors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => onThemeColorClick(index)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: color.hex,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                  title={`主题 ${index + 1}: ${color.hex}`}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontWeight: 700, 
              fontSize: '18px', 
              margin: '0 0 16px 0',
              color: 'var(--color-text)'
            }}>
              主题参数调节
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    色相偏移
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'var(--color-text)', fontWeight: 600 }}>
                    {adjustments.hueOffset}°
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={adjustments.hueOffset}
                  onChange={handleHueChange}
                  style={sliderStyle}
                  className="custom-slider"
                />
                <style>{`
                  .custom-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: #FFFFFF;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    border: none;
                  }
                  .custom-slider::-moz-range-thumb {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: #FFFFFF;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    border: none;
                  }
                `}</style>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    饱和度
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'var(--color-text)', fontWeight: 600 }}>
                    {adjustments.saturation}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adjustments.saturation}
                  onChange={handleSaturationChange}
                  style={saturationSliderStyle}
                  className="custom-slider"
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    亮度
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'var(--color-text)', fontWeight: 600 }}>
                    {adjustments.lightness}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adjustments.lightness}
                  onChange={handleLightnessChange}
                  style={lightnessSliderStyle}
                  className="custom-slider"
                />
              </div>
            </div>
          </div>

          <button
            onClick={onSaveTheme}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: 'var(--color-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.3s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-button-hover)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            保存当前主题
          </button>

          {savedThemes.length > 0 && (
            <div>
              <h3 style={{ 
                fontFamily: "'Playfair Display', serif", 
                fontWeight: 700, 
                fontSize: '18px', 
                margin: '0 0 12px 0',
                color: 'var(--color-text)'
              }}>
                已存主题 ({savedThemes.length}/6)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {savedThemes.map((saved, index) => (
                  <div
                    key={saved.id}
                    onClick={() => onSavedThemeClick(index)}
                    style={{
                      height: '50px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      overflow: 'hidden',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      border: '1px solid var(--color-border)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {saved.colors.map((color, ci) => (
                      <div
                        key={ci}
                        style={{
                          flex: 1,
                          backgroundColor: color.hex,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsMobilePanelOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            color: '#FFFFFF',
            border: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            fontSize: '24px',
            zIndex: 100,
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          🎨
        </button>

        {isMobilePanelOpen && (
          <>
            <div
              onClick={() => setIsMobilePanelOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 200,
                animation: 'fadeIn 0.3s ease',
              }}
            />
            <div
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: '70vh',
                backgroundColor: '#FAFAFA',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                zIndex: 201,
                animation: 'slideUp 0.3s ease',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '4px',
                  backgroundColor: '#DDD',
                  borderRadius: '2px',
                  margin: '12px auto',
                }}
              />
              {panelContent}
            </div>
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
              }
            `}</style>
          </>
        )}
      </>
    );
  }

  return (
    <div
      style={{
        width: '320px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 40px)',
        position: 'sticky',
        top: '20px',
      }}
    >
      {panelContent}
    </div>
  );
};

export default ColorExtractor;
