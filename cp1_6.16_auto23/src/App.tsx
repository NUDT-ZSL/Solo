import { useEffect, useRef, useCallback } from 'react'
import { PanelLeftOpen } from 'lucide-react'
import Scene from '@/components/Scene'
import WeatherPanel from '@/components/WeatherPanel'
import ControlPanel from '@/components/ControlPanel'
import AlertBanner from '@/components/AlertBanner'
import useWeatherStore from '@/store/weatherStore'

export default function App() {
  const tick = useWeatherStore((s) => s.tick)
  const fetchHistoryData = useWeatherStore((s) => s.fetchHistoryData)
  const fetchAlerts = useWeatherStore((s) => s.fetchAlerts)
  const setIsMobile = useWeatherStore((s) => s.setIsMobile)
  const panelOpen = useWeatherStore((s) => s.panelOpen)
  const togglePanel = useWeatherStore((s) => s.togglePanel)
  const isMobile = useWeatherStore((s) => s.isMobile)

  const lastTimeRef = useRef(performance.now())

  useEffect(() => {
    fetchHistoryData()
    fetchAlerts()

    const interval = setInterval(() => {
      fetchAlerts()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchHistoryData, fetchAlerts])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setIsMobile])

  useEffect(() => {
    let animId: number
    const loop = (time: number) => {
      const delta = time - lastTimeRef.current
      lastTimeRef.current = time
      if (delta > 0 && delta < 200) {
        tick(delta)
      }
      animId = requestAnimationFrame(loop)
    }
    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [tick])

  const leftMargin = !isMobile && panelOpen ? '280px' : '0px'

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#1a1a2e',
      color: '#E0E0E0',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <AlertBanner />

      <WeatherPanel />

      {!panelOpen && !isMobile && (
        <button
          onClick={togglePanel}
          style={{
            position: 'fixed',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(42,42,62,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#999',
            cursor: 'pointer',
            padding: '8px 4px',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PanelLeftOpen size={18} />
        </button>
      )}

      <div style={{
        position: 'absolute',
        top: 0,
        left: leftMargin,
        right: 0,
        bottom: 0,
        transition: 'left 0.3s ease-out',
        padding: '8px',
        boxSizing: 'border-box',
      }}>
        <Scene />
      </div>

      <ControlPanel />
    </div>
  )
}
