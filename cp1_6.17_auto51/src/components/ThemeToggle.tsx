import { useEffect } from 'react'
import { useStore } from '../store'

export function ThemeToggle() {
  const { isDark, toggleTheme } = useStore()

  useEffect(() => {
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <button
      onClick={toggleTheme}
      className="ripple-btn"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: 'var(--bg-tertiary)',
        color: isDark ? '#FFD740' : 'var(--text-secondary)',
        fontSize: '20px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease'
      }}
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
