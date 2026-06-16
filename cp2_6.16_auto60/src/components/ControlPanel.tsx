import React, { useState } from 'react'
import { eventBus } from '@/utils/eventBus'
import { EventType, IWalletSettings, WalletStyle, StitchType, LEATHER_COLORS, TEXTURE_OPTIONS, STITCH_OPTIONS, STYLE_OPTIONS, WALLET_STYLE_NAMES, TEXTURE_NAMES, STITCH_NAMES } from '@/types'
import { useWallet } from '@/context/WalletContext'

const ControlPanel: React.FC = () => {
  const { settings, updateSettings } = useWallet()
  const [selectedColor, setSelectedColor] = useState(settings.color)
  const [selectedTexture, setSelectedTexture] = useState(settings.texture)
  const [selectedStitch, setSelectedStitch] = useState<StitchType>(settings.stitchType)
  const [selectedStyle, setSelectedStyle] = useState<WalletStyle>(settings.style)

  const emitSettingsChange = (newSettings: Partial<IWalletSettings>) => {
    const updated = { ...settings, ...newSettings }
    updateSettings(newSettings)
    eventBus.emit(EventType.SETTINGS_CHANGE, updated)
  }

  const handleColorClick = (color: string) => {
    setSelectedColor(color)
    emitSettingsChange({ color })
  }

  const handleTextureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const texture = e.target.value
    setSelectedTexture(texture)
    emitSettingsChange({ texture })
  }

  const handleStitchChange = (type: StitchType) => {
    setSelectedStitch(type)
    emitSettingsChange({ stitchType: type })
  }

  const handleStyleChange = (style: WalletStyle) => {
    setSelectedStyle(style)
    emitSettingsChange({ style })
  }

  const handleExport = () => {
    const exportEvent = new CustomEvent('exportSnapshot')
    window.dispatchEvent(exportEvent)
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>3D皮具定制工坊</h1>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>钱包款式</h3>
        <div style={styles.styleButtons}>
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStyleChange(option.value)}
              style={{
                ...styles.styleButton,
                ...(selectedStyle === option.value ? styles.styleButtonActive : {}),
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>皮革颜色</h3>
        <div style={styles.colorGrid}>
          {LEATHER_COLORS.map((color) => (
            <div
              key={color}
              onClick={() => handleColorClick(color)}
              style={{
                ...styles.colorSwatch,
                backgroundColor: color,
                ...(selectedColor === color ? styles.colorSwatchSelected : {}),
              }}
              onMouseEnter={(e) => {
                if (selectedColor !== color) {
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)'
                  ;(e.currentTarget as HTMLDivElement).style.border = '2px solid white'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedColor !== color) {
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'
                  ;(e.currentTarget as HTMLDivElement).style.border = 'none'
                }
              }}
            />
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>皮质纹理</h3>
        <select
          value={selectedTexture}
          onChange={handleTextureChange}
          style={styles.select}
        >
          {TEXTURE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>缝线样式</h3>
        <div style={styles.radioGroup}>
          {STITCH_OPTIONS.map((option) => (
            <label key={option.value} style={styles.radioLabel}>
              <input
                type="radio"
                name="stitchType"
                value={option.value}
                checked={selectedStitch === option.value}
                onChange={() => handleStitchChange(option.value)}
                style={styles.radioInput}
              />
              <span style={styles.radioText}>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={styles.paramsDisplay}>
        <span style={styles.paramsText}>
          款式：{WALLET_STYLE_NAMES[selectedStyle]} | 颜色：{selectedColor.toUpperCase()} | 纹理：{TEXTURE_NAMES[selectedTexture]} | 缝线：{STITCH_NAMES[selectedStitch]}
        </span>
      </div>

      <button
        onClick={handleExport}
        style={styles.exportButton}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
        }}
      >
        导出快照
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '340px',
    backgroundColor: '#252525',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxSizing: 'border-box',
    height: '100%',
    overflowY: 'auto',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#f0c040',
    margin: '0 0 8px 0',
    textAlign: 'center',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#cccccc',
    margin: '0',
  },
  styleButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  styleButton: {
    flex: 1,
    minWidth: '90px',
    padding: '8px 12px',
    backgroundColor: '#3a3a3a',
    color: '#e0e0e0',
    border: '1px solid #4a4a4a',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  },
  styleButtonActive: {
    backgroundColor: '#4a3a2a',
    borderColor: '#f0c040',
    color: '#f0c040',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '8px',
  },
  colorSwatch: {
    width: '30px',
    height: '30px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  },
  colorSwatchSelected: {
    transform: 'scale(1)',
    border: '3px solid #ffd700',
  },
  select: {
    padding: '10px 12px',
    backgroundColor: '#3a3a3a',
    color: '#e0e0e0',
    border: '1px solid #4a4a4a',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
    outline: 'none',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    transition: 'background-color 0.2s ease',
  },
  radioInput: {
    width: '16px',
    height: '16px',
    accentColor: '#f0c040',
    cursor: 'pointer',
  },
  radioText: {
    color: '#e0e0e0',
    fontSize: '14px',
  },
  paramsDisplay: {
    marginTop: 'auto',
    backgroundColor: '#2a2a3e',
    borderRadius: '8px',
    padding: '12px',
    minHeight: '40px',
  },
  paramsText: {
    fontFamily: "'Fira Code', monospace",
    fontSize: '14px',
    color: '#e0e0e0',
    lineHeight: 1.5,
    wordBreak: 'break-all',
  },
  exportButton: {
    width: '140px',
    height: '44px',
    alignSelf: 'flex-end',
    backgroundColor: '#e67e22',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(230, 126, 34, 0.4)',
    transition: 'all 0.2s ease',
    marginTop: '8px',
  },
}

export default ControlPanel
