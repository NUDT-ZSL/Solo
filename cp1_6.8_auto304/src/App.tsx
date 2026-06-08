import React, { useState, useRef, useCallback } from 'react'
import SandCanvas, { SandCanvasHandle } from './SandCanvas'
import ControlPanel from './ControlPanel'

const App: React.FC = () => {
  const [text, setText] = useState('字影流沙')
  const [dissipationIntensity, setDissipationIntensity] = useState(0)
  const [reassemblySpeed, setReassemblySpeed] = useState(0.5)
  const canvasRef = useRef<SandCanvasHandle>(null)

  const handleReset = useCallback(() => {
    canvasRef.current?.reset()
  }, [])

  const handleSave = useCallback(() => {
    canvasRef.current?.exportPNG()
  }, [])

  const config = {
    dissipationIntensity,
    reassemblySpeed,
    animationSpeed: 1,
  }

  return (
    <div style={styles.container}>
      <div style={styles.canvasArea}>
        <SandCanvas ref={canvasRef} text={text} config={config} />
      </div>
      <ControlPanel
        text={text}
        onTextChange={setText}
        dissipationIntensity={dissipationIntensity}
        onDissipationChange={setDissipationIntensity}
        reassemblySpeed={reassemblySpeed}
        onReassemblyChange={setReassemblySpeed}
        onReset={handleReset}
        onSave={handleSave}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    background: '#000',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  canvasArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
}

export default App
