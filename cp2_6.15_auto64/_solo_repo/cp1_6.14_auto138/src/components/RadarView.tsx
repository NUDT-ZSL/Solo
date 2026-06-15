import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface RadarViewProps {
  cameraDirection: THREE.Vector3
  onViewChange: (view: 'front' | 'back' | 'left' | 'right') => void
}

export const RadarView: React.FC<RadarViewProps> = ({
  cameraDirection,
  onViewChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = 60

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(10, 10, 30, 0.6)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.2)'
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2)
    ctx.stroke()

    const directions = [0, Math.PI / 2, Math.PI, Math.PI * 1.5]
    directions.forEach((angle) => {
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      )
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.2)'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    const dir = new THREE.Vector2(
      -cameraDirection.x,
      -cameraDirection.z
    ).normalize()

    const arrowLength = radius * 0.8
    const arrowX = centerX + dir.x * arrowLength
    const arrowY = centerY + dir.y * arrowLength

    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(arrowX, arrowY)
    ctx.strokeStyle = '#a78bfa'
    ctx.lineWidth = 2
    ctx.stroke()

    const headLength = 8
    const headAngle = Math.PI / 6
    const arrowAngle = Math.atan2(dir.y, dir.x)
    
    ctx.beginPath()
    ctx.moveTo(arrowX, arrowY)
    ctx.lineTo(
      arrowX - headLength * Math.cos(arrowAngle - headAngle),
      arrowY - headLength * Math.sin(arrowAngle - headAngle)
    )
    ctx.lineTo(
      arrowX - headLength * Math.cos(arrowAngle + headAngle),
      arrowY - headLength * Math.sin(arrowAngle + headAngle)
    )
    ctx.closePath()
    ctx.fillStyle = '#a78bfa'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#a78bfa'
    ctx.fill()

    const labels = [
      { text: '前', angle: -Math.PI / 2, view: 'front' as const },
      { text: '后', angle: Math.PI / 2, view: 'back' as const },
      { text: '左', angle: Math.PI, view: 'left' as const },
      { text: '右', angle: 0, view: 'right' as const }
    ]

    labels.forEach(({ text, angle }) => {
      const x = centerX + Math.cos(angle) * (radius + 16)
      const y = centerY + Math.sin(angle) * (radius + 16)
      
      ctx.font = '10px sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, x, y)
    })
  }, [cameraDirection])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left - canvas.width / 2
    const y = e.clientY - rect.top - canvas.height / 2

    const angle = Math.atan2(y, x)
    const normalizedAngle = ((angle + Math.PI * 2) % (Math.PI * 2))

    let view: 'front' | 'back' | 'left' | 'right'
    
    if (normalizedAngle >= Math.PI * 1.75 || normalizedAngle < Math.PI * 0.25) {
      view = 'right'
    } else if (normalizedAngle >= Math.PI * 0.25 && normalizedAngle < Math.PI * 0.75) {
      view = 'back'
    } else if (normalizedAngle >= Math.PI * 0.75 && normalizedAngle < Math.PI * 1.25) {
      view = 'left'
    } else {
      view = 'front'
    }

    onViewChange(view)
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        zIndex: 100,
        background: 'rgba(10, 10, 30, 0.85)',
        borderRadius: 12,
        padding: 8,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = 'brightness(1)'
      }}
    >
      <canvas
        ref={canvasRef}
        width={160}
        height={160}
        onClick={handleClick}
        style={{
          cursor: 'pointer',
          display: 'block'
        }}
      />
    </div>
  )
}
