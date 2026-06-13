import { useState, useEffect } from 'react'
import CityScene from './scene/CityScene'
import ControlPanel from './components/ControlPanel'
import { useCityStore } from './store/useCityStore'

export default function App() {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const setTemplate = useCityStore((s) => s.setTemplate)

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setTemplate('default')
    }, 100)
    return () => clearTimeout(timer)
  }, [setTemplate])

  const isMobile = windowWidth < 1024

  const toggleDrawer = () => {
    setIsDrawerOpen((prev) => !prev)
  }

  if (isMobile) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a'
        }}
      >
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <CityScene />
        </div>
        <div
          style={{
            position: 'relative',
            zIndex: 1000
          }}
        >
          <ControlPanel
            isMobile={true}
            isDrawerOpen={isDrawerOpen}
            onToggleDrawer={toggleDrawer}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: '#0f172a',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          width: '75%',
          height: '100%',
          position: 'relative',
          minWidth: 0
        }}
      >
        <CityScene />
      </div>
      <div
        style={{
          width: '25%',
          height: '100%',
          padding: 16,
          boxSizing: 'border-box',
          minWidth: 320
        }}
      >
        <ControlPanel
          isMobile={false}
          isDrawerOpen={false}
          onToggleDrawer={() => {}}
        />
      </div>
    </div>
  )
}
