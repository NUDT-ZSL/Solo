import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Game, GameStateSnapshot } from './game'
import { WIN_LINK_COUNT } from './entities'

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  const [state, setState] = useState<GameStateSnapshot | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [energyBump, setEnergyBump] = useState(false)
  const prevEnergy = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 800
    canvas.height = 600
    const game = new Game(canvas)
    gameRef.current = game
    game.onStateChange = (s) => {
      setState({ ...s })
      if (s.energyCount > prevEnergy.current) {
        setEnergyBump(true)
        setTimeout(() => setEnergyBump(false), 240)
      }
      prevEnergy.current = s.energyCount
    }
    game.start()
    return () => {
      game.stop()
    }
  }, [])

  const handleReset = useCallback(() => {
    gameRef.current?.reset()
  }, [])

  const resetFlashAlpha = state?.resetFlash ? Math.min(1, state.resetFlash / 300) : 0
  const tideColor = interpolateTideColor(state?.tidalProgress ?? 0)
  const portalBlur = gameRef.current?.getPortalBlur() ?? false

  return (
    <div className="app-root">
      <div className={`game-wrap ${portalBlur ? 'portal-blur' : ''}`}>
        <div className="canvas-stage">
          <canvas ref={canvasRef} className="game-canvas" />
        </div>

        <div className="game-hud">
          <div className="game-title">
            潮汐碑文
            <span className="subtitle">TIDAL · RELICS</span>
          </div>

          <div className="tide-bar-wrap">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="tide-label">TIDE</span>
              {state && (
                <span className={`phase-tag phase-${state.tidalPhase}`}>
                  {state.tidalPhase === 'flood' ? '↑ 涨潮' : '↓ 退潮'}
                </span>
              )}
            </div>
            <div className="tide-bar">
              <div
                className="tide-bar-fill"
                style={{
                  width: `${Math.round((state?.tidalProgress ?? 0) * 100)}%`,
                  background: `linear-gradient(90deg, #4FC3F7, ${tideColor})`,
                  color: tideColor,
                }}
              />
              <div className="tide-bar-threshold" />
              <div className="tide-bar-text">
                {Math.round((state?.tidalProgress ?? 0) * 100)}%
              </div>
            </div>
          </div>

          <div className="energy-counter" title="能量链">
            <span className="energy-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h7l-1 8 11-13h-7l1-7z" stroke="#FFD54F" strokeWidth="2" strokeLinejoin="round" fill="none"/>
              </svg>
            </span>
            <span>
              <span className={`energy-value ${energyBump ? 'bump' : ''}`}>
                {state?.energyCount ?? 0}
              </span>
              <span className="energy-target"> / {WIN_LINK_COUNT}</span>
            </span>
          </div>

          <div className="bottom-bar">
            <button className="game-btn hotkey" onClick={handleReset} title="重置谜题">
              <span>重置谜题</span>
              <span className="key">R</span>
            </button>
            <button className="game-btn" onClick={() => setShowGuide(true)} title="游戏说明">
              游戏说明
            </button>
          </div>

          {state?.portalOpen && (
            <div className="win-banner">
              <div className="win-title">传 送 门 开 启</div>
              <div className="win-subtitle">PORTAL · UNLOCKED</div>
            </div>
          )}
        </div>

        {resetFlashAlpha > 0 && (
          <div className="flash-overlay" style={{ opacity: resetFlashAlpha }} />
        )}

        {showGuide && (
          <div className="modal-mask" onClick={() => setShowGuide(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>
                <span>✦</span>
                <span>游戏说明</span>
              </h2>
              <p>欢迎来到海底遗迹。石碑因潮汐而苏醒，请在退潮时翻转它们。</p>
              <div className="legend">
                <div className="legend-item">
                  <span className="legend-swatch" style={{ color: '#4DD0E1' }}>〜</span>
                  <span>波浪符文</span>
                </div>
                <div className="legend-item">
                  <span className="legend-swatch" style={{ color: '#7C4DFF' }}>⚡</span>
                  <span>闪电符文</span>
                </div>
                <div className="legend-item">
                  <span className="legend-swatch" style={{ color: '#40C4FF' }}>🌀</span>
                  <span>螺旋符文</span>
                </div>
                <div className="legend-item">
                  <span className="legend-swatch" style={{ color: '#B388FF' }}>★</span>
                  <span>星形符文</span>
                </div>
              </div>
              <ul>
                <li><b>潮汐机制</b>：30秒涨潮 · 10秒退潮；水位超过50%石碑被淹没锁定。</li>
                <li><b>石碑翻转</b>：低潮（水位&lt;50%）时点击石碑，Y轴旋转180°切换符文。</li>
                <li><b>能量链</b>：上下左右相邻的两块石碑若符文相同，则生成能量链。</li>
                <li><b>胜利条件</b>：连接 <b>{WIN_LINK_COUNT} 条</b>能量链即可开启传送门。</li>
                <li><b>重置</b>：按 <kbd style={{padding:'1px 6px',border:'1px solid #4FC3F788',borderRadius:4,fontFamily:'Cinzel'}}>R</kbd> 或点击按钮重置谜题。</li>
              </ul>
              <p style={{opacity:0.7, fontSize:12}}>提示：观察潮汐节奏，抓住低潮窗口精准对齐符文。</p>
              <button className="modal-close" onClick={() => setShowGuide(false)}>
                了 解
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function interpolateTideColor(t: number): string {
  const c1 = { r: 79, g: 195, b: 247 }
  const c2 = { r: 26, g: 35, b: 126 }
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r},${g},${b})`
}

export default App
