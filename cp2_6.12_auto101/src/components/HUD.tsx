import { useMemo, useRef, useEffect, useCallback } from 'react'
import { useAppContext } from '../App'

const hudContainerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '24px',
  left: '24px',
  zIndex: 50,
  color: '#ccccdd',
  fontFamily: '"Courier New", "Consolas", monospace',
  fontSize: '13px',
  lineHeight: 1.8,
  background: 'rgba(10, 10, 30, 0.5)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  border: '1px solid rgba(100, 150, 255, 0.15)',
  borderRadius: '6px',
  padding: '12px 16px',
  pointerEvents: 'none',
}

const speedLinesContainerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  pointerEvents: 'none',
  zIndex: 40,
  overflow: 'hidden',
}

interface SpeedLine {
  id: number
  x: number
  y: number
  angle: number
  length: number
  opacity: number
}

const LINE_COUNT = 24

function generateLinePositions(): { x: number; y: number; baseAngle: number }[] {
  const lines: { x: number; y: number; baseAngle: number }[] = []
  for (let i = 0; i < LINE_COUNT; i++) {
    const edge = Math.floor(Math.random() * 4)
    let x: number, y: number, baseAngle: number
    switch (edge) {
      case 0:
        x = Math.random() * 100
        y = 2 + Math.random() * 8
        baseAngle = Math.PI / 2 + (Math.random() - 0.5) * 0.4
        break
      case 1:
        x = Math.random() * 100
        y = 90 + Math.random() * 8
        baseAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.4
        break
      case 2:
        x = 2 + Math.random() * 8
        y = Math.random() * 100
        baseAngle = (Math.random() - 0.5) * 0.4
        break
      default:
        x = 90 + Math.random() * 8
        y = Math.random() * 100
        baseAngle = Math.PI + (Math.random() - 0.5) * 0.4
        break
    }
    lines.push({ x, y, baseAngle })
  }
  return lines
}

export default function HUD() {
  const { shipState } = useAppContext()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const linePositionsRef = useRef(generateLinePositions())
  const prevSpeedRef = useRef(0)
  const velocityRef = useRef({ x: 0, y: 0, z: 0 })

  const updateSpeedLines = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const speed = shipState.speed
    const maxSpeed = 15
    const speedNorm = Math.min(speed / maxSpeed, 1)

    if (speedNorm < 0.01) return

    const lineLength = 10 + speedNorm * 30
    const lineOpacity = 0.15 + speedNorm * 0.35

    ctx.strokeStyle = `rgba(100, 150, 255, ${lineOpacity})`
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'

    const vx = velocityRef.current.x
    const vy = velocityRef.current.y
    const vz = velocityRef.current.z
    const moveAngleXZ = Math.atan2(vx, vz)
    const moveAngleVert = Math.atan2(vy, Math.sqrt(vx * vx + vz * vz))

    const lineBase = linePositionsRef.current
    for (let i = 0; i < lineBase.length; i++) {
      const lp = lineBase[i]
      const px = (lp.x / 100) * canvas.width
      const py = (lp.y / 100) * canvas.height

      const radialAngle = Math.atan2(py - canvas.height / 2, px - canvas.width / 2)
      const moveBias = Math.cos(radialAngle - moveAngleXZ) * 0.5
      const vertBias = Math.sin(radialAngle) * moveAngleVert * 0.3

      const angle = radialAngle + moveBias * 0.3 + vertBias * 0.2
      const adjustedLength = lineLength * (0.7 + Math.abs(moveBias) * 0.5)
      const adjustedOpacity = lineOpacity * (0.5 + Math.abs(moveBias) * 0.5)

      ctx.globalAlpha = adjustedOpacity
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(
        px + Math.cos(angle) * adjustedLength,
        py + Math.sin(angle) * adjustedLength
      )
      ctx.stroke()
    }

    ctx.globalAlpha = 1
  }, [shipState.speed])

  useEffect(() => {
    const animFrame = requestAnimationFrame(() => {
      updateSpeedLines()
    })
    return () => cancelAnimationFrame(animFrame)
  }, [updateSpeedLines])

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const ds = shipState.speed - prevSpeedRef.current
    if (Math.abs(ds) > 0.1) {
      velocityRef.current = {
        x: (shipState.position.x % 10) * ds * 0.1,
        y: (shipState.position.y % 10) * ds * 0.1,
        z: (shipState.position.z % 10) * ds * 0.1,
      }
    }
    prevSpeedRef.current = shipState.speed
  }, [shipState])

  return (
    <>
      <div style={hudContainerStyle}>
        <div style={{ color: 'rgba(100, 150, 255, 0.6)', fontSize: '11px', marginBottom: '4px' }}>
          飞船状态
        </div>
        <div>X: {shipState.position.x.toFixed(2)}</div>
        <div>Y: {shipState.position.y.toFixed(2)}</div>
        <div>Z: {shipState.position.z.toFixed(2)}</div>
        <div style={{ marginTop: '4px', color: '#6688ff' }}>
          速度: {shipState.speed.toFixed(2)} u/s
        </div>
      </div>
      <div style={speedLinesContainerStyle}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </>
  )
}
