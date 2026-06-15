import { Theme } from '../types'
import { createRipple } from '../utils/ripple'

interface ThemeToggleProps {
  theme: Theme
  onToggle: (e: React.MouseEvent) => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const themeColors = theme === 'dark'
    ? { primary: '#18181b', accent: '#a78bfa', text: '#ffffff', icon: '☀️' }
    : { primary: '#fef3c7', accent: '#f97316', text: '#18181b', icon: '🌙' }

  const handleClick = (e: React.MouseEvent) => {
    createRipple(e, themeColors.accent + '40')
    onToggle(e)
  }

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        transition: 'all 0.3s ease',
        zIndex: 200
      }}
      title={theme === 'dark' ? '切换到暖色主题' : '切换到暗色主题'}
    >
      {themeColors.icon}
    </button>
  )
}
