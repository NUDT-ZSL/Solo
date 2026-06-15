import { useState, useCallback } from 'react'
import InkCanvas from './components/InkCanvas'
import ControlPanel from './components/ControlPanel'

export type ColorTheme = 'inkCyan' | 'cinnabar' | 'goldJade' | 'darkPurple' | 'moonWhite'

export interface ThemeColors {
  primary: string
  glow: string
  particle: string
  gold: string
}

export const THEMES: Record<ColorTheme, ThemeColors> = {
  inkCyan: {
    primary: 'rgba(20, 60, 80, 0.85)',
    glow: 'rgba(40, 140, 180, 0.6)',
    particle: 'rgba(60, 200, 240, 0.8)',
    gold: 'rgba(212, 175, 55, 0.6)',
  },
  cinnabar: {
    primary: 'rgba(120, 20, 20, 0.85)',
    glow: 'rgba(220, 60, 40, 0.6)',
    particle: 'rgba(255, 100, 70, 0.8)',
    gold: 'rgba(255, 215, 100, 0.6)',
  },
  goldJade: {
    primary: 'rgba(80, 70, 20, 0.85)',
    glow: 'rgba(212, 175, 55, 0.6)',
    particle: 'rgba(255, 230, 100, 0.8)',
    gold: 'rgba(255, 245, 180, 0.6)',
  },
  darkPurple: {
    primary: 'rgba(50, 20, 80, 0.85)',
    glow: 'rgba(140, 60, 200, 0.6)',
    particle: 'rgba(180, 100, 255, 0.8)',
    gold: 'rgba(220, 180, 255, 0.6)',
  },
  moonWhite: {
    primary: 'rgba(60, 70, 80, 0.85)',
    glow: 'rgba(180, 200, 220, 0.6)',
    particle: 'rgba(220, 235, 255, 0.8)',
    gold: 'rgba(200, 220, 240, 0.6)',
  },
}

export const THEME_LABELS: Record<ColorTheme, string> = {
  inkCyan: '墨青',
  cinnabar: '朱砂赤',
  goldJade: '金碧',
  darkPurple: '黛紫',
  moonWhite: '月白',
}

export default function App() {
  const [inkConcentration, setInkConcentration] = useState(5)
  const [brushSize, setBrushSize] = useState(8)
  const [diffusionSpeed, setDiffusionSpeed] = useState(1.0)
  const [colorTheme, setColorTheme] = useState<ColorTheme>('inkCyan')
  const [strokeLength, setStrokeLength] = useState(0)
  const [inkDotCount, setInkDotCount] = useState(0)
  const [resetTrigger, setResetTrigger] = useState(0)

  const handleReset = useCallback(() => {
    setResetTrigger((v) => v + 1)
    setStrokeLength(0)
    setInkDotCount(0)
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(160deg, #1a1a1a 0%, #0a0a0a 40%, #000000 100%)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Noto Serif SC", "SimSun", serif',
      }}
    >
      <InkCanvas
        inkConcentration={inkConcentration}
        brushSize={brushSize}
        diffusionSpeed={diffusionSpeed}
        colorTheme={colorTheme}
        resetTrigger={resetTrigger}
        onStrokeLengthChange={setStrokeLength}
        onInkDotCountChange={setInkDotCount}
      />

      <ControlPanel
        inkConcentration={inkConcentration}
        brushSize={brushSize}
        diffusionSpeed={diffusionSpeed}
        colorTheme={colorTheme}
        onInkConcentrationChange={setInkConcentration}
        onBrushSizeChange={setBrushSize}
        onDiffusionSpeedChange={setDiffusionSpeed}
        onColorThemeChange={setColorTheme}
        onReset={handleReset}
      />

      <div
        style={{
          position: 'absolute',
          left: 20,
          bottom: 20,
          color: 'rgba(180, 200, 220, 0.6)',
          fontSize: 13,
          fontFamily: '"Noto Serif SC", "SimSun", serif',
          pointerEvents: 'none',
          display: 'flex',
          gap: 24,
          letterSpacing: 1,
        }}
      >
        <span>笔迹长度: {strokeLength.toFixed(0)}px</span>
        <span>墨点计数: {inkDotCount}</span>
      </div>
    </div>
  )
}
