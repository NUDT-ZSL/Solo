import { useState, useEffect } from 'react'
import StarField from '@/components/StarField'
import ControlPanel from '@/components/ControlPanel'

export default function App() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        opacity: loaded ? 1 : 0,
        transition: 'opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #000000 0%, #0a0a2e 40%, #1a1a4e 100%)',
        }}
      />
      <StarField />
      <ControlPanel />
    </div>
  )
}
