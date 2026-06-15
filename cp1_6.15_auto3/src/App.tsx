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
    const hue = (angle / 360) * 360;
    return `linear-gradient(90deg, 
      hsl(${hue}, 70%, 50%) 0%, 
      hsl(${(hue + 60) % 360}, 70%, 50%) 50%, 
      hsl(${(hue + 120) % 360}, 70%, 50%) 100%)`;
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
  const commentRegex = /\/\*[\s\S]*?\*\//g;
  const selectorRegex = /^(\.[\w-]+)/;
  const propertyRegex = /([\w-]+):/g;
  const colorRegex = /(#[0-9A-Fa-f]{6})/g;
  const valueRegex = /linear-gradient|radial-gradient|deg/g;

  let result: React.ReactNode = content;

  result = replaceWithHighlight(result, commentRegex, (match) => (
    <span key={match} style={{ color: '#6A9955' }}>{match}</span>
  ));

  result = replaceWithHighlight(result, selectorRegex, (match) => (
    <span key={match} style={{ color: '#DCDCAA' }}>{match}</span>
  ));

  result = replaceWithHighlight(result, propertyRegex, (match) => (
    <span key={match} style={{ color: '#9CDCFE' }}>{match}</span>
  ));

  result = replaceWithHighlight(result, valueRegex, (match) => (
    <span key={match} style={{ color: '#CE9178' }}>{match}</span>
  ));

  result = replaceWithHighlight(result, colorRegex, (match) => (
    <span key={match} style={{ color: '#C586C0' }}>{match}</span>
  ));

  return result;
}

function replaceWithHighlight(
  node: React.ReactNode,
  regex: RegExp,
  highlight: (match: string) => React.ReactNode
): React.ReactNode {
  if (typeof node !== 'string') return node;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  regex.lastIndex = 0;
  while ((match = regex.exec(node)) !== null) {
    if (match.index > lastIndex) {
      parts.push(node.slice(lastIndex, match.index));
    }
    parts.push(highlight(match[0]));
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < node.length) {
    parts.push(node.slice(lastIndex));
  }

  return parts.length > 0 ? parts : node;
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
    alignItems: 'center',
    gap: '16px',
    padding: '12px',
    borderRadius: '10px',
    background: 'rgba(45, 45, 48, 0.6)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid rgba(62, 62, 62, 0.3)'
  },
  presetPreview: {
    width: '80px',
    height: '40px',
    borderRadius: '6px',
    flexShrink: 0
  },
  presetInfo: {
    flex: 1,
    minWidth: 0
  },
  presetName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#D4D4D4',
    marginBottom: '4px'
  },
  presetMeta: {
    fontSize: '12px',
    color: '#858585'
  },
  loadingText: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#858585',
    fontSize: '14px'
  }
};

export default App;
