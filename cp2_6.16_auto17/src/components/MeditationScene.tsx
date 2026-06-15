import { useEffect, useState, useRef } from 'react'
import { Theme } from '../types'
import { AudioEngine } from '../audio/AudioEngine'
import { ParticleField } from '../visuals/ParticleField'
import { WaveScene } from '../visuals/WaveScene'
import { SpectrumMeter } from './SpectrumMeter'

interface MeditationSceneProps {
  theme: Theme
  intent: string
  onBack: () => void
}

export function MeditationScene({ theme, intent, onBack }: MeditationSceneProps) {
  const [spectrumData, setSpectrumData] = useState<Uint8Array | null>(null)
  const audioEngineRef = useRef<AudioEngine | null>(null)
  const [sceneType, setSceneType] = useState<'particle' | 'ocean' | 'forest' | 'mountain'>('particle')

  useEffect(() => {
    const lowerIntent = intent.toLowerCase()
    
    if (lowerIntent.includes('海') || lowerIntent.includes('ocean') || lowerIntent.includes('浪') || lowerIntent.includes('放松')) {
      setSceneType('ocean')
    } else if (lowerIntent.includes('森林') || lowerIntent.includes('forest') || lowerIntent.includes('树')) {
      setSceneType('forest')
    } else if (lowerIntent.includes('山') || lowerIntent.includes('mountain') || lowerIntent.includes('专注')) {
      setSceneType('mountain')
    } else {
      setSceneType('particle')
    }
  }, [intent])

  useEffect(() => {
    audioEngineRef.current = new AudioEngine()
    
    audioEngineRef.current.setOnSpectrumUpdate((data) => {
      setSpectrumData(new Uint8Array(data))
    })

    audioEngineRef.current.start(intent)

    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.destroy()
      }
    }
  }, [intent])

  const themeColors = theme === 'dark'
    ? { primary: '#18181b', secondary: '#3f3f46', accent: '#a78bfa', text: '#ffffff' }
    : { primary: '#fef3c7', secondary: '#fde68a', accent: '#f97316', text: '#18181b' }

  const getBackgroundStyle = (): React.CSSProperties => {
    if (sceneType === 'ocean') {
      return {
        background: theme === 'dark'
          ? 'linear-gradient(to bottom, #0a192f, #112240, #233554)'
          : 'linear-gradient(to bottom, #87ceeb, #4fc3f7, #0288d1)'
      }
    } else if (sceneType === 'forest') {
      return {
        background: theme === 'dark'
          ? 'linear-gradient(to bottom, #1a2f1a, #2d4a2d, #3d5a3d)'
          : 'linear-gradient(to bottom, #90ee90, #4caf50, #2e7d32)'
      }
    } else if (sceneType === 'mountain') {
      return {
        background: theme === 'dark'
          ? 'linear-gradient(to bottom, #1a1a2e, #16213e, #0f3460)'
          : 'linear-gradient(to bottom, #e0e0e0, #9e9e9e, #616161)'
      }
    }
    return {
      background: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        ...getBackgroundStyle(),
        transition: 'background 0.6s ease'
      }}
    >
      {sceneType === 'ocean' && <WaveScene theme={theme} />}
      {sceneType !== 'ocean' && <ParticleField theme={theme} />}

      <SpectrumMeter spectrumData={spectrumData} />

      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <h2
          style={{
            color: themeColors.text,
            fontSize: '24px',
            fontWeight: 600,
            margin: 0
          }}
        >
          {intent}
        </h2>
        <p
          style={{
            color: themeColors.text,
            fontSize: '14px',
            opacity: 0.7,
            margin: 0
          }}
        >
          深呼吸，跟随引导进入宁静...
        </p>
      </div>

      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          padding: '12px 24px',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          color: themeColors.text,
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        结束冥想
      </button>

      <div
        style={{
          position: 'absolute',
          bottom: '50%',
          left: '50%',
          transform: 'translate(-50%, 50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}
      >
        <BreathIndicator theme={theme} />
        <span
          style={{
            color: themeColors.text,
            fontSize: '16px',
            opacity: 0.8,
            fontWeight: 500
          }}
        >
          跟随节奏呼吸
        </span>
      </div>
    </div>
  )
}

function BreathIndicator({ theme }: { theme: Theme }) {
  const [phase, setPhase] = useState<'inhale' | 'exhale' | 'hold'>('inhale')
  const themeColors = theme === 'dark'
    ? { accent: '#a78bfa' }
    : { accent: '#f97316' }

  useEffect(() => {
    const cycle = () => {
      setPhase('inhale')
      setTimeout(() => setPhase('hold'), 2000)
      setTimeout(() => setPhase('exhale'), 3000)
    }
    cycle()
    const interval = setInterval(cycle, 4000)
    return () => clearInterval(interval)
  }, [])

  const getScale = () => {
    switch (phase) {
      case 'inhale': return 1.5
      case 'hold': return 1.5
      case 'exhale': return 1
      default: return 1
    }
  }

  const getText = () => {
    switch (phase) {
      case 'inhale': return '吸气'
      case 'hold': return '屏息'
      case 'exhale': return '呼气'
      default: return ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${themeColors.accent}40, ${themeColors.accent}10)`,
          border: `2px solid ${themeColors.accent}`,
          transform: `scale(${getScale()})`,
          transition: 'transform 2s ease-in-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: themeColors.accent,
            opacity: 0.6
          }}
        />
      </div>
      <span
        style={{
          color: themeColors.accent,
          fontSize: '14px',
          fontWeight: 500,
          minWidth: '40px',
          textAlign: 'center'
        }}
      >
        {getText()}
      </span>
    </div>
  )
}
