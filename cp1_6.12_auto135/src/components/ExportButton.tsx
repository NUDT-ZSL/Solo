import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'

function ExportButton() {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const rippleId = Date.now()

    setRipples(prev => [...prev, { id: rippleId, x, y }])

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== rippleId))
    }, 600)

    try {
      const gridElement = document.getElementById('component-grid')
      if (!gridElement) return

      const canvas = await html2canvas(gridElement, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      })

      const targetWidth = 1920
      const scaleFactor = targetWidth / canvas.width
      const targetHeight = Math.round(canvas.height * scaleFactor)

      const resizedCanvas = document.createElement('canvas')
      resizedCanvas.width = targetWidth
      resizedCanvas.height = targetHeight
      const ctx = resizedCanvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight)
      }

      const link = document.createElement('a')
      link.download = `ThemeGrid-${Date.now()}.png`
      link.href = resizedCanvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('导出失败:', error)
    }
  }

  return (
    <button
      ref={buttonRef}
      className="export-button"
      onClick={handleClick}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="ripple-effect"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
        />
      ))}
      <svg
        className="export-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span>导出看板</span>
    </button>
  )
}

export default ExportButton
