import { useEffect, useState } from 'react'

interface ToastProps {
  message: string | null
  onHide: () => void
}

export default function Toast({ message, onHide }: ToastProps) {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (message) {
      setVisible(true)
      setFadeOut(false)
      const fadeTimer = setTimeout(() => setFadeOut(true), 2500)
      const hideTimer = setTimeout(() => {
        setVisible(false)
        onHide()
      }, 3000)
      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(hideTimer)
      }
    }
  }, [message, onHide])

  if (!visible) return null

  return (
    <div
      className="fixed bottom-8 left-1/2 z-[9999] px-5 py-2.5 rounded-lg text-white text-sm font-medium shadow-lg"
      style={{
        transform: 'translateX(-50%)',
        backgroundColor: '#50C878',
        borderRadius: 8,
        fontFamily: 'DM Sans, sans-serif',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
      ✓ {message}
    </div>
  )
}
