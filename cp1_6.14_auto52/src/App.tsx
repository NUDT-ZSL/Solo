import { useState, useCallback, useMemo, useEffect } from 'react'
import { ColorEditor, type ColorSlot } from './components/ColorEditor'
import { PreviewPanel } from './components/PreviewPanel'
import { ReferencePanel } from './components/ReferencePanel'
import { ExportModal } from './components/ExportModal'
import { generateShades } from './utils/colorUtils'
import './App.css'

const DEFAULT_COLORS: Omit<ColorSlot, 'shades'>[] = [
  { id: 'primary', name: '主色', hex: '#6366F1' },
  { id: 'secondary', name: '辅色', hex: '#F472B6' },
  { id: 'neutral', name: '中性色', hex: '#64748B' },
  { id: 'success', name: '成功色', hex: '#22C55E' },
  { id: 'warning', name: '警告色', hex: '#F59E0B' },
  { id: 'error', name: '错误色', hex: '#EF4444' },
]

function createInitialSlots(): ColorSlot[] {
  return DEFAULT_COLORS.map(c => ({
    ...c,
    shades: generateShades(c.hex),
  }))
}

function App() {
  const [slots, setSlots] = useState<ColorSlot[]>(createInitialSlots)
  const [activeSlotId, setActiveSlotId] = useState('primary')
  const [darkMode, setDarkMode] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)

  const handleSlotChange = useCallback((slotId: string, hex: string) => {
    setSlots(prev =>
      prev.map(slot =>
        slot.id === slotId
          ? { ...slot, hex, shades: generateShades(hex) }
          : slot
      )
    )
  }, [])

  const handleActiveSlotChange = useCallback((slotId: string) => {
    setActiveSlotId(slotId)
  }, [])

  const handleExport = useCallback(() => {
    setExportModalOpen(true)
  }, [])

  const handleCloseExport = useCallback(() => {
    setExportModalOpen(false)
  }, [])

  const handleDarkModeChange = useCallback((dark: boolean) => {
    setDarkMode(dark)
  }, [])

  const slotMap = useMemo(() => {
    const map: Record<string, ColorSlot> = {}
    slots.forEach(s => {
      map[s.id] = s
    })
    return map
  }, [slots])

  useEffect(() => {
    const style = document.documentElement.style
    const addVars = (prefix: string, shades: string[]) => {
      shades.forEach((shade, i) => {
        style.setProperty(`--color-${prefix}-${i * 100 + 50}`, shade)
      })
    }
    addVars('primary', slotMap.primary?.shades || [])
    addVars('secondary', slotMap.secondary?.shades || [])
    addVars('neutral', slotMap.neutral?.shades || [])
    addVars('success', slotMap.success?.shades || [])
    addVars('warning', slotMap.warning?.shades || [])
    addVars('error', slotMap.error?.shades || [])
  }, [slotMap])

  return (
    <div className="app-container">
      <ColorEditor
        slots={slots}
        activeSlotId={activeSlotId}
        onSlotChange={handleSlotChange}
        onActiveSlotChange={handleActiveSlotChange}
        onExport={handleExport}
      />

      <PreviewPanel
        primaryShades={slotMap.primary?.shades || []}
        secondaryShades={slotMap.secondary?.shades || []}
        neutralShades={slotMap.neutral?.shades || []}
        successShades={slotMap.success?.shades || []}
        warningShades={slotMap.warning?.shades || []}
        errorShades={slotMap.error?.shades || []}
        darkMode={darkMode}
        onDarkModeChange={handleDarkModeChange}
      />

      <ReferencePanel
        primary={slotMap.primary?.shades || []}
        secondary={slotMap.secondary?.shades || []}
        neutral={slotMap.neutral?.shades || []}
        success={slotMap.success?.shades || []}
        warning={slotMap.warning?.shades || []}
        error={slotMap.error?.shades || []}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={handleCloseExport}
        primary={slotMap.primary?.shades || []}
        secondary={slotMap.secondary?.shades || []}
        neutral={slotMap.neutral?.shades || []}
        success={slotMap.success?.shades || []}
        warning={slotMap.warning?.shades || []}
        error={slotMap.error?.shades || []}
      />

      <div className="screen-too-small">
        <div>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>🖥️</div>
          <div>需要更大屏幕</div>
          <div style={{ fontSize: '13px', marginTop: '6px', color: '#9ca3af' }}>
            请在宽度大于 960px 的设备上使用 ChromaChord
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
