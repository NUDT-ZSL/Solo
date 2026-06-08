import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, RotateCcw, Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import { AudioAnalyzer } from './AudioAnalyzer'

export default function ControlPanel() {
  const inputText = useStore((s) => s.inputText)
  const setInputText = useStore((s) => s.setInputText)
  const particleDensity = useStore((s) => s.particleDensity)
  const setParticleDensity = useStore((s) => s.setParticleDensity)
  const spreadSpeed = useStore((s) => s.spreadSpeed)
  const setSpreadSpeed = useStore((s) => s.setSpreadSpeed)
  const isListening = useStore((s) => s.isListening)
  const setIsListening = useStore((s) => s.setIsListening)
  const addConstellationFromText = useStore((s) => s.addConstellationFromText)
  const resetCanvas = useStore((s) => s.resetCanvas)

  const [isVisible, setIsVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const analyzerRef = useRef<AudioAnalyzer | null>(null)

  useEffect(() => {
    setIsVisible(true)
    analyzerRef.current = new AudioAnalyzer()
    return () => {
      analyzerRef.current?.stop()
    }
  }, [])

  const handleSubmit = useCallback(() => {
    if (inputText.trim()) {
      addConstellationFromText(inputText.trim())
    }
  }, [inputText, addConstellationFromText])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const toggleVoice = useCallback(async () => {
    if (isListening) {
      analyzerRef.current?.stop()
      setIsListening(false)
    } else {
      if (!analyzerRef.current) {
        analyzerRef.current = new AudioAnalyzer()
      }
      const success = await analyzerRef.current.start((result) => {
        if (result.text) {
          addConstellationFromText(result.text)
        }
      })
      setIsListening(success)
    }
  }, [isListening, setIsListening, addConstellationFromText])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div
        className="rounded-2xl p-5 w-80"
        style={{
          background: 'rgba(10, 10, 40, 0.65)',
          backdropFilter: 'blur(20px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
          border: '1px solid rgba(120, 140, 200, 0.15)',
          boxShadow:
            '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-indigo-300/70" />
          <span
            className="text-sm tracking-widest uppercase"
            style={{
              fontFamily: '"Cormorant Garamond", "Georgia", serif',
              color: 'rgba(180, 190, 230, 0.7)',
              letterSpacing: '0.2em',
            }}
          >
            星语织梦
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入文字，化作星辰..."
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-all duration-300 focus:ring-1"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(120, 140, 200, 0.12)',
              color: 'rgba(210, 220, 255, 0.9)',
              fontFamily: '"Noto Serif SC", "Georgia", serif',
              caretColor: 'rgba(150, 170, 255, 0.8)',
            }}
          />
          <button
            onClick={handleSubmit}
            className="px-3 py-2 rounded-lg text-xs transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(100, 120, 255, 0.3), rgba(160, 100, 255, 0.3))',
              border: '1px solid rgba(140, 160, 255, 0.2)',
              color: 'rgba(200, 210, 255, 0.9)',
            }}
          >
            ✦
          </button>
        </div>

        <button
          onClick={toggleVoice}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-300 mb-4 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: isListening
              ? 'linear-gradient(135deg, rgba(255, 80, 80, 0.25), rgba(255, 120, 60, 0.25))'
              : 'rgba(255, 255, 255, 0.04)',
            border: isListening
              ? '1px solid rgba(255, 100, 80, 0.3)'
              : '1px solid rgba(120, 140, 200, 0.1)',
            color: isListening ? 'rgba(255, 160, 140, 0.9)' : 'rgba(180, 190, 230, 0.7)',
          }}
        >
          <Mic
            size={14}
            className={isListening ? 'animate-pulse' : ''}
          />
          <span>{isListening ? '聆听中...' : '语音输入'}</span>
        </button>

        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span
              className="text-xs"
              style={{ color: 'rgba(160, 170, 210, 0.6)' }}
            >
              粒子密度
            </span>
            <span
              className="text-xs tabular-nums"
              style={{ color: 'rgba(180, 190, 230, 0.5)' }}
            >
              {particleDensity}
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={500}
            step={10}
            value={particleDensity}
            onChange={(e) => setParticleDensity(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgba(100,120,255,0.4) ${
                ((particleDensity - 50) / 450) * 100
              }%, rgba(255,255,255,0.08) ${
                ((particleDensity - 50) / 450) * 100
              }%)`,
            }}
          />
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span
              className="text-xs"
              style={{ color: 'rgba(160, 170, 210, 0.6)' }}
            >
              扩散速度
            </span>
            <span
              className="text-xs tabular-nums"
              style={{ color: 'rgba(180, 190, 230, 0.5)' }}
            >
              {spreadSpeed.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.1}
            value={spreadSpeed}
            onChange={(e) => setSpreadSpeed(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgba(100,120,255,0.4) ${
                ((spreadSpeed - 0.1) / 2.9) * 100
              }%, rgba(255,255,255,0.08) ${
                ((spreadSpeed - 0.1) / 2.9) * 100
              }%)`,
            }}
          />
        </div>

        <button
          onClick={resetCanvas}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(120, 140, 200, 0.1)',
            color: 'rgba(160, 170, 210, 0.5)',
          }}
        >
          <RotateCcw size={12} />
          <span>重置画布</span>
        </button>
      </div>
    </div>
  )
}
