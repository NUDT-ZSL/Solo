import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import GradientPreview from './GradientPreview';
import ColorStopEditor from './ColorStopEditor';
import { ColorStop, GradientType, generateGradientCss, generateRandomColor } from './logic/colorUtils';
import { generateBackgroundCss, formatCodeWithLineNumbers } from './logic/cssGenerator';

interface GradientPreset {
  id: string;
  name: string;
  colorStops: ColorStop[];
  angle: number;
  type: 'linear' | 'radial';
}

const App: React.FC = () => {
  const [colorStops, setColorStops] = useState<ColorStop[]>([
    { id: uuidv4(), color: '#FF6B6B', position: 0 },
    { id: uuidv4(), color: '#4ECDC4', position: 100 }
  ]);
  const [angle, setAngle] = useState<number>(90);
  const [gradientType, setGradientType] = useState<GradientType>('linear');
  const [presets, setPresets] = useState<GradientPreset[]>([]);
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [loadingPresets, setLoadingPresets] = useState<boolean>(false);
  const [typeChanging, setTypeChanging] = useState<boolean>(false);

  const cssCode = useMemo(() => {
    return generateBackgroundCss(colorStops, angle, gradientType);
  }, [colorStops, angle, gradientType]);

  const gradientStyle = useMemo(() => {
    return generateGradientCss(colorStops, angle, gradientType);
  }, [colorStops, angle, gradientType]);

  const codeLines = useMemo(() => formatCodeWithLineNumbers(cssCode), [cssCode]);

  const fetchPresets = useCallback(async () => {
    setLoadingPresets(true);
    try {
      const response = await fetch('/api/presets');
      const result = await response.json();
      if (result.success) {
        setPresets(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    } finally {
      setLoadingPresets(false);
    }
  }, []);

  const handleLoadPresetsClick = () => {
    if (presets.length === 0) {
      fetchPresets();
    }
    setShowPresets(true);
  };

  const handleApplyPreset = (preset: GradientPreset) => {
    setColorStops(preset.colorStops.map(s => ({ ...s, id: uuidv4() })));
    setAngle(preset.angle);
    setGradientType(preset.type);
    setShowPresets(false);
  };

  const handleAddColorStop = () => {
    const newColor = generateRandomColor();
    const newPosition = colorStops.length > 0
      ? Math.min(100, Math.max(0, colorStops[colorStops.length - 1].position + 20))
      : 50;
    const newStop: ColorStop = {
      id: uuidv4(),
      color: newColor,
      position: newPosition > 100 ? 100 : newPosition
    };
    setColorStops([...colorStops, newStop]);
  };

  const handleRemoveColorStop = (id: string) => {
    if (colorStops.length > 2) {
      setColorStops(colorStops.filter(s => s.id !== id));
    }
  };

  const handleUpdateColorStop = (id: string, updates: Partial<ColorStop>) => {
    setColorStops(colorStops.map(s =>
      s.id === id ? { ...s, ...updates } : s
    ));
  };

  const handleGradientTypeChange = (type: GradientType) => {
    if (type !== gradientType) {
      setTypeChanging(true);
      setGradientType(type);
      setTimeout(() => setTypeChanging(false), 400);
    }
  };

  const handleCopyCss = async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const angleSliderGradient = useMemo(() => {
    const hue1 = (angle % 360);
    const hue2 = ((angle + 90) % 360);
    const hue3 = ((angle + 180) % 360);
    const hue4 = ((angle + 270) % 360);
    return `linear-gradient(${angle}deg, 
      hsl(${hue1}, 75%, 55%) 0%, 
      hsl(${hue2}, 75%, 55%) 33%, 
      hsl(${hue3}, 75%, 55%) 66%, 
      hsl(${hue4}, 75%, 55%) 100%)`;
  }, [angle]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>CSS 渐变配色方案生成器</h1>
        <p style={styles.subtitle}>实时预览 · 拖拽调节 · 一键复制</p>
      </div>

      <div style={styles.mainLayout} className="app-main-layout">
        <div style={styles.leftPanel} className="app-left-panel">
          <div style={styles.panelCard}>
            <h3 style={styles.panelTitle}>渐变类型</h3>
            <div style={styles.typeButtons}>
              <button
                onClick={() => handleGradientTypeChange('linear')}
                style={{
                  ...styles.typeButton,
                  ...(gradientType === 'linear' ? styles.typeButtonActive : {})
                }}
              >
                线性渐变
              </button>
              <button
                onClick={() => handleGradientTypeChange('radial')}
                style={{
                  ...styles.typeButton,
                  ...(gradientType === 'radial' ? styles.typeButtonActive : {})
                }}
              >
                径向渐变
              </button>
            </div>
          </div>

          <div style={styles.panelCard}>
            <h3 style={styles.panelTitle}>
              色标编辑器
              <span style={styles.stopCount}>({colorStops.length})</span>
            </h3>
            <ColorStopEditor
              colorStops={colorStops}
              onUpdateStop={handleUpdateColorStop}
              onRemoveStop={handleRemoveColorStop}
              canRemove={colorStops.length > 2}
            />
            <button onClick={handleAddColorStop} style={styles.addButton}>
              <span style={styles.addIcon}>+</span> 添加色标
            </button>
          </div>

          {gradientType === 'linear' && (
            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>
                渐变角度
                <span style={styles.angleValue}>{angle}°</span>
              </h3>
              <div style={styles.sliderContainer}>
                <div
                  style={{
                    ...styles.sliderTrack,
                    background: angleSliderGradient
                  }}
                />
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  style={styles.angleSlider}
                />
              </div>
              <div style={styles.angleMarks}>
                <span>0°</span>
                <span>90°</span>
                <span>180°</span>
                <span>270°</span>
                <span>360°</span>
              </div>
            </div>
          )}

          <div style={styles.panelCard}>
            <h3 style={styles.panelTitle}>预设方案</h3>
            <button onClick={handleLoadPresetsClick} style={styles.presetButton}>
              {loadingPresets ? '加载中...' : '📋 加载预设'}
            </button>
          </div>
        </div>

        <div style={styles.rightPanel} className="app-right-panel">
          <GradientPreview
            gradientCss={gradientStyle}
            isAnimating={typeChanging}
          />

          <div style={styles.codeCard}>
            <div style={styles.codeHeader}>
              <h3 style={styles.codeTitle}>CSS 代码</h3>
              <button onClick={handleCopyCss} style={styles.copyButton}>
                {copied ? (
                  <>
                    <span style={styles.checkIcon}>✓</span>
                    <span>已复制</span>
                  </>
                ) : (
                  <span>复制</span>
                )}
              </button>
            </div>
            <div style={styles.codeBlock}>
              <div style={styles.codeLineNumbers}>
                {codeLines.map((line) => (
                  <div key={line.line} style={styles.lineNumber}>
                    {line.line}
                  </div>
                ))}
              </div>
              <pre style={styles.codeContent}>
                <code>
                  {codeLines.map((line) => (
                    <div key={line.line} style={styles.codeLine}>
                      {highlightSyntax(line.content)}
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {showPresets && (
        <div style={styles.modalOverlay} onClick={() => setShowPresets(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>选择预设方案</h3>
              <button onClick={() => setShowPresets(false)} style={styles.closeButton}>
                ×
              </button>
            </div>
            <div style={styles.presetList}>
              {presets.length === 0 && loadingPresets ? (
                <div style={styles.loadingText}>正在加载预设...</div>
              ) : presets.length === 0 ? (
                <div style={styles.loadingText}>暂无预设数据</div>
              ) : (
                presets.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    style={styles.presetItem}
                  >
                    <div
                      style={{
                        ...styles.presetPreview,
                        background: generateGradientCss(
                          preset.colorStops,
                          preset.angle,
                          preset.type
                        )
                      }}
                    />
                    <div style={styles.presetInfo}>
                      <div style={styles.presetName}>{preset.name}</div>
                      <div style={styles.presetMeta}>
                        {preset.type === 'linear' ? '线性' : '径向'} · {preset.angle}°
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function highlightSyntax(content: string): React.ReactNode {
  const colorRegex = /#[0-9A-Fa-f]{3,8}/g;
  const angleRegex = /-?\d+\.?\d*deg/g;
  const percentRegex = /\d+\.?\d*%/g;
  const funcRegex = /linear-gradient|radial-gradient|repeating-linear-gradient|repeating-radial-gradient/g;
  const propertyRegex = /[a-zA-Z-]+(?=:)/g;
  const selectorRegex = /\.[\w-]+/g;
  const braceRegex = /[{}]/g;
  const commentRegex = /\/\*[\s\S]*?\*\//g;

  const tokens: Array<{ type: string; value: string }> = [];
  let remaining = content;

  while (remaining.length > 0) {
    let matched = false;

    const commentMatch = remaining.match(commentRegex);
    if (commentMatch && commentMatch.index === 0) {
      tokens.push({ type: 'comment', value: commentMatch[0] });
      remaining = remaining.slice(commentMatch[0].length);
      matched = true;
      continue;
    }

    const funcMatch = remaining.match(funcRegex);
    if (funcMatch && funcMatch.index === 0) {
      tokens.push({ type: 'function', value: funcMatch[0] });
      remaining = remaining.slice(funcMatch[0].length);
      matched = true;
      continue;
    }

    const colorMatch = remaining.match(colorRegex);
    if (colorMatch && colorMatch.index === 0) {
      tokens.push({ type: 'color', value: colorMatch[0] });
      remaining = remaining.slice(colorMatch[0].length);
      matched = true;
      continue;
    }

    const angleMatch = remaining.match(angleRegex);
    if (angleMatch && angleMatch.index === 0) {
      tokens.push({ type: 'angle', value: angleMatch[0] });
      remaining = remaining.slice(angleMatch[0].length);
      matched = true;
      continue;
    }

    const percentMatch = remaining.match(percentRegex);
    if (percentMatch && percentMatch.index === 0) {
      tokens.push({ type: 'percent', value: percentMatch[0] });
      remaining = remaining.slice(percentMatch[0].length);
      matched = true;
      continue;
    }

    const propertyMatch = remaining.match(propertyRegex);
    if (propertyMatch && propertyMatch.index === 0) {
      tokens.push({ type: 'property', value: propertyMatch[0] });
      remaining = remaining.slice(propertyMatch[0].length);
      matched = true;
      continue;
    }

    const selectorMatch = remaining.match(selectorRegex);
    if (selectorMatch && selectorMatch.index === 0) {
      tokens.push({ type: 'selector', value: selectorMatch[0] });
      remaining = remaining.slice(selectorMatch[0].length);
      matched = true;
      continue;
    }

    const braceMatch = remaining.match(braceRegex);
    if (braceMatch && braceMatch.index === 0) {
      tokens.push({ type: 'brace', value: braceMatch[0] });
      remaining = remaining.slice(braceMatch[0].length);
      matched = true;
      continue;
    }

    if (!matched) {
      tokens.push({ type: 'plain', value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return tokens.map((token, index) => {
    switch (token.type) {
      case 'comment':
        return (
          <span key={index} style={{ color: '#6A9955', fontStyle: 'italic' }}>
            {token.value}
          </span>
        );
      case 'selector':
        return (
          <span key={index} style={{ color: '#DCDCAA', fontWeight: 700 }}>
            {token.value}
          </span>
        );
      case 'brace':
        return (
          <span key={index} style={{ color: '#FFD700', fontWeight: 600 }}>
            {token.value}
          </span>
        );
      case 'function':
        return (
          <span key={index} style={{ color: '#CE9178', fontWeight: 700 }}>
            {token.value}
          </span>
        );
      case 'property':
        return (
          <span key={index} style={{ color: '#9CDCFE', fontWeight: 600 }}>
            {token.value}
          </span>
        );
      case 'color':
        return (
          <span
            key={index}
            style={{
              color: '#C586C0',
              fontWeight: 700,
              background: `${token.value}33`,
              padding: '1px 4px',
              borderRadius: '3px',
              border: `1px solid ${token.value}77`,
              margin: '0 1px'
            }}
          >
            {token.value}
          </span>
        );
      case 'angle':
        return (
          <span key={index} style={{ color: '#4EC9B0', fontWeight: 700 }}>
            {token.value}
          </span>
        );
      case 'percent':
        return (
          <span key={index} style={{ color: '#B5CEA8', fontWeight: 600 }}>
            {token.value}
          </span>
        );
      default:
        return (
          <span key={index} style={{ color: '#D4D4D4' }}>
            {token.value}
          </span>
        );
    }
  });
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
    padding: '16px 0'
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#D4D4D4',
    marginBottom: '8px',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#858585'
  },
  mainLayout: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap'
  },
  leftPanel: {
    width: '40%',
    minWidth: '320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flex: '0 0 calc(40% - 12px)'
  },
  rightPanel: {
    width: '60%',
    minWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flex: '1 1 calc(60% - 12px)'
  },
  panelCard: {
    background: '#252526',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #3E3E3E',
    transition: 'all 0.2s ease'
  },
  panelTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#D4D4D4',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  stopCount: {
    fontSize: '12px',
    color: '#858585',
    fontWeight: 400
  },
  angleValue: {
    fontSize: '16px',
    color: '#4A90D9',
    fontWeight: 600,
    fontFamily: 'monospace'
  },
  typeButtons: {
    display: 'flex',
    gap: '12px'
  },
  typeButton: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    background: '#E0E0E0',
    color: '#333',
    transition: 'all 0.2s ease'
  },
  typeButtonActive: {
    background: '#4A90D9',
    color: '#fff'
  },
  addButton: {
    width: '100%',
    marginTop: '16px',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px dashed #3E3E3E',
    background: 'transparent',
    color: '#D4D4D4',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease'
  },
  addIcon: {
    fontSize: '18px',
    color: '#4A90D9'
  },
  presetButton: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #3E3E3E',
    background: '#2D2D30',
    color: '#D4D4D4',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  },
  sliderContainer: {
    position: 'relative',
    height: '24px',
    display: 'flex',
    alignItems: 'center'
  },
  sliderTrack: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: '8px',
    borderRadius: '4px',
    transform: 'translateY(-50%)',
    opacity: 0.9
  },
  angleSlider: {
    position: 'relative',
    width: '100%',
    height: '24px',
    appearance: 'none',
    background: 'transparent',
    cursor: 'pointer',
    zIndex: 1,
    outline: 'none'
  },
  angleMarks: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
    fontSize: '11px',
    color: '#858585'
  },
  codeCard: {
    background: '#252526',
    borderRadius: '12px',
    border: '1px solid #3E3E3E',
    overflow: 'hidden'
  },
  codeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #3E3E3E',
    background: '#2D2D30'
  },
  codeTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#D4D4D4'
  },
  copyButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #3E3E3E',
    background: '#3A3D41',
    color: '#D4D4D4',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease'
  },
  checkIcon: {
    color: '#4CAF50',
    fontWeight: 700
  },
  codeBlock: {
    display: 'flex',
    overflow: 'auto',
    maxHeight: '200px'
  },
  codeLineNumbers: {
    padding: '16px 12px',
    background: '#1E1E1E',
    borderRight: '1px solid #3E3E3E',
    userSelect: 'none',
    textAlign: 'right'
  },
  lineNumber: {
    fontFamily: "'Fira Code', 'Consolas', monospace",
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#858585'
  },
  codeContent: {
    flex: 1,
    padding: '16px 20px',
    margin: 0,
    fontFamily: "'Fira Code', 'Consolas', monospace",
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#D4D4D4',
    overflow: 'auto'
  },
  codeLine: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    background: '#FFFFFFB3',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  modalHeader: {
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(62, 62, 62, 0.3)',
    background: 'rgba(37, 37, 38, 0.5)'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1E1E1E'
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#1E1E1E',
    lineHeight: 1,
    padding: '0 8px',
    transition: 'all 0.2s ease'
  },
  presetList: {
    padding: '16px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  presetItem: {
    display: 'flex',
    alignItems: 'stretch',
    padding: '12px',
    borderRadius: '12px',
    background: 'rgba(37, 37, 38, 0.85)',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '1px solid rgba(62, 62, 62, 0.5)',
    flexDirection: 'column',
    gap: '12px'
  },
  presetPreview: {
    width: '100%',
    height: '56px',
    borderRadius: '8px',
    flexShrink: 0,
    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  presetInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '0 2px'
  },
  presetName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#D4D4D4'
  },
  presetMeta: {
    fontSize: '11px',
    color: '#858585',
    background: 'rgba(62, 62, 62, 0.4)',
    padding: '3px 8px',
    borderRadius: '10px',
    whiteSpace: 'nowrap',
    fontWeight: 500
  },
  loadingText: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#858585',
    fontSize: '14px'
  }
};

export default App;
