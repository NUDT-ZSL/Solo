import React, { useState, useCallback, useEffect } from 'react';
import { ExtractedColor, ThemeAdjustments, Theme } from '../themeEngine';

interface ColorExtractorProps {
  extractedColors: ExtractedColor[];
  currentTheme: Theme;
  currentArtworkTitle: string;
  adjustments: ThemeAdjustments;
  savedThemes: Array<{ id: string; colors: ExtractedColor[]; theme: Theme }>;
  onThemeColorClick: (colorIndex: number) => void;
  onAdjustmentsChange: (adjustments: ThemeAdjustments) => void;
  onSaveTheme: () => void;
  onSavedThemeClick: (index: number) => void;
  onDeleteSavedTheme: (index: number) => void;
}

const ColorExtractor: React.FC<ColorExtractorProps> = ({
  extractedColors,
  currentTheme,
  currentArtworkTitle,
  adjustments,
  savedThemes,
  onThemeColorClick,
  onAdjustmentsChange,
  onSaveTheme,
  onSavedThemeClick,
  onDeleteSavedTheme,
}) => {
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleHueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onAdjustmentsChange({ ...adjustments, hueOffset: parseInt(e.target.value) });
  }, [adjustments, onAdjustmentsChange]);

  const handleSaturationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onAdjustmentsChange({ ...adjustments, saturation: parseInt(e.target.value) });
  }, [adjustments, onAdjustmentsChange]);

  const handleLightnessChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onAdjustmentsChange({ ...adjustments, lightness: parseInt(e.target.value) });
  }, [adjustments, onAdjustmentsChange]);

  const handleColorClick = useCallback((index: number) => {
    setActiveColorIndex(index);
    onThemeColorClick(index);
    setTimeout(() => setActiveColorIndex(null), 500);
  }, [onThemeColorClick]);

  const huePercent = adjustments.hueOffset / 360 * 100;

  const sliderBaseStyle: React.CSSProperties = {
    WebkitAppearance: 'none',
    appearance: 'none',
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
  };

  const hueSliderStyle: React.CSSProperties = {
    ...sliderBaseStyle,
    background: `linear-gradient(to right, ${currentTheme.primary} 0%, ${currentTheme.primary} ${huePercent}%, #E5E5E5 ${huePercent}%, #E5E5E5 100%)`,
  };

  const satSliderStyle: React.CSSProperties = {
    ...sliderBaseStyle,
    background: `linear-gradient(to right, ${currentTheme.primary} 0%, ${currentTheme.primary} ${adjustments.saturation}%, #E5E5E5 ${adjustments.saturation}%, #E5E5E5 100%)`,
  };

  const lightSliderStyle: React.CSSProperties = {
    ...sliderBaseStyle,
    background: `linear-gradient(to right, ${currentTheme.primary} 0%, ${currentTheme.primary} ${adjustments.lightness}%, #E5E5E5 ${adjustments.lightness}%, #E5E5E5 100%)`,
  };

  const panelContent = (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '20px' }}>🎨</span>
          <h3 style={{ 
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: '20px',
            margin: 0,
            color: 'var(--color-text)',
          }}>
            主题控制面板
          </h3>
        </div>
        {currentArtworkTitle && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: `${currentTheme.primary}18`,
            borderRadius: '8px',
            borderLeft: `3px solid ${currentTheme.primary}`,
          }}>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
            }}>
              当前作品：
            </span>
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginLeft: '4px',
            }}>
              {currentArtworkTitle}
            </span>
          </div>
        )}
      </div>

      {extractedColors.length > 0 ? (
        <>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h4 style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: '14px',
                margin: 0,
                color: 'var(--color-text)',
              }}>
                提取的 5 种主色调
              </h4>
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
              }}>
                点击色块应用
              </span>
            </div>

            <div style={{
              display: 'flex',
              gap: '6px',
              height: '120px',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: 'inset 0 0 0 1px var(--color-border)',
            }}>
              {extractedColors.map((color, index) => (
                <div
                  key={index}
                  onClick={() => handleColorClick(index)}
                  style={{
                    flex: 1,
                    backgroundColor: color.hex,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'flex 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: '8px',
                    transform: activeColorIndex === index ? 'scaleY(1.02)' : 'scaleY(1)',
                    boxShadow: activeColorIndex === index
                      ? `0 0 0 2px ${color.hex}, 0 4px 14px ${color.hex}50`
                      : 'none',
                    zIndex: activeColorIndex === index ? 2 : 1,
                  }}
                  title={`${index + 1}. ${color.hex.toUpperCase()}`}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.flex = '1.6';
                    (e.currentTarget as HTMLElement).style.zIndex = '3';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.flex = '1';
                    (e.currentTarget as HTMLElement).style.zIndex = '1';
                  }}
                >
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.95)',
                    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    backdropFilter: 'blur(4px)',
                  }}>
                    {color.hex.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '16px',
            }}>
              {extractedColors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => handleColorClick(index)}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: color.hex,
                    border: activeColorIndex === index
                      ? `3px solid var(--color-text)`
                      : '3px solid var(--color-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: activeColorIndex === index
                      ? `0 0 0 2px ${color.hex}, 0 6px 18px ${color.hex}50`
                      : '0 3px 10px rgba(0,0,0,0.12)',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.15) translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 20px rgba(0,0,0,0.2)`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1) translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = activeColorIndex === index
                      ? `0 0 0 2px ${color.hex}, 0 6px 18px ${color.hex}50`
                      : '0 3px 10px rgba(0,0,0,0.12)';
                  }}
                  title={`应用主题色 ${index + 1}：${color.hex.toUpperCase()}`}
                >
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {index + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--color-background)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid var(--color-border)',
          }}>
            <h4 style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: '14px',
              margin: '0 0 16px 0',
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span>🎛️</span> 主题参数微调
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>🌈</span>
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '13px',
                      color: 'var(--color-text-secondary)',
                      fontWeight: 500,
                    }}>
                      色相偏移
                    </span>
                  </div>
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    padding: '2px 8px',
                    backgroundColor: 'var(--color-primary)15',
                    borderRadius: '6px',
                  }}>
                    {adjustments.hueOffset}°
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={adjustments.hueOffset}
                  onChange={handleHueChange}
                  style={hueSliderStyle}
                  className="custom-slider"
                />
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>💧</span>
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '13px',
                      color: 'var(--color-text-secondary)',
                      fontWeight: 500,
                    }}>
                      饱和度
                    </span>
                  </div>
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    padding: '2px 8px',
                    backgroundColor: 'var(--color-primary)15',
                    borderRadius: '6px',
                  }}>
                    {adjustments.saturation}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adjustments.saturation}
                  onChange={handleSaturationChange}
                  style={satSliderStyle}
                  className="custom-slider"
                />
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>☀️</span>
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '13px',
                      color: 'var(--color-text-secondary)',
                      fontWeight: 500,
                    }}>
                      亮度
                    </span>
                  </div>
                  <span style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    padding: '2px 8px',
                    backgroundColor: 'var(--color-primary)15',
                    borderRadius: '6px',
                  }}>
                    {adjustments.lightness}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adjustments.lightness}
                  onChange={handleLightnessChange}
                  style={lightSliderStyle}
                  className="custom-slider"
                />
              </div>
            </div>
          </div>

          <button
            onClick={onSaveTheme}
            disabled={savedThemes.length >= 6}
            style={{
              width: '100%',
              padding: '14px 20px',
              backgroundColor: savedThemes.length >= 6 ? '#CCC' : 'var(--color-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
              fontWeight: 600,
              cursor: savedThemes.length >= 6 ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: savedThemes.length >= 6
                ? 'none'
                : `0 4px 14px ${currentTheme.primary}40`,
            }}
            onMouseEnter={(e) => {
              if (savedThemes.length < 6) {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-button-hover)';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 22px ${currentTheme.primary}55`;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              if (savedThemes.length < 6) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-primary)';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 14px ${currentTheme.primary}40`;
              }
            }}
          >
            <span>💾</span>
            {savedThemes.length >= 6 ? '已达保存上限' : '保存当前主题'}
            <span style={{
              fontSize: '11px',
              opacity: 0.85,
              backgroundColor: 'rgba(255,255,255,0.25)',
              padding: '2px 8px',
              borderRadius: '10px',
            }}>
              {savedThemes.length}/6
            </span>
          </button>

          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}>
              <h4 style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: '14px',
                margin: 0,
                color: 'var(--color-text)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span>📚</span> 已存主题
              </h4>
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
              }}>
                右键删除
              </span>
            </div>
            {savedThemes.length === 0 ? (
              <div style={{
                padding: '24px 16px',
                textAlign: 'center',
                backgroundColor: 'var(--color-background)',
                borderRadius: '10px',
                border: '2px dashed var(--color-border)',
              }}>
                <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>🗂️</span>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                }}>
                  暂无保存的主题<br/>点击上方按钮保存
                </span>
              </div>
            ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                }}>
                  {savedThemes.map((saved, index) => (
                    <div
                      key={saved.id}
                      onClick={() => onSavedThemeClick(index)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onDeleteSavedTheme(index);
                      }}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '2px solid var(--color-border)',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        backgroundColor: 'var(--color-surface)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.06) translateY(-3px)';
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = 'scale(1) translateY(0)';
                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
                      }}
                      title={`主题 ${index + 1} - 点击应用，右键删除`}
                    >
                      <div style={{ flex: 1, display: 'flex' }}>
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
                      <div style={{
                        padding: '4px 6px',
                        textAlign: 'center',
                        backgroundColor: 'var(--color-surface)',
                        borderTop: '1px solid var(--color-border)',
                      }}>
                        <span style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '10px',
                          fontWeight: 600,
                          color: 'var(--color-text-secondary)',
                        }}>
                          主题 {index + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                  </div>
              )}
          </div>
        </>
      ) : (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: 'var(--color-background)',
          borderRadius: '12px',
          border: '2px dashed var(--color-border)',
        }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>👆</span>
          <h4 style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: '18px',
            margin: '0 0 8px 0',
            color: 'var(--color-text)',
          }}>
            选择一个作品
          </h4>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
          }}>
            点击左侧任意作品卡片<br/>即可提取主题色彩
          </span>
        </div>
      )}

      <style>{`
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #FFFFFF;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2), 0 0 0 3px var(--color-primary)30;
          border: none;
          transition: all 0.2s ease;
        }
        .custom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25), 0 0 0 5px var(--color-primary)40;
        }
        .custom-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #FFFFFF;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2), 0 0 0 3px var(--color-primary)30;
          border: none;
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsMobilePanelOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            color: '#FFFFFF',
            border: 'none',
            boxShadow: `0 8px 24px ${currentTheme.primary}55`,
            cursor: 'pointer',
            fontSize: '26px',
            zIndex: 100,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
            (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 30px ${currentTheme.primary}70`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${currentTheme.primary}55`;
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
                backgroundColor: 'rgba(0,0,0,0.55)',
                zIndex: 200,
                animation: 'fadeIn 0.3s ease',
                backdropFilter: 'blur(4px)',
              }}
            />
            <div
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                maxHeight: '80vh',
                backgroundColor: 'var(--color-surface)',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                zIndex: 201,
                animation: 'slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                overflowY: 'auto',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '5px',
                  backgroundColor: '#D1D1D1',
                  borderRadius: '3px',
                  margin: '14px auto',
                  cursor: 'pointer',
                }}
                onClick={() => setIsMobilePanelOpen(false)}
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
    <aside
      style={{
        width: '340px',
        flexShrink: 0,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        overflowY: 'auto',
        maxHeight: 'calc(100vh - 40px)',
        position: 'sticky',
        top: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}
    >
      {panelContent}
    </aside>
  );
};

export default ColorExtractor;
