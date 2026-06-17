import { useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '../GameLogic'
import type { Tile, SoundWave, Particle } from '../types'

const COLORS = {
  bg: '#0A0E27',
  tile: '#1A1C3B',
  path: '#1A1C3B',
  stoneWall: '#4A4C6E',
  crystalWall: '#3F51B5',
  metalStart: '#B0BEC5',
  metalEnd: '#78909C',
  wall: '#2A2C4E',
  fragment: '#FFD54F',
  start: '#4CAF50',
  end: '#FF5722',
  player: '#00E5FF',
  door: '#9C27B0',
  waveColors: {
    sine: '#00E5FF',
    square: '#FF4081',
    triangle: '#76FF03',
  },
}

const DEFAULT_CELL_SIZE = 60
const MIN_CELL_SIZE = 20
const WALL_THICKNESS = 3
const GLOW_WALL_THICKNESS = 4

interface TuningForkHit {
  doorId: string
  x: number
  y: number
  radius: number
}

export default function MazeView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const tuningForkRef = useRef<TuningForkHit[]>([])

  const playerPos = useGameStore(s => s.playerPos)
  const playerDir = useGameStore(s => s.playerDir)
  const activeWaves = useGameStore(s => s.activeWaves)
  const particles = useGameStore(s => s.particles)
  const isPaused = useGameStore(s => s.isPaused)
  const isLevelComplete = useGameStore(s => s.isLevelComplete)
  const isGameOver = useGameStore(s => s.isGameOver)
  const collectedFragments = useGameStore(s => s.collectedFragments)
  const collectedFragmentAngles = useGameStore(s => s.collectedFragmentAngles)
  const currentFrequency = useGameStore(s => s.currentFrequency)
  const doorAnimations = useGameStore(s => s.doorAnimations)
  const tick = useGameStore(s => s.tick)
  const getGrid = useGameStore(s => s.getGrid)
  const getGridSize = useGameStore(s => s.getGridSize)
  const getDoors = useGameStore(s => s.getDoors)
  const onTuningForkClick = useGameStore(s => s.onTuningForkClick)

  const getCellSize = useCallback(() => {
    const { w, h } = getGridSize()
    if (w === 0 || h === 0) return MIN_CELL_SIZE
    const canvas = canvasRef.current
    if (!canvas) return MIN_CELL_SIZE
    const maxW = canvas.width / w
    const maxH = canvas.height / h
    return Math.max(MIN_CELL_SIZE, Math.min(DEFAULT_CELL_SIZE, Math.floor(Math.min(maxW, maxH))))
  }, [getGridSize])

  const manhattanDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2)
  }

  const getFrequencyHue = (freq: number) => {
    const clampedFreq = Math.max(200, Math.min(2000, freq))
    const t = (clampedFreq - 200) / (2000 - 200)
    return 230 + t * 30
  }

  const drawWalls = (
    ctx: CanvasRenderingContext2D,
    grid: Tile[][],
    r: number,
    c: number,
    px: number,
    py: number,
    cellSize: number,
    isFragmentGlow: boolean,
    glowAlpha: number
  ) => {
    const { w, h } = getGridSize()

    const dirs = [
      { dr: -1, dc: 0, side: 'top' },
      { dr: 0, dc: 1, side: 'right' },
      { dr: 1, dc: 0, side: 'bottom' },
      { dr: 0, dc: -1, side: 'left' },
    ]

    ctx.save()

    for (const d of dirs) {
      const nr = r + d.dr
      const nc = c + d.dc

      let isWall = false
      let isFragmentWall = false

      if (nr < 0 || nr >= h || nc < 0 || nc >= w) {
        isWall = true
      } else {
        const neighbor = grid[nr]?.[nc]
        if (neighbor && neighbor.type === 'wall') {
          isWall = true
          isFragmentWall = neighbor.isFragmentWall || false
        }
      }

      if (isWall) {
        let x1 = px
        let y1 = py
        let x2 = px
        let y2 = py

        if (d.side === 'top') {
          x1 = px
          y1 = py
          x2 = px + cellSize
          y2 = py
        } else if (d.side === 'right') {
          x1 = px + cellSize
          y1 = py
          x2 = px + cellSize
          y2 = py + cellSize
        } else if (d.side === 'bottom') {
          x1 = px
          y1 = py + cellSize
          x2 = px + cellSize
          y2 = py + cellSize
        } else if (d.side === 'left') {
          x1 = px
          y1 = py
          x2 = px
          y2 = py + cellSize
        }

        if (isFragmentGlow && isFragmentWall) {
          ctx.strokeStyle = `rgba(255, 213, 79, ${glowAlpha})`
          ctx.lineWidth = GLOW_WALL_THICKNESS
          ctx.lineCap = 'square'
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }

        ctx.strokeStyle = COLORS.wall
        ctx.lineWidth = WALL_THICKNESS
        ctx.lineCap = 'square'
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }

    ctx.restore()
  }

  const drawTuningFork = (
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    cellSize: number,
    doorId: string,
    activated: boolean
  ) => {
    const centerX = px + cellSize / 2
    const centerY = py + cellSize / 2
    const forkSize = cellSize * 0.35
    const baseY = centerY + forkSize * 0.6
    const topY = centerY - forkSize * 0.4

    ctx.save()

    ctx.strokeStyle = activated ? '#FFD54F' : '#FFFFFF'
    ctx.fillStyle = activated ? '#FFD54F' : '#FFFFFF'
    ctx.lineWidth = Math.max(1.5, cellSize * 0.04)
    ctx.lineCap = 'round'

    ctx.beginPath()
    ctx.moveTo(centerX, baseY)
    ctx.lineTo(centerX, topY)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(centerX - forkSize * 0.3, topY, forkSize * 0.25, Math.PI, 0, true)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(centerX + forkSize * 0.3, topY, forkSize * 0.25, Math.PI, 0, true)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(centerX - forkSize * 0.3, topY)
    ctx.lineTo(centerX - forkSize * 0.3, topY + forkSize * 0.4)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(centerX + forkSize * 0.3, topY)
    ctx.lineTo(centerX + forkSize * 0.3, topY + forkSize * 0.4)
    ctx.stroke()

    ctx.fillRect(centerX - forkSize * 0.15, baseY, forkSize * 0.3, forkSize * 0.15)

    ctx.restore()

    tuningForkRef.current.push({
      doorId,
      x: centerX,
      y: centerY,
      radius: forkSize,
    })
  }

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05)
    lastTimeRef.current = timestamp

    tick(dt)

    const grid = getGrid()
    const { w, h } = getGridSize()
    if (w === 0 || h === 0) {
      animFrameRef.current = requestAnimationFrame(draw)
      return
    }

    tuningForkRef.current = []

    const cellSize = getCellSize()
    const mazePixelW = w * cellSize
    const mazePixelH = h * cellSize
    const offsetX = (canvas.width - mazePixelW) / 2
    const offsetY = (canvas.height - mazePixelH) / 2

    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const freqFactor = Math.max(0, Math.min(1, (currentFrequency - 200) / (2000 - 200)))
    const pathHue = getFrequencyHue(currentFrequency)
    const pulseAlpha = Math.sin(timestamp / 1000) * 0.3 + 0.7

    const fragmentPositions: { x: number; y: number; distance: number }[] = []
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const tile = grid[r]?.[c]
        if (tile && tile.type === 'fragment') {
          const dist = manhattanDistance(playerPos.x, playerPos.y, c, r)
          if (dist < 2) {
            fragmentPositions.push({ x: c, y: r, distance: dist })
          }
        }
      }
    }

    const isFragmentNearby = fragmentPositions.length > 0

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const tile: Tile = grid[r]?.[c]
        if (!tile) continue

        const px = offsetX + c * cellSize
        const py = offsetY + r * cellSize

        if (tile.type === 'wall') {
          if (tile.wallType === 'crystal') {
            const crystalAlpha = 0.5 + freqFactor * 0.5
            ctx.fillStyle = `rgba(63, 81, 181, ${crystalAlpha})`
            ctx.fillRect(px, py, cellSize, cellSize)
            ctx.strokeStyle = `rgba(63, 81, 181, ${0.4 + freqFactor * 0.6})`
            ctx.lineWidth = 1
            ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1)

            const pulseIntensity = Math.sin(timestamp / 500 + c + r) * 0.2 + 0.8
            ctx.strokeStyle = `rgba(100, 150, 255, ${pulseIntensity * freqFactor})`
            ctx.lineWidth = 2
            ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4)
          } else if (tile.wallType === 'metal') {
            const grad = ctx.createLinearGradient(px, py, px + cellSize, py + cellSize)
            grad.addColorStop(0, COLORS.metalStart)
            grad.addColorStop(1, COLORS.metalEnd)
            ctx.fillStyle = grad
            ctx.fillRect(px, py, cellSize, cellSize)
          } else {
            ctx.fillStyle = COLORS.stoneWall
            ctx.fillRect(px, py, cellSize, cellSize)
          }

          if (isFragmentNearby && tile.isFragmentWall) {
            ctx.strokeStyle = `rgba(255, 213, 79, ${pulseAlpha * 0.8})`
            ctx.lineWidth = GLOW_WALL_THICKNESS
            ctx.strokeRect(px + 2, py + 2, cellSize - 4, cellSize - 4)
          }
        } else if (tile.type === 'door') {
          if (tile.isOpen) {
            const animProgress = doorAnimations.get(tile.doorId || '') || 1
            ctx.fillStyle = `hsl(${pathHue}, 25%, ${10 + freqFactor * 5}%)`
            ctx.fillRect(px, py, cellSize, cellSize)

            const doorWidth = cellSize * (1 - animProgress)
            ctx.fillStyle = COLORS.door
            ctx.globalAlpha = 1 - animProgress * 0.5
            ctx.fillRect(px, py, doorWidth / 2, cellSize)
            ctx.fillRect(px + cellSize - doorWidth / 2, py, doorWidth / 2, cellSize)
            ctx.globalAlpha = 1
          } else {
            ctx.fillStyle = COLORS.door
            ctx.fillRect(px, py, cellSize, cellSize)

            const freqText = `${tile.doorFrequency || 0}`
            ctx.fillStyle = '#FFFFFF'
            ctx.font = `bold ${Math.max(10, cellSize * 0.35)}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillText(freqText, px + cellSize / 2, py + cellSize * 0.6)

            if (tile.hasTuningFork) {
              drawTuningFork(
                ctx,
                px,
                py,
                cellSize,
                tile.doorId || '',
                tile.tuningForkActivated || false
              )
            }
          }

          drawWalls(ctx, grid, r, c, px, py, cellSize, isFragmentNearby, pulseAlpha)
        } else if (tile.type === 'fragment') {
          const dist = manhattanDistance(playerPos.x, playerPos.y, c, r)
          const shouldGlow = dist < 2

          ctx.fillStyle = `hsl(${pathHue}, 25%, ${10 + freqFactor * 5}%)`
          ctx.fillRect(px, py, cellSize, cellSize)

          if (shouldGlow) {
            const glowRadius = cellSize * 0.8 * pulseAlpha
            const glowGrad = ctx.createRadialGradient(
              px + cellSize / 2, py + cellSize / 2, 0,
              px + cellSize / 2, py + cellSize / 2, glowRadius
            )
            glowGrad.addColorStop(0, `rgba(255, 213, 79, ${0.4 * pulseAlpha})`)
            glowGrad.addColorStop(1, 'rgba(255, 213, 79, 0)')
            ctx.fillStyle = glowGrad
            ctx.fillRect(px - glowRadius, py - glowRadius, cellSize + glowRadius * 2, cellSize + glowRadius * 2)
          }

          ctx.fillStyle = `rgba(255, 213, 79, ${pulseAlpha})`
          ctx.beginPath()
          ctx.arc(px + cellSize / 2, py + cellSize / 2, cellSize * 0.3, 0, Math.PI * 2)
          ctx.fill()

          drawWalls(ctx, grid, r, c, px, py, cellSize, shouldGlow, pulseAlpha)
        } else if (tile.type === 'start') {
          ctx.fillStyle = COLORS.start
          ctx.fillRect(px, py, cellSize, cellSize)
          ctx.fillStyle = '#FFFFFF'
          ctx.font = `bold ${Math.max(12, cellSize * 0.5)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('S', px + cellSize / 2, py + cellSize / 2)
          drawWalls(ctx, grid, r, c, px, py, cellSize, isFragmentNearby, pulseAlpha)
        } else if (tile.type === 'end') {
          ctx.fillStyle = COLORS.end
          ctx.fillRect(px, py, cellSize, cellSize)
          ctx.fillStyle = '#FFFFFF'
          ctx.font = `bold ${Math.max(12, cellSize * 0.5)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('E', px + cellSize / 2, py + cellSize / 2)
          drawWalls(ctx, grid, r, c, px, py, cellSize, isFragmentNearby, pulseAlpha)
        } else {
          ctx.fillStyle = `hsl(${pathHue}, 25%, ${10 + freqFactor * 5}%)`
          ctx.fillRect(px, py, cellSize, cellSize)
          drawWalls(ctx, grid, r, c, px, py, cellSize, isFragmentNearby, pulseAlpha)
        }
      }
    }

    for (const wave of activeWaves) {
      const waveColor = COLORS.waveColors[wave.waveType] || COLORS.waveColors.sine

      if (wave.trail.length > 1) {
        const firstPoint = wave.trail[0]
        const lastPoint = wave.trail[wave.trail.length - 1]

        const trailGrad = ctx.createLinearGradient(
          offsetX + firstPoint.x * cellSize,
          offsetY + firstPoint.y * cellSize,
          offsetX + lastPoint.x * cellSize,
          offsetY + lastPoint.y * cellSize
        )
        trailGrad.addColorStop(0, waveColor + 'FF')
        trailGrad.addColorStop(1, waveColor + '00')

        ctx.beginPath()
        ctx.moveTo(
          offsetX + wave.trail[0].x * cellSize,
          offsetY + wave.trail[0].y * cellSize
        )
        for (let i = 1; i < wave.trail.length; i++) {
          ctx.lineTo(
            offsetX + wave.trail[i].x * cellSize,
            offsetY + wave.trail[i].y * cellSize
          )
        }
        ctx.strokeStyle = trailGrad
        ctx.lineWidth = cellSize * 0.15
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.globalAlpha = 0.7
        ctx.stroke()
        ctx.globalAlpha = 1

        for (let i = 0; i < wave.trail.length; i++) {
          const point = wave.trail[i]
          const ageAlpha = point.alpha
          ctx.beginPath()
          ctx.arc(
            offsetX + point.x * cellSize,
            offsetY + point.y * cellSize,
            cellSize * 0.08 * ageAlpha + 1,
            0, Math.PI * 2
          )
          ctx.fillStyle = waveColor
          ctx.globalAlpha = ageAlpha * 0.5
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      if (wave.active) {
        ctx.fillStyle = waveColor
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.arc(
          offsetX + wave.position.x * cellSize,
          offsetY + wave.position.y * cellSize,
          cellSize * 0.25,
          0, Math.PI * 2
        )
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    for (const p of particles) {
      const px = offsetX + p.x * cellSize
      const py = offsetY + p.y * cellSize
      ctx.fillStyle = p.color
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
      ctx.beginPath()
      ctx.arc(px, py, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    for (let i = 0; i < collectedFragments; i++) {
      const angle = collectedFragmentAngles[i] || 0
      const orbitRadius = cellSize * 1.5
      const fragX = offsetX + playerPos.x * cellSize + Math.cos(angle) * orbitRadius
      const fragY = offsetY + playerPos.y * cellSize + Math.sin(angle) * orbitRadius

      const fragGlow = ctx.createRadialGradient(fragX, fragY, 0, fragX, fragY, cellSize * 0.5)
      fragGlow.addColorStop(0, 'rgba(255, 213, 79, 0.5)')
      fragGlow.addColorStop(1, 'rgba(255, 213, 79, 0)')
      ctx.fillStyle = fragGlow
      ctx.beginPath()
      ctx.arc(fragX, fragY, cellSize * 0.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = COLORS.fragment
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(fragX, fragY, cellSize * 0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    const playerPx = offsetX + playerPos.x * cellSize + cellSize / 2
    const playerPy = offsetY + playerPos.y * cellSize + cellSize / 2
    const playerRadius = cellSize * 0.35

    const playerGlow = ctx.createRadialGradient(playerPx, playerPy, 0, playerPx, playerPy, playerRadius * 3)
    playerGlow.addColorStop(0, 'rgba(0, 229, 255, 0.4)')
    playerGlow.addColorStop(0.5, 'rgba(0, 229, 255, 0.1)')
    playerGlow.addColorStop(1, 'rgba(0, 229, 255, 0)')
    ctx.fillStyle = playerGlow
    ctx.beginPath()
    ctx.arc(playerPx, playerPy, playerRadius * 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = COLORS.player
    ctx.beginPath()
    ctx.arc(playerPx, playerPy, playerRadius, 0, Math.PI * 2)
    ctx.fill()

    const dirLen = cellSize * 0.5
    ctx.strokeStyle = COLORS.player
    ctx.lineWidth = Math.max(2, cellSize * 0.06)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(playerPx, playerPy)
    ctx.lineTo(playerPx + playerDir.dx * dirLen, playerPy + playerDir.dy * dirLen)
    ctx.stroke()

    if (isPaused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 48px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('暂停', canvas.width / 2, canvas.height / 2)
      ctx.font = '18px sans-serif'
      ctx.fillText('按 ESC 继续', canvas.width / 2, canvas.height / 2 + 50)
    }

    if (isLevelComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#FFD54F'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('关卡完成！', canvas.width / 2, canvas.height / 2 - 20)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '20px sans-serif'
      ctx.fillText('按 Enter 进入下一关', canvas.width / 2, canvas.height / 2 + 30)
    }

    if (isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#FF5722'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 20)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '20px sans-serif'
      ctx.fillText('按 R 重新开始', canvas.width / 2, canvas.height / 2 + 30)
    }

    animFrameRef.current = requestAnimationFrame(draw)
  }, [tick, getGrid, getGridSize, getCellSize, playerPos, playerDir, activeWaves, particles,
    isPaused, isLevelComplete, isGameOver, collectedFragments, collectedFragmentAngles,
    currentFrequency, doorAnimations, getDoors])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clickX = (e.clientX - rect.left) * scaleX
    const clickY = (e.clientY - rect.top) * scaleY

    for (const fork of tuningForkRef.current) {
      const dx = clickX - fork.x
      const dy = clickY - fork.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= fork.radius * 1.5) {
        onTuningForkClick(fork.doorId)
        break
      }
    }
  }, [onTuningForkClick])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    lastTimeRef.current = 0
    animFrameRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        cursor: 'pointer',
      }}
    />
  )
}
