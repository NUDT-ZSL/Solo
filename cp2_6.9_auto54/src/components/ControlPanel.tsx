import type { ChangeEvent } from 'react'
import type { WordItem, ColorTheme, BgColor, FontFamily } from '../App'

interface ControlPanelProps {
  text: string
  setText: (t: string) => void
  fontFamily: FontFamily
  setFontFamily: (f: FontFamily) => void
  colorTheme: ColorTheme
  setColorTheme: (c: ColorTheme) => void
  bgColor: BgColor
  setBgColor: (b: BgColor) => void
  wordSpacing: number
  setWordSpacing: (s: number) => void
  selectedWord: WordItem | null
  onGenerate: () => void
  onToggleLock: () => void
  onExportPNG: () => void
}

const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'SimSun', label: '宋体' },
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
]

const THEME_OPTIONS: { value: ColorTheme; label: string; colors: string[] }[] = [
  { value: 'rainbow', label: '彩虹渐变', colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'] },
  { value: 'warmCool', label: '冷暖渐变', colors: ['#ff4444', '#ff8866', '#ffcc99', '#6699cc', '#4466aa', '#224488'] },
  { value: 'deepBlue', label: '单色深蓝', colors: ['#1a365d', '#234e7a', '#2c5282', '#2b6cb0', '#3182ce', '#4299e1'] },
  { value: 'neon', label: '随机霓虹', colors: ['#ff00ff', '#00ffff', '#ff0080', '#80ff00', '#ffff00', '#8000ff'] },
]

const BG_OPTIONS: { value: BgColor; label: string; preview: React.CSSProperties }[] = [
  { value: 'white', label: '白色', preview: { backgroundColor: '#ffffff' } },
  { value: 'lightGray', label: '浅灰', preview: { backgroundColor: '#f0f0f0' } },
  { value: 'dark', label: '深色', preview: { backgroundColor: '#2c3e50' } },
  { value: 'starry', label: '星空渐变', preview: { background: 'linear-gradient(135deg, #0c0c1e 0%, #1a1a3e 50%, #2c3e50 100%)' } },
]

const ControlPanel = ({
  text,
  setText,
  fontFamily,
  setFontFamily,
  colorTheme,
  setColorTheme,
  bgColor,
  setBgColor,
  wordSpacing,
  setWordSpacing,
  selectedWord,
  onGenerate,
  onToggleLock,
}: ControlPanelProps) => {
  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value.slice(0, 500))
  }

  const handleExport = () => {
    if (typeof (window as any).__exportWordCloudPNG === 'function') {
      ;(window as any).__exportWordCloudPNG()
    }
  }

  return (
    <div style={styles.panel}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>文本输入</h3>
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="请输入或粘贴文本（最多500字），支持中英文混合..."
          style={styles.textarea}
          rows={6}
        />
        <div style={styles.charCount}>
          <span>{text.length}/500</span>
        </div>
        <button onClick={onGenerate} style={styles.generateButton}>
          生成词云
        </button>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>字体</h3>
        <div style={styles.optionGrid}>
          {FONT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFontFamily(opt.value)}
              style={{
                ...styles.optionButton,
                fontFamily: opt.value,
                ...(fontFamily === opt.value ? styles.optionButtonActive : {}),
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>颜色主题</h3>
        <div style={styles.themeGrid}>
          {THEME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setColorTheme(opt.value)}
              style={{
                ...styles.themeButton,
                ...(colorTheme === opt.value ? styles.themeButtonActive : {}),
              }}
            >
              <div style={styles.colorPreview}>
                {opt.colors.map((c, i) => (
                  <div key={i} style={{ ...styles.colorDot, backgroundColor: c }} />
                ))}
              </div>
              <span style={styles.themeLabel}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>背景颜色</h3>
        <div style={styles.optionGrid}>
          {BG_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setBgColor(opt.value)}
              style={{
                ...styles.bgButton,
                ...opt.preview,
                ...(bgColor === opt.value ? styles.optionButtonActive : {}),
              }}
              title={opt.label}
            >
              <span style={{
                ...styles.bgButtonLabel,
                color: opt.value === 'white' || opt.value === 'lightGray' ? '#333' : '#fff',
              }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>词间距: {wordSpacing}px</h3>
        <input
          type="range"
          min="0"
          max="20"
          value={wordSpacing}
          onChange={(e) => setWordSpacing(parseInt(e.target.value))}
          style={styles.slider}
        />
        <div style={styles.sliderLabels}>
          <span>0</span>
          <span>10</span>
          <span>20</span>
        </div>
      </div>

      {selectedWord && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>词语信息</h3>
          <div style={styles.infoCard}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>词语:</span>
              <span style={{ ...styles.infoValue, fontWeight: 600, fontSize: '18px' }}>
                {selectedWord.text}
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>词频:</span>
              <span style={styles.infoValue}>{selectedWord.count} 次</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>字体大小:</span>
              <span style={styles.infoValue}>{selectedWord.size}px</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>位置 X:</span>
              <span style={styles.infoValue}>{Math.round(selectedWord.x)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>位置 Y:</span>
              <span style={styles.infoValue}>{Math.round(selectedWord.y)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>状态:</span>
              <span style={{
                ...styles.infoValue,
                color: selectedWord.locked ? '#e74c3c' : '#27ae60',
                fontWeight: 500,
              }}>
                {selectedWord.locked ? '已锁定' : '可拖拽'}
              </span>
            </div>
            <button
              onClick={onToggleLock}
              style={{
                ...styles.lockButton,
                backgroundColor: selectedWord.locked ? '#e74c3c' : '#27ae60',
              }}
            >
              {selectedWord.locked ? '解锁该词' : '锁定该词'}
            </button>
          </div>
        </div>
      )}

      <div style={styles.section}>
        <button onClick={handleExport} style={styles.exportPanelButton}>
          导出为 PNG (2x)
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '15px',
    padding: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#2c3e50',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '2px solid #ecf0f1',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
  charCount: {
    textAlign: 'right',
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
    marginBottom: '10px',
  },
  generateButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  optionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  optionButton: {
    padding: '10px 12px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
    color: '#333',
  },
  optionButtonActive: {
    borderColor: '#3498db',
    backgroundColor: '#ebf5fb',
    color: '#2980b9',
    fontWeight: 600,
  },
  themeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  themeButton: {
    padding: '10px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },
  themeButtonActive: {
    borderColor: '#3498db',
    backgroundColor: '#ebf5fb',
  },
  colorPreview: {
    display: 'flex',
    gap: '3px',
  },
  colorDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
  },
  themeLabel: {
    fontSize: '12px',
    color: '#555',
  },
  bgButton: {
    padding: '12px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    minHeight: '44px',
  },
  bgButtonLabel: {
    fontSize: '13px',
    fontWeight: 500,
    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: '#ddd',
    outline: 'none',
    cursor: 'pointer',
    accentColor: '#3498db',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#999',
    marginTop: '4px',
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid #e9ecef',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  infoLabel: {
    color: '#666',
    fontSize: '13px',
  },
  infoValue: {
    color: '#2c3e50',
    fontSize: '14px',
  },
  lockButton: {
    width: '100%',
    padding: '10px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'all 0.2s ease',
  },
  exportPanelButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#9b59b6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}

export default ControlPanel
