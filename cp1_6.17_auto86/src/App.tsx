import { useEffect, useRef } from 'react'
import { SceneManager } from './sceneManager'
import { UIController } from './uiController'

export function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)

  useEffect(() => {
    if (!canvasContainerRef.current) return

    sceneManagerRef.current = new SceneManager(canvasContainerRef.current)

    return () => {
      sceneManagerRef.current?.dispose()
      sceneManagerRef.current = null
    }
  }, [])

  const appStyle = {
    width: '100vw',
    height: '100vh',
    margin: 0,
    padding: 0,
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    minWidth: '320px',
  } as React.CSSProperties

  const canvasWrapperStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  }

  return (
    <div style={appStyle}>
      <div ref={canvasContainerRef} style={canvasWrapperStyle} />
      <UIController />
    </div>
  )
}
