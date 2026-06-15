import { useState, useRef, useEffect, useMemo, createElement } from 'react';
import { 
  DesignSpec, 
  ColorSwatch, 
  TypographyLevel, 
  getAlternativeFonts,
  exportToJSON,
  exportToCSSVars
} from '../utils/specGenerator';

interface CardWallProps {
  specs: DesignSpec[];
  onSpecChange: (updatedSpecs: DesignSpec[]) => void;
}

const estimateCardHeight = (spec: DesignSpec): number => {
  const basePadding = 48;
  const titleHeight = 44;
  switch (spec.type) {
    case 'colors':
      return basePadding + titleHeight + 100;
    case 'fonts':
      return basePadding + titleHeight + 220;
    case 'typography':
      return basePadding + titleHeight + 340;
    default:
      return basePadding + titleHeight + 150;
  }
};

const masonryLayout = (specs: DesignSpec[], columns: number): DesignSpec[][] => {
  const cols: DesignSpec[][] = Array.from({ length: columns }, () => []);
  const colHeights: number[] = Array(columns).fill(0);

  specs.forEach((spec) => {
    const height = estimateCardHeight(spec);
    const shortestColIndex = colHeights.indexOf(Math.min(...colHeights));
    cols[shortestColIndex].push(spec);
    colHeights[shortestColIndex] += height + 24;
  });

  return cols;
};

