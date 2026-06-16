import { useEffect, useRef, useState } from 'react'
import { AuroraScene } from './components/AuroraScene'
import { UIPanel } from './components/UIPanel'
import { AudioProcessor } from './core/AudioProcessor'
import type { AudioData, UIControls } from './types'

function App() {
  const audioProcessorRef = useRef<AudioProcessor | null>(null)
  const animationFrameRef = useRef<number>(0)

  const [audioData, setAudioData] = useState<AudioData>({
    volume: 0,
    frequencyData: new Uint8Array(128),
    isActive: false,
    error: null,
  })

  const [controls, setControls] = useState<UIControls>({
    colorOffset: 0,
    particleLength: 1.0,
    particleCount: 2000,
  })

  const initializeAudio = async () => {
    if (!audioProcessorRef.current) {
      audioProcessorRef.current = new AudioProcessor(128)
    }
    await audioProcessorRef.current.initialize()
  }

  useEffect(() => {
    initializeAudio()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stop()
      }
    }
  }, [])

  useEffect(() => {
    const updateAudioData = () => {
      if (audioProcessorRef.current) {
        const data = audioProcessorRef.current.getAudioData()
        setAudioData(data)
      }
      animationFrameRef.current = requestAnimationFrame(updateAudioData)
    }

    animationFrameRef.current = requestAnimationFrame(updateAudioData)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const handleRequestMic = async () => {
    if (audioProcessorRef.current) {
      await audioProcessorRef.current.stop()
      audioProcessorRef.current = null
    }
    await initializeAudio()
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <AuroraScene controls={controls} audioData={audioData} />
      <UIPanel
        audioData={audioData}
        controls={controls}
        onControlsChange={setControls}
        onRequestMic={handleRequestMic}
      />
    </div>
  )
}

export default App
