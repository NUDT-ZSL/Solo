import React, { useState, useEffect, useCallback } from 'react'
import { useLavaStore, EruptionInfo } from './store'

function ControlPanel({ sceneManager }: { sceneManager: any }) {
  const { lavaSpeed, particleDensity, coolingRate, setLavaSpeed, setParticleDensity, setCoolingRate, resetScene } = useLavaStore()

  const handleReset = useCallback(() => {
    resetScene()
    if (sceneManager?.current) {
      sceneManager.current.reset()
    }
  }, [resetScene, sceneManager])

  return (
    <div style={{
      position: 'fixed',
      right: 20,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 220,
      padding: '24px 20px',
      background: 'rgba(20, 5, 0, 0.65)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: 16,
      border: '1px solid rgba(255, 80, 20, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 100, 30, 0.1)',
      color: '#e8d5c4',
      fontFamily: '"Noto Sans SC", sans-serif',
      zIndex: 100,
    }}>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: 2,
        textAlign: 'center',
        color: '#ff8844',
        textShadow: '0 0 12px rgba(255, 100, 30, 0.5)',
      }}>
        熔岩脉动
      </h3>

      <SliderControl
        label="熔岩流速"
        value={lavaSpeed}
        min={0.1}
        max={3.0}
        step={0.1}
        onChange={setLavaSpeed}
      />
      <SliderControl
        label="粒子密度"
        value={particleDensity}
        min={0.1}
        max={3.0}
        step={0.1}
        onChange={setParticleDensity}
      />
      <SliderControl
        label="冷却速度"
        value={coolingRate}
        min={0.1}
        max={3.0}
        step={0.1}
        onChange={setCoolingRate}
      />

      <button
        onClick={handleReset}
        style={{
          width: '100%',
          marginTop: 20,
          padding: '10px 0',
          background: 'rgba(255, 60, 10, 0.25)',
          border: '1px solid rgba(255, 80, 20, 0.4)',
          borderRadius: 8,
          color: '#ff9955',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: 1,
          transition: 'all 0.2s ease',
          fontFamily: '"Noto Sans SC", sans-serif',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 60, 10, 0.45)'
          e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 60, 10, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 60, 10, 0.25)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        重置场景
      </button>

      <p style={{
        marginTop: 16,
        fontSize: 11,
        color: 'rgba(200, 160, 130, 0.5)',
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        点击熔岩流交汇点<br/>触发喷发
      </p>
    </div>
  )
}

function SliderControl({ label, value, min, max, step, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 6,
        fontSize: 12,
        color: 'rgba(220, 180, 150, 0.8)',
      }}>
        <span>{label}</span>
        <span style={{ color: '#ff8844', fontWeight: 600 }}>{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          height: 4,
          appearance: 'none',
          WebkitAppearance: 'none',
          background: `linear-gradient(to right, rgba(255,80,20,0.8) ${((value - min) / (max - min)) * 100}%, rgba(60,20,10,0.4) ${((value - min) / (max - min)) * 100}%)`,
          borderRadius: 2,
          outline: 'none',
          cursor: 'pointer',
        }}
      />
    </div>
  )
}

function InfoCard() {
  const { activeEruption, dismissEruption } = useLavaStore()
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (activeEruption) {
      setVisible(true)
      setAnimating(true)
      const timer = setTimeout(() => {
        setAnimating(false)
        setTimeout(() => {
          setVisible(false)
          dismissEruption()
        }, 400)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [activeEruption, dismissEruption])

  if (!visible || !activeEruption) return null

  return (
    <div
      onClick={() => {
        setAnimating(false)
        setTimeout(() => {
          setVisible(false)
          dismissEruption()
        }, 300)
      }}
      style={{
        position: 'fixed',
        left: '50%',
        top: '15%',
        transform: `translateX(-50%) ${animating ? 'translateY(0)' : 'translateY(-20px)'}`,
        padding: '20px 28px',
        background: 'rgba(20, 5, 0, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 12,
        border: '1px solid rgba(255, 80, 20, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 60, 10, 0.15)',
        color: '#e8d5c4',
        fontFamily: '"Noto Sans SC", sans-serif',
        zIndex: 200,
        opacity: animating ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        minWidth: 200,
      }}
    >
      <h4 style={{
        margin: '0 0 14px 0',
        fontSize: 14,
        fontWeight: 700,
        color: '#ff8844',
        textShadow: '0 0 8px rgba(255, 100, 30, 0.4)',
        letterSpacing: 1,
      }}>
        熔岩喷发
      </h4>
      <InfoRow label="温度" value={`${activeEruption.temperature.toFixed(0)}°C`} color="#ff5522" />
      <InfoRow label="流速" value={`${activeEruption.flowRate.toFixed(1)} m/s`} color="#ff8844" />
      <InfoRow label="压力" value={`${activeEruption.pressure.toFixed(1)} MPa`} color="#ffaa44" />
    </div>
  )
}

function InfoRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      fontSize: 13,
    }}>
      <span style={{ color: 'rgba(200, 160, 130, 0.7)' }}>{label}</span>
      <span style={{ color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

export default function UIPanel({ sceneManager }: { sceneManager: any }) {
  return (
    <>
      <ControlPanel sceneManager={sceneManager} />
      <InfoCard />
    </>
  )
}