const CardWall = ({ specs, onSpecChange }: CardWallProps) => {
  const [copied, setCopied] = useState(false);
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const [activeFontDropdown, setActiveFontDropdown] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [fontFadeKey, setFontFadeKey] = useState(0);
  const [columnCount, setColumnCount] = useState(2);
  const hideTooltipTimer = useRef<number | null>(null);
  const pickerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setColumnCount(width < 700 ? 1 : 2);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [specs]);

  const columns = useMemo(() => masonryLayout(specs, columnCount), [specs, columnCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeColorPicker && pickerRefs.current[activeColorPicker]) {
        const picker = pickerRefs.current[activeColorPicker];
        if (picker && !picker.contains(e.target as Node)) {
          setActiveColorPicker(null);
        }
      }
      if (activeFontDropdown && dropdownRefs.current[activeFontDropdown]) {
        const dropdown = dropdownRefs.current[activeFontDropdown];
        if (dropdown && !dropdown.contains(e.target as Node)) {
          setActiveFontDropdown(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeColorPicker, activeFontDropdown]);

  const handleTooltipEnter = (tooltipId: string) => {
    if (hideTooltipTimer.current) {
      clearTimeout(hideTooltipTimer.current);
      hideTooltipTimer.current = null;
    }
    setActiveTooltip(tooltipId);
  };

  const handleTooltipLeave = () => {
    if (hideTooltipTimer.current) {
      clearTimeout(hideTooltipTimer.current);
    }
    hideTooltipTimer.current = window.setTimeout(() => {
      setActiveTooltip(null);
      hideTooltipTimer.current = null;
    }, 200);
  };

  const handleColorChange = (specId: string, colorIndex: number, newValue: string) => {
    const updated = specs.map(spec => {
      if (spec.id === specId && spec.colors) {
        const newColors = [...spec.colors];
        newColors[colorIndex] = { ...newColors[colorIndex], value: newValue };
        return { ...spec, colors: newColors };
      }
      return spec;
    });
    onSpecChange(updated);
  };

  const handleFontChange = (specId: string, fontType: 'heading' | 'body', newFont: string) => {
    const updated = specs.map(spec => {
      if (spec.id === specId && spec.fonts) {
        return {
          ...spec,
          fonts: {
            ...spec.fonts,
            [fontType]: newFont
          }
        };
      }
      return spec;
    });
    onSpecChange(updated);
    setActiveFontDropdown(null);
    setFontFadeKey(prev => prev + 1);
  };

  const handleExportJSON = () => {
    const jsonData = exportToJSON(specs);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-spec-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCSS = async () => {
    const cssVars = exportToCSSVars(specs);
    try {
      await navigator.clipboard.writeText(cssVars);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  if (specs.length === 0) {
    return (
      <div style={emptyStateStyle}>
        <div style={emptyIconStyle}>🎨</div>
        <h2 style={emptyTitleStyle}>开始生成设计规范</h2>
        <p style={emptyDescStyle}>在左侧输入项目信息并选择风格，点击"生成规范"按钮</p>
      </div>
    );
  }

  const renderCard = (spec: DesignSpec, index: number) => (
    <div
      key={spec.id}
      className="card"
      style={{
        animation: `fadeInUp 0.3s ease ${index * 0.05}s both`,
      }}
    >
      <h3 style={cardTitleStyle}>{spec.title}</h3>
      
      {spec.type === 'colors' && spec.colors && (
        <div style={colorContainerStyle}>
          {spec.colors.map((color: ColorSwatch, colorIndex: number) => {
            const tooltipId = `${spec.id}-${colorIndex}`;
            return (
              <div key={colorIndex} style={colorWrapperStyle}>
                <div
                  className="color-swatch"
                  style={{
                    backgroundColor: color.value,
                  }}
                  onClick={() => setActiveColorPicker(
                    activeColorPicker === tooltipId 
                      ? null 
                      : tooltipId
                  )}
                  onMouseEnter={() => handleTooltipEnter(tooltipId)}
                  onMouseLeave={handleTooltipLeave}
                >
                  <span 
                    className="color-value"
                    style={{
                      color: isLightColor(color.value) ? '#212529' : '#ffffff',
                    }}
                  >
                    {color.value}
                  </span>
                  <span className={`color-tooltip ${activeTooltip === tooltipId ? 'visible' : ''}`}>
                    {color.value}
                  </span>
                </div>
                <span style={colorLabelStyle}>{color.name}</span>
                
                {activeColorPicker === tooltipId && (
                  <div
                    ref={el => pickerRefs.current[tooltipId] = el}
                    style={colorPickerStyle}
                  >
                    <div style={pickerHeaderStyle}>
                      <span>选择颜色</span>
                    </div>
                    <input
                      type="color"
                      value={color.value}
                      onChange={(e) => handleColorChange(spec.id, colorIndex, e.target.value)}
                      style={colorInputStyle}
                    />
                    <input
                      type="text"
                      value={color.value}
                      onChange={(e) => handleColorChange(spec.id, colorIndex, e.target.value)}
                      style={colorTextInputStyle}
                      placeholder="#RRGGBB"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {spec.type === 'fonts' && spec.fonts && (
        <div key={fontFadeKey} style={{ animation: 'fadeIn 0.2s ease' }}>
          <div style={{ ...fontSectionStyle, marginBottom: '20px' }}>
            <div style={fontRowStyle}>
              <span style={fontLabelStyle}>标题字体</span>
              <div ref={el => dropdownRefs.current[`${spec.id}-heading`] = el} style={{ position: 'relative' }}>
                <button
                  onClick={() => setActiveFontDropdown(
                    activeFontDropdown === `${spec.id}-heading` 
                      ? null 
                      : `${spec.id}-heading`
                  )}
                  className="font-select-button"
                >
                  {spec.fonts.heading} ▾
                </button>
                {activeFontDropdown === `${spec.id}-heading` && (
                  <div style={dropdownMenuStyle}>
                    {getAlternativeFonts('heading').map((font) => (
                      <div
                        key={font}
                        onClick={() => handleFontChange(spec.id, 'heading', font)}
                        className={`dropdown-item ${font === spec.fonts?.heading ? 'active' : ''}`}
                      >
                        {font}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p style={{
              ...fontPreviewStyle,
              fontFamily: spec.fonts.headingStack || `'${spec.fonts.heading}', ${spec.fonts.fallback}`,
            }}>
              设计改变世界
            </p>
          </div>

          <div style={fontSectionStyle}>
            <div style={fontRowStyle}>
              <span style={fontLabelStyle}>正文字体</span>
              <div ref={el => dropdownRefs.current[`${spec.id}-body`] = el} style={{ position: 'relative' }}>
                <button
                  onClick={() => setActiveFontDropdown(
                    activeFontDropdown === `${spec.id}-body` 
                      ? null 
                      : `${spec.id}-body`
                  )}
                  className="font-select-button"
                >
                  {spec.fonts.body} ▾
                </button>
                {activeFontDropdown === `${spec.id}-body` && (
                  <div style={dropdownMenuStyle}>
                    {getAlternativeFonts('body').map((font) => (
                      <div
                        key={font}
                        onClick={() => handleFontChange(spec.id, 'body', font)}
                        className={`dropdown-item ${font === spec.fonts?.body ? 'active' : ''}`}
                      >
                        {font}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p style={{
              ...fontPreviewStyle,
              fontFamily: spec.fonts.bodyStack || `'${spec.fonts.body}', ${spec.fonts.fallback}`,
              fontSize: '16px',
              fontWeight: 400,
            }}>
              优秀的设计是显而易见的。伟大的设计是透明的。
            </p>
          </div>
        </div>
      )}

      {spec.type === 'typography' && spec.typography && (
        <div style={typographyContainerStyle}>
          {spec.typography.map((level: TypographyLevel) => (
            <div key={level.tag} style={typeLevelStyle}>
              {createElement(level.tag, {
                style: {
                  ...typeStyle,
                  fontSize: `${level.fontSize}rem`,
                  fontWeight: level.fontWeight,
                  lineHeight: level.lineHeight,
                  letterSpacing: `${level.letterSpacing}em`,
                },
              }, getTypeSample(level.tag))}
              <span style={typeMetaStyle}>
                {level.tag.toUpperCase()} · {level.fontSize}rem · {level.fontWeight}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={containerStyle} ref={containerRef}>
      <div style={exportBarStyle}>
        <button 
          onClick={handleExportJSON}
          className="export-button"
        >
          导出 JSON
        </button>
        <button 
          onClick={handleCopyCSS}
          className={`export-button ${copied ? 'copy-success' : ''}`}
        >
          {copied ? '✓ 已复制' : '复制 CSS 变量'}
        </button>
      </div>

      {columnCount === 1 ? (
        <div className="card-grid">
          <div className="card-grid-column">
            {specs.map((spec, i) => renderCard(spec, i))}
          </div>
        </div>
      ) : (
        <div className="card-grid">
          {columns.map((column, colIndex) => (
            <div key={colIndex} className="card-grid-column">
              {column.map((spec, i) => renderCard(spec, colIndex * 10 + i))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const isLightColor = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

const getTypeSample = (tag: string): string => {
  const samples: Record<string, string> = {
    h1: '主标题 Heading 1',
    h2: '次级标题 Heading 2',
    h3: '三级标题 Heading 3',
    h4: '四级标题 Heading 4',
    h5: '五级标题 Heading 5',
    h6: '六级标题 Heading 6',
  };
  return samples[tag] || tag;
};

const containerStyle: React.CSSProperties = {
  width: '80%',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '40px 0',
};

const exportBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginBottom: '24px',
  justifyContent: 'flex-end',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#212529',
  marginBottom: '20px',
};

const colorContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '16px',
};

const colorWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
};

const colorLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#6c757d',
};

const colorPickerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '70px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '280px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
  padding: '16px',
  zIndex: 10,
  animation: 'fadeIn 0.15s ease',
};

const pickerHeaderStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#495057',
  marginBottom: '12px',
};

const colorInputStyle: React.CSSProperties = {
  width: '100%',
  height: '60px',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  marginBottom: '12px',
};

const colorTextInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #dee2e6',
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: 'monospace',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const fontSectionStyle: React.CSSProperties = {
  marginBottom: 0,
};

const fontRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};

const fontLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6c757d',
  fontWeight: 500,
};

const dropdownMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: '4px',
  backgroundColor: '#ffffff',
  border: '1px solid #dee2e6',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  maxHeight: '240px',
  overflowY: 'auto',
  zIndex: 10,
  minWidth: '180px',
};

const fontPreviewStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#212529',
  margin: 0,
  lineHeight: 1.3,
};

const typographyContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const typeLevelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const typeStyle: React.CSSProperties = {
  margin: 0,
  color: '#212529',
};

const typeMetaStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#adb5bd',
};

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '60vh',
  textAlign: 'center',
};

const emptyIconStyle: React.CSSProperties = {
  fontSize: '64px',
  marginBottom: '24px',
};

const emptyTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 600,
  color: '#212529',
  marginBottom: '8px',
};

const emptyDescStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#6c757d',
  maxWidth: '400px',
};

export default CardWall;
