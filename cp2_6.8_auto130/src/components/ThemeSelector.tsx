import { useState, useRef, useEffect } from 'react'
import { Palette, ChevronDown } from 'lucide-react'
import { THEMES, ThemeName } from '@/types'

interface ThemeSelectorProps {
  currentTheme: ThemeName
  onThemeChange: (theme: ThemeName) => void
}

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const theme = THEMES[currentTheme]

  return (
    <div className="theme-selector" ref={containerRef}>
      <button
        type="button"
        className="theme-dropdown-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Palette size={14} />
        <span>{theme.label}</span>
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }} />
      </button>
      {isOpen && (
        <div className="theme-dropdown-menu">
          {(Object.keys(THEMES) as ThemeName[]).map((name) => {
            const t = THEMES[name]
            return (
              <div
                key={name}
                className={`theme-option ${name === currentTheme ? 'active' : ''}`}
                onClick={() => {
                  onThemeChange(name)
                  setIsOpen(false)
                }}
              >
                <span
                  className="theme-preview"
                  style={{
                    background: t.waveGradient
                      ? `linear-gradient(90deg, ${t.waveGradient.from}, ${t.waveGradient.to})`
                      : t.waveColor,
                    backgroundColor: t.background,
                  }}
                />
                <span>{t.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
