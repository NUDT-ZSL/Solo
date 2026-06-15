import React, { useEffect, useState } from 'react'

export interface StatsData {
  totalParticles: number
  avgSpeed: number
  congestedCount: number
  fps: number
}

interface UIOverlayProps {
  stats: StatsData
}

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 20,
  left: 20,
  padding: '16px 20px',
  background: 'rgba(0, 0, 0, 0.6)',
  borderRadius: 8,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(51, 170, 221, 0.2)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
  zIndex: 100,
  minWidth: 200,
  fontFamily: "'SF Mono', 'Monaco', 'Consolas', monospace",
  userSelect: 'none'
}

const titleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: '#FFFFFF',
  marginBottom: 12,
  letterSpacing: 0.5,
  display: 'flex',
  alignItems: 'center',
  gap: 8
}

const dotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#00FFCC',
  boxShadow: '0 0 8px #00FFCC',
  animation: 'pulse 1.5s ease-in-out infinite'
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 0',
  borderBottom: '1px solid rgba(51, 170, 221, 0.1)'
}

const lastRowStyle: React.CSSProperties = {
  ...rowStyle,
  borderBottom: 'none'
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(255, 255, 255, 0.5)',
  letterSpacing: 0.3
}

const valueStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#33AADD',
  textShadow: '0 0 8px rgba(51, 170, 221, 0.4)',
  fontVariantNumeric: 'tabular-nums'
}

const congestedValueStyle: React.CSSProperties = {
  ...valueStyle,
  color: '#FF0066',
  textShadow: '0 0 8px rgba(255, 0, 102, 0.4)'
}

const hintStyle: React.CSSProperties = {
  marginTop: 14,
  paddingTop: 12,
  borderTop: '1px solid rgba(51, 170, 221, 0.15)',
  fontSize: 11,
  color: 'rgba(255, 255, 255, 0.35)',
  lineHeight: 1.8
}

const UIOverlay: React.FC<UIOverlayProps> = ({ stats }) => {
  const [displayStats, setDisplayStats] = useState(stats)
  const [smoothAvg, setSmoothAvg] = useState(stats.avgSpeed)

  useEffect(() => {
    let rafId: number
    const animate = () => {
      setSmoothAvg(prev => prev + (stats.avgSpeed - prev) * 0.1)
      rafId = requestAnimationFrame(animate)
    }
    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [stats.avgSpeed])

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayStats(stats)
    }, 1000)
    return () => clearInterval(interval)
  }, [stats])

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
      `}</style>
      <div style={panelStyle}>
        <div style={titleStyle}>
          <span style={dotStyle} />
          交通状态监控
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>总粒子数</span>
          <span style={valueStyle}>
            {displayStats.totalParticles.toLocaleString()}
          </span>
        </div>

        <div style={rowStyle}>
          <span style={labelStyle}>平均车速</span>
          <span style={valueStyle}>
            {smoothAvg.toFixed(1)} <span style={{ fontSize: 11, opacity: 0.6 }}>u/s</span>
          </span>
        </div>

        <div style={lastRowStyle}>
          <span style={labelStyle}>拥堵路段</span>
          <span style={displayStats.congestedCount > 0 ? congestedValueStyle : valueStyle}>
            {displayStats.congestedCount}
          </span>
        </div>

        <div style={hintStyle}>
          🖱️ 拖拽旋转视角<br />
          🔍 滚轮缩放距离<br />
          👆 点击粒子触发拥堵
        </div>
      </div>
    </>
  )
}

export default UIOverlay
