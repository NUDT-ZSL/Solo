import { useState, useEffect, useCallback } from 'react'
import { Theme } from './types'
import { ParticleField } from './visuals/ParticleField'
import { InputPanel } from './components/InputPanel'
import { MeditationScene } from './components/MeditationScene'
import { ThemeToggle } from './components/ThemeToggle'

type AppState = 'home' | 'meditation'

function App() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [appState, setAppState] = useState<AppState>('home')
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [meditationIntent, setMeditationIntent] = useState('')
  const [isTransitioning, setIsTransitioning] = useState(false)

  const themeColors = theme === 'dark'
    ? { primary: '#18181b', secondary: '#3f3f46', accent: '#a78bfa', text: '#ffffff' }
    : { primary: '#fef3c7', secondary: '#fde68a', accent: '#f97316', text: '#18181b' }

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'warm' : 'dark')
  }, [])

  const handleSubmit = useCallback((text: string) => {
    setIsTransitioning(true)
    setIsPanelCollapsed(true)
    setMeditationIntent(text)
    
    setTimeout(() => {
      setAppState('meditation')
      setIsTransitioning(false)
    }, 500)
  }, [])

  const handleExpand = useCallback(() => {
    setIsPanelCollapsed(false)
  }, [])

  const handleBack = useCallback(() => {
    setIsTransitioning(true)
    setTimeout(() => {
      setAppState('home')
      setIsPanelCollapsed(false)
      setMeditationIntent('')
      setIsTransitioning(false)
    }, 300)
  }, [])

  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#000' : '#fef3c7'
  }, [theme])

  if (appState === 'meditation') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 0.3s ease'
        }}
      >
        <MeditationScene
          theme={theme}
          intent={meditationIntent}
          onBack={handleBack}
        />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
    )
  }

  const homeBackground = theme === 'dark'
    ? 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)'
    : 'linear-gradient(to bottom, #fef3c7, #fde68a, #fcd34d)'

  const titleShadow = theme === 'dark'
    ? '0 0 40px rgba(167, 139, 250, 0.5)'
    : '0 0 40px rgba(249, 115, 22, 0.5)'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: homeBackground,
        opacity: isTransitioning ? 0 : 1,
        transition: 'background 0.6s ease, opacity 0.3s ease'
      }}
    >
      <ParticleField theme={theme} />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}
      >
        <h1
          style={{
            color: themeColors.text,
            fontSize: '56px',
            fontWeight: 700,
            marginBottom: '16px',
            textShadow: titleShadow,
            letterSpacing: '2px',
            transition: 'color 0.6s ease, text-shadow 0.6s ease'
          }}
        >
          冥想工作坊
        </h1>
        <p
          style={{
            color: themeColors.text,
            fontSize: '18px',
            opacity: 0.8,
            fontWeight: 300,
            letterSpacing: '1px',
            transition: 'color 0.6s ease'
          }}
        >
          输入你的意图，开启沉浸式冥想之旅
        </p>
      </div>

      <InputPanel
        theme={theme}
        isCollapsed={isPanelCollapsed}
        onSubmit={handleSubmit}
        onExpand={handleExpand}
      />

      <ThemeToggle theme={theme} onToggle={toggleTheme} />

      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          color: themeColors.text,
          fontSize: '12px',
          opacity: 0.5
        }}
      >
        支持中文输入 · 10-50字描述你的冥想愿望
      </div>
    </div>
  )
}

export default App
