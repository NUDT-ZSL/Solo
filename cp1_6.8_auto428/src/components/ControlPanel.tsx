import { useState, useCallback } from 'react'
import { useSceneStore, COLOR_THEMES, type ThemeName } from '@/store'
import { RotateCcw, Sparkles } from 'lucide-react'

export default function ControlPanel() {
  const particleDensity = useSceneStore((s) => s.particleDensity)
  const tidalStrength = useSceneStore((s) => s.tidalStrength)
  const colorTheme = useSceneStore((s) => s.colorTheme)
  const setParticleDensity = useSceneStore((s) => s.setParticleDensity)
  const setTidalStrength = useSceneStore((s) => s.setTidalStrength)
  const setColorTheme = useSceneStore((s) => s.setColorTheme)
  const resetScene = useSceneStore((s) => s.resetScene)

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = useCallback(() => {
    setIsResetting(true)
    setTimeout(() => {
      resetScene()
      setIsResetting(false)
    }, 300)
  }, [resetScene])

  const currentTheme = COLOR_THEMES.find((t) => t.name === colorTheme) || COLOR_THEMES[0]

  return (
    <div
      className="fixed left-4 bottom-4 z-50 transition-all duration-500 ease-out"
      style={{
        maxWidth: isCollapsed ? '48px' : '280px',
      }}
    >
      <div
        className="relative overflow-hidden rounded-2xl transition-all duration-500 ease-out"
        style={{
          background: 'rgba(10, 14, 39, 0.6)',
          backdropFilter: 'blur(20px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 60px rgba(${currentTheme.name === 'neon' ? '0, 255, 136' : currentTheme.name === 'coral' ? '255, 107, 107' : '0, 212, 255'}, 0.05)`,
          padding: isCollapsed ? '12px' : '20px',
        }}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 hover:bg-white/10"
          style={{ color: currentTheme.particle1 }}
        >
          <Sparkles size={16} />
        </button>

        {!isCollapsed && (
          <div className="space-y-5 pr-6">
            <div
              className="text-xs font-semibold tracking-widest uppercase"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                color: currentTheme.particle1,
                textShadow: `0 0 20px ${currentTheme.particle1}40`,
              }}
            >
              星潮引力
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label
                  className="text-xs tracking-wide"
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  粒子密度
                </label>
                <span
                  className="text-xs font-mono"
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    color: currentTheme.particle1,
                  }}
                >
                  {particleDensity}
                </span>
              </div>
              <input
                type="range"
                min={500}
                max={3000}
                step={100}
                value={particleDensity}
                onChange={(e) => setParticleDensity(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer transition-all duration-200"
                style={{
                  background: `linear-gradient(to right, ${currentTheme.particle1} ${((particleDensity - 500) / 2500) * 100}%, rgba(255,255,255,0.1) ${((particleDensity - 500) / 2500) * 100}%)`,
                  accentColor: currentTheme.particle1,
                }}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label
                  className="text-xs tracking-wide"
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  潮汐强度
                </label>
                <span
                  className="text-xs font-mono"
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    color: currentTheme.particle1,
                  }}
                >
                  {tidalStrength.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={2.0}
                step={0.1}
                value={tidalStrength}
                onChange={(e) => setTidalStrength(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer transition-all duration-200"
                style={{
                  background: `linear-gradient(to right, ${currentTheme.particle1} ${((tidalStrength - 0.1) / 1.9) * 100}%, rgba(255,255,255,0.1) ${((tidalStrength - 0.1) / 1.9) * 100}%)`,
                  accentColor: currentTheme.particle1,
                }}
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-xs tracking-wide block"
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                颜色主题
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {COLOR_THEMES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setColorTheme(t.name as ThemeName)}
                    className="relative flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all duration-300 hover:scale-105"
                    style={{
                      background:
                        colorTheme === t.name
                          ? `linear-gradient(135deg, ${t.particle1}30, ${t.particle2}30)`
                          : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${colorTheme === t.name ? t.particle1 + '60' : 'rgba(255, 255, 255, 0.06)'}`,
                      boxShadow:
                        colorTheme === t.name ? `0 0 15px ${t.particle1}20` : 'none',
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${t.particle1}, ${t.particle2})`,
                        boxShadow:
                          colorTheme === t.name
                            ? `0 0 8px ${t.particle1}80`
                            : `0 0 4px ${t.particle1}40`,
                      }}
                    />
                    <span
                      className="text-[10px] leading-none"
                      style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        color:
                          colorTheme === t.name ? t.particle1 : 'rgba(255, 255, 255, 0.4)',
                      }}
                    >
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                background: isResetting
                  ? `linear-gradient(135deg, ${currentTheme.particle1}40, ${currentTheme.particle2}40)`
                  : `linear-gradient(135deg, ${currentTheme.particle1}15, ${currentTheme.particle2}15)`,
                border: `1px solid ${currentTheme.particle1}30`,
                color: currentTheme.particle1,
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              <RotateCcw
                size={14}
                className={`transition-transform duration-500 ${isResetting ? 'animate-spin' : ''}`}
              />
              重置场景
            </button>
          </div>
        )}

        {isCollapsed && (
          <div className="flex items-center justify-center">
            <Sparkles size={20} style={{ color: currentTheme.particle1 }} />
          </div>
        )}
      </div>

      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 0 10px currentColor;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.3);
        }
        input[type='range']::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 0 10px currentColor;
        }
      `}</style>
    </div>
  )
}
