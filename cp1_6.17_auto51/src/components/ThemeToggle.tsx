import { useStore } from '../store'

export function ThemeToggle() {
  const { isDark, toggleTheme } = useStore()

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
        backgroundColor: isDark ? '#2a2a2a' : 'white',
        color: isDark ? '#FFD740' : '#666',
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
