import React, { useState, useMemo, useRef, useCallback } from 'react';
import StampCanvas, { StampCanvasHandle } from './components/StampCanvas';
import StampPreview from './components/StampPreview';
import {
  BorderConfig,
  BorderShape,
  PathData,
  TextConfig,
  StampData,
  COLOR_PALETTE,
  CHINESE_FONTS,
  generateFullSVG,
  generateArcTextSVG,
  extractImageContours,
  CANVAS_SIZE,
} from './utils/stampProcessor';

type SimplificationLevel = 'low' | 'medium' | 'high';

const BORDER_SHAPES: { value: BorderShape; label: string; icon: string }[] = [
  { value: 'circle', label: '圆形', icon: '●' },
  { value: 'ellipse', label: '椭圆', icon: '⬭' },
  { value: 'rectangle', label: '矩形', icon: '▭' },
  { value: 'hexagon', label: '六边形', icon: '⬡' },
];

const App: React.FC = () => {
  const canvasRef = useRef<StampCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paths, setPaths] = useState<PathData[]>([]);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [scale, setScale] = useState(100);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [simplification, setSimplification] = useState<SimplificationLevel>('medium');
  const [activeSection, setActiveSection] = useState<'draw' | 'border' | 'text'>('draw');

  const [border, setBorder] = useState<BorderConfig>({
    shape: 'circle',
    color: '#C0392B',
    strokeWidth: 4,
    width: 360,
    height: 360,
  });

  const [textConfig, setTextConfig] = useState<TextConfig>({
    text: '印迹工坊',
    font: CHINESE_FONTS[0].value,
    color: '#C0392B',
    fontSize: 22,
  });

  const textSVG = useMemo(() => {
    return generateArcTextSVG(textConfig, border);
  }, [textConfig, border]);

  const stampData: StampData = useMemo(
    () => ({ paths, border, text: textConfig }),
    [paths, border, textConfig]
  );

  const fullSVG = useMemo(() => generateFullSVG(stampData), [stampData]);

  const handlePathsChange = useCallback((newPaths: PathData[]) => {
    setPaths(newPaths);
  }, []);

  const handleUndo = () => {
    if (paths.length > 0) {
      setPaths(paths.slice(0, -1));
    }
  };

  const handleClear = () => {
    canvasRef.current?.clearCanvas();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress('正在处理图片...');

    try {
      const result = await Promise.race([
        extractImageContours(file, simplification),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('处理超时')), 2000)
        ),
      ]);

      if (result.length > 0) {
        setPaths(prev => [...prev, ...result]);
        setUploadProgress(`成功提取 ${result.length} 条轮廓`);
      } else {
        setUploadProgress('未检测到有效轮廓');
      }
    } catch (err) {
      setUploadProgress('处理失败：' + (err as Error).message);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress('');
      }, 2000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const SectionHeader: React.FC<{
    id: 'draw' | 'border' | 'text';
    icon: string;
    label: string;
  }> = ({ id, icon, label }) => (
    <button
      onClick={() => setActiveSection(prev => (prev === id ? 'draw' : id))}
      style={{
        ...styles.sectionHeader,
        background: activeSection === id ? '#FDF1E4' : '#FFFFFF',
      }}
    >
      <span style={styles.sectionIcon}>{icon}</span>
      <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, color: '#3D2914' }}>
        {label}
      </span>
      <span style={{ transform: activeSection === id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', color: '#8B7355' }}>
        ▼
      </span>
    </button>
  );

  const ColorPicker: React.FC<{ value: string; onChange: (c: string) => void }> = ({ value, onChange }) => (
    <div style={styles.colorPalette}>
      {COLOR_PALETTE.map(color => (
        <button
          key={color}
          onClick={() => onChange(color)}
          style={{
            ...styles.colorDot,
            background: color,
            outline: value === color ? '3px solid #3D2914' : '2px solid transparent',
            outlineOffset: value === color ? 2 : 0,
          }}
          aria-label={`选择颜色 ${color}`}
        />
      ))}
    </div>
  );

  return (
    <div style={styles.pageWrapper}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>印迹工坊</h1>
        <p style={styles.headerSubtitle}>✦ 个性化 SVG 印章/徽章生成器 ✦</p>
      </header>

      <div className="app-grid-container" style={styles.gridContainer}>
        {/* 左侧工具选项板 */}
        <aside className="app-sidebar fade-in" style={styles.sidebar}>
          <div style={styles.toolPanel}>
            {/* 手绘工具区 */}
            <SectionHeader id="draw" icon="✎" label="手绘与图片" />
            <div
              style={{
                ...styles.collapsibleContent,
                ...(activeSection === 'draw' ? styles.contentOpen : styles.contentClosed),
              }}
            >
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>笔触颜色</label>
                  <ColorPicker value={strokeColor} onChange={setStrokeColor} />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    笔触粗细: <span style={styles.valueHighlight}>{strokeWidth}px</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={strokeWidth}
                    onChange={e => setStrokeWidth(Number(e.target.value))}
                    style={styles.slider}
                  />
                </div>

                <div style={styles.rowButtons}>
                  <button style={styles.actionButton} onClick={handleUndo} disabled={paths.length === 0}>
                    ↶ 撤销 ({paths.length})
                  </button>
                  <button style={styles.dangerButton} onClick={handleClear} disabled={paths.length === 0}>
                    🗑 清空
                  </button>
                </div>

                <div className="section-divider" />

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>上传图片转SVG轮廓</label>
                  <button
                    style={styles.uploadButton}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? '⏳ 处理中...' : '📷 上传图片'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  {uploadProgress && (
                    <p style={{
                      ...styles.helperText,
                      color: uploadProgress.includes('失败') || uploadProgress.includes('未检测') ? '#E74C3C' : '#1E8449',
                    }}>
                      {uploadProgress}
                    </p>
                  )}
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>轮廓简化程度</label>
                  <div style={styles.threeButtons}>
                    {(['low', 'medium', 'high'] as SimplificationLevel[]).map(level => (
                      <button
                        key={level}
                        style={{
                          ...styles.levelButton,
                          ...(simplification === level ? styles.levelButtonActive : {}),
                        }}
                        onClick={() => setSimplification(level)}
                      >
                        {level === 'low' ? '低' : level === 'medium' ? '中' : '高'}
                      </button>
                    ))}
                  </div>
                  <p style={styles.helperText}>低=更简洁，高=保留更多细节</p>
                </div>
              </div>

            <div className="section-divider" />

            {/* 边框与形状 */}
            <SectionHeader id="border" icon="⬡" label="边框与形状" />
            <div
              style={{
                ...styles.collapsibleContent,
                ...(activeSection === 'border' ? styles.contentOpen : styles.contentClosed),
              }}
            >
              <div style={styles.fieldGroup}>
                <label style={styles.label}>印章形状</label>
                <div style={styles.shapeGrid}>
                  {BORDER_SHAPES.map(shape => (
                    <button
                      key={shape.value}
                      onClick={() =>
                        setBorder(prev => ({
                          ...prev,
                          shape: shape.value,
                          ...(shape.value === 'rectangle' ? { height: prev.height } : {}),
                        }))
                      }
                      style={{
                        ...styles.shapeButton,
                        ...(border.shape === shape.value ? styles.shapeButtonActive : {}),
                      }}
                    >
                      <span style={styles.shapeIcon}>{shape.icon}</span>
                      <span style={{ fontSize: 12 }}>{shape.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>边框颜色</label>
                <ColorPicker value={border.color} onChange={c => setBorder(prev => ({ ...prev, color: c }))} />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  边框粗细: <span style={styles.valueHighlight}>{border.strokeWidth}px</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={border.strokeWidth}
                  onChange={e => setBorder(prev => ({ ...prev, strokeWidth: Number(e.target.value) }))}
                  style={styles.slider}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  宽度: <span style={styles.valueHighlight}>{border.width}px</span>
                </label>
                <input
                  type="range"
                  min={CANVAS_SIZE * 0.4}
                  max={CANVAS_SIZE - 20}
                  value={border.width}
                  onChange={e => {
                    const w = Number(e.target.value);
                    setBorder(prev => ({
                      ...prev,
                      width: w,
                      height: prev.shape === 'circle' ? w : prev.height,
                    }));
                  }}
                  style={styles.slider}
                />
              </div>

              {border.shape === 'ellipse' || border.shape === 'rectangle' || border.shape === 'hexagon' ? (
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    高度: <span style={styles.valueHighlight}>{border.height}px</span>
                  </label>
                  <input
                    type="range"
                    min={CANVAS_SIZE * 0.3}
                    max={CANVAS_SIZE - 20}
                    value={border.height}
                    onChange={e => setBorder(prev => ({ ...prev, height: Number(e.target.value) }))}
                    style={styles.slider}
                  />
                </div>
              ) : null}
            </div>

            <div className="section-divider" />

            {/* 文字叠加 */}
            <SectionHeader id="text" icon="✒" label="文字叠加" />
            <div
              style={{
                ...styles.collapsibleContent,
                ...(activeSection === 'text' ? styles.contentOpen : styles.contentClosed),
              }}
            >
              <div style={styles.fieldGroup}>
                <label style={styles.label}>印章文字（最多8字）</label>
                <input
                  type="text"
                  value={textConfig.text}
                  onChange={e => setTextConfig(prev => ({ ...prev, text: e.target.value.slice(0, 8) }))}
                  placeholder="输入印章文字..."
                  style={styles.textInput}
                  maxLength={8}
                />
                <p style={styles.helperText}>
                  已输入 {Array.from(textConfig.text).length}/8 字
                </p>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>字体选择</label>
                <div style={styles.threeButtons}>
                  {CHINESE_FONTS.map(font => (
                    <button
                      key={font.value}
                      style={{
                        ...styles.levelButton,
                        fontFamily: font.value,
                        ...(textConfig.font === font.value ? styles.levelButtonActive : {}),
                      }}
                      onClick={() => setTextConfig(prev => ({ ...prev, font: font.value }))}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>文字颜色</label>
                <ColorPicker value={textConfig.color} onChange={c => setTextConfig(prev => ({ ...prev, color: c }))} />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>
                  字号: <span style={styles.valueHighlight}>{textConfig.fontSize}px</span>
                </label>
                <input
                  type="range"
                  min="14"
                  max="36"
                  value={textConfig.fontSize}
                  onChange={e => setTextConfig(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                  style={styles.slider}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* 中央画布区 */}
        <main style={styles.mainArea} className="fade-in">
          <StampCanvas
            ref={canvasRef}
            paths={paths}
            onPathsChange={handlePathsChange}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            border={border}
            textSVG={textSVG}
          />
          <p style={styles.canvasHint}>
            ✍ 在上方白色区域内自由绘制，或上传图片自动生成轮廓
          </p>
        </main>

        {/* 右侧预览区 */}
        <aside className="app-sidebar-right fade-in" style={{ ...styles.sidebar, width: 280 }}>
          <StampPreview
            svgContent={fullSVG}
            scale={scale}
            onScaleChange={setScale}
          />
        </aside>
      </div>

      <footer style={styles.footer}>
        <p>印迹工坊 © 2026 · 手绘 · 上传 · 一键生成专属印章</p>
      </footer>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  pageWrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 32px',
    maxWidth: 1440,
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 42,
    fontFamily: "'Ma Shan Zheng', cursive",
    color: '#922B21',
    letterSpacing: 8,
    textShadow: '2px 2px 4px rgba(146,43,33,0.2)',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B7355',
    letterSpacing: 2,
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '240px 1fr 280px',
    gap: 24,
    flex: 1,
    alignItems: 'start',
  },
  sidebar: {
    width: 240,
    position: 'sticky',
    top: 24,
  },
  toolPanel: {
    background: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  sectionHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 8px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 15,
  },
  sectionIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
    color: '#C0392B',
  },
  collapsibleContent: {
    overflow: 'hidden',
    transition: 'max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease',
  },
  contentOpen: {
    maxHeight: 2000,
    opacity: 1,
    paddingTop: 12,
  },
  contentClosed: {
    maxHeight: 0,
    opacity: 0,
    paddingTop: 0,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    color: '#5D4E3A',
    marginBottom: 8,
    fontWeight: 500,
  },
  valueHighlight: {
    color: '#C0392B',
    fontWeight: 600,
  },
  slider: {
    width: '100%',
  },
  colorPalette: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: 6,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: '2px solid rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    padding: 0,
  },
  rowButtons: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    padding: '8px 10px',
    fontSize: 12,
    background: '#F5E6C8',
    border: '1px solid #D4C4A8',
    borderRadius: 6,
    color: '#5D4E3A',
    fontWeight: 500,
  },
  dangerButton: {
    flex: 1,
    padding: '8px 10px',
    fontSize: 12,
    background: '#FADBD8',
    border: '1px solid #E6B0AA',
    borderRadius: 6,
    color: '#922B21',
    fontWeight: 500,
  },
  uploadButton: {
    width: '100%',
    padding: '10px 16px',
    fontSize: 13,
    background: 'linear-gradient(135deg, #2E86C1, #1B4F72)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 6,
    fontWeight: 500,
    boxShadow: '0 2px 8px rgba(46,134,193,0.25)',
  },
  helperText: {
    fontSize: 11,
    color: '#8B7355',
    marginTop: 6,
    lineHeight: 1.4,
  },
  threeButtons: {
    display: 'flex',
    gap: 6,
  },
  levelButton: {
    flex: 1,
    padding: '8px 6px',
    fontSize: 12,
    background: '#FAF4E8',
    border: '1px solid #E8D5B0',
    borderRadius: 6,
    color: '#5D4E3A',
    fontWeight: 500,
  },
  levelButtonActive: {
    background: '#C0392B',
    borderColor: '#C0392B',
    color: '#FFFFFF',
  },
  shapeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
  },
  shapeButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '10px 8px',
    background: '#FAF4E8',
    border: '2px solid #E8D5B0',
    borderRadius: 8,
    cursor: 'pointer',
    color: '#5D4E3A',
    transition: 'all 0.2s ease',
  },
  shapeButtonActive: {
    background: '#FDF1E4',
    borderColor: '#C0392B',
    color: '#922B21',
  },
  shapeIcon: {
    fontSize: 22,
    color: '#C0392B',
  },
  textInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '2px solid #E8D5B0',
    borderRadius: 6,
    outline: 'none',
    background: '#FFFCF5',
    fontFamily: 'inherit',
    color: '#3D2914',
  },
  mainArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  canvasHint: {
    marginTop: 16,
    fontSize: 13,
    color: '#8B7355',
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    marginTop: 40,
    padding: '20px 0',
    fontSize: 12,
    color: '#A69574',
    borderTop: '1px solid #E8D5B0',
  },
};

export default App;
