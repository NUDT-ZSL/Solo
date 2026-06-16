import { useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '../GameLogic'
import type { Tile, SoundWave, Particle } from '../types'

const COLORS = {
  bg: '#0A0E27',
  tile: '#1A1C3B',
  stoneWall: '#4A4C6E',
  crystalWall: '#3F51B5',
  crystalWallAlpha: 'rgba(63, 81, 181, 0.8)',
  metalStart: '#B0BEC5',
  metalEnd: '#78909C',
  fragment: '#FFD54F',
  path: '#1A1C3B',
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

export default function MazeView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

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

  const getTileSize = useCallback(() => {
    const { w, h } = getGridSize()
    if (w === 0 || h === 0) return 24
    const canvas = canvasRef.current
    if (!canvas) return 24
    const maxW = canvas.width / w
    const maxH = canvas.height / h
    return Math.max(8, Math.floor(Math.min(maxW, maxH)))
  }, [getGridSize])

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

    const tileSize = getTileSize()
    const mazePixelW = w * tileSize
    const mazePixelH = h * tileSize
    const offsetX = (canvas.width - mazePixelW) / 2
    const offsetY = (canvas.height - mazePixelH) / 2

    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const freqFactor = currentFrequency / 2000

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const tile: Tile = grid[r]?.[c]
        if (!tile) continue

        const px = offsetX + c * tileSize
        const py = offsetY + r * tileSize

        if (tile.type === 'wall') {
          if (tile.wallType === 'crystal') {
            ctx.fillStyle = COLORS.crystalWallAlpha
            ctx.fillRect(px, py, tileSize, tileSize)
            ctx.strokeStyle = `rgba(63, 81, 181, ${0.4 + freqFactor * 0.6})`
            ctx.lineWidth = 1
            ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1)
          } else if (tile.wallType === 'metal') {
            const grad = ctx.createLinearGradient(px, py, px + tileSize, py + tileSize)
            grad.addColorStop(0, COLORS.metalStart)
            grad.addColorStop(1, COLORS.metalEnd)
            ctx.fillStyle = grad
            ctx.fillRect(px, py, tileSize, tileSize)
          } else {
            ctx.fillStyle = COLORS.stoneWall
            ctx.fillRect(px, py, tileSize, tileSize)
          }
        } else if (tile.type === 'door') {
          if (tile.isOpen) {
            const animProgress = doorAnimations.get(tile.doorId || '') || 1
            ctx.fillStyle = COLORS.path
            ctx.fillRect(px, py, tileSize, tileSize)
            const doorWidth = tileSize * (1 - animProgress)
            ctx.fillStyle = COLORS.door
            ctx.globalAlpha = 1 - animProgress
            ctx.fillRect(px, py, doorWidth / 2, tileSize)
            ctx.fillRect(px + tileSize - doorWidth / 2, py, doorWidth / 2, tileSize)
            ctx.globalAlpha = 1
          } else {
            ctx.fillStyle = COLORS.door
            ctx.fillRect(px, py, tileSize, tileSize)
            const freqText = `${tile.doorFrequency || 0}`
            ctx.fillStyle = '#FFFFFF'
            ctx.font = `${Math.max(8, tileSize * 0.4)}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(freqText, px + tileSize / 2, py + tileSize / 2)
          }
        } else if (tile.type === 'fragment') {
          ctx.fillStyle = COLORS.path
          ctx.fillRect(px, py, tileSize, tileSize)

          const pulse = Math.sin(timestamp / 1000) * 0.3 + 0.7
          ctx.fillStyle = `rgba(255, 213, 79, ${pulse})`
          ctx.beginPath()
          ctx.arc(px + tileSize / 2, py + tileSize / 2, tileSize * 0.3, 0, Math.PI * 2)
          ctx.fill()

          const glowRadius = tileSize * 0.8 * pulse
          const glowGrad = ctx.createRadialGradient(
            px + tileSize / 2, py + tileSize / 2, 0,
            px + tileSize / 2, py + tileSize / 2, glowRadius
          )
          glowGrad.addColorStop(0, `rgba(255, 213, 79, ${0.3 * pulse})`)
          glowGrad.addColorStop(1, 'rgba(255, 213, 79, 0)')
          ctx.fillStyle = glowGrad
          ctx.fillRect(px - glowRadius, py - glowRadius, tileSize + glowRadius * 2, tileSize + glowRadius * 2)
        } else if (tile.type === 'start') {
          ctx.fillStyle = COLORS.start
          ctx.fillRect(px, py, tileSize, tileSize)
          ctx.fillStyle = '#FFFFFF'
          ctx.font = `${Math.max(8, tileSize * 0.5)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('S', px + tileSize / 2, py + tileSize / 2)
        } else if (tile.type === 'end') {
          ctx.fillStyle = COLORS.end
          ctx.fillRect(px, py, tileSize, tileSize)
          ctx.fillStyle = '#FFFFFF'
          ctx.font = `${Math.max(8, tileSize * 0.5)}px sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('E', px + tileSize / 2, py + tileSize / 2)
        } else {
          const tileHue = Math.floor(230 + freqFactor * 30)
          ctx.fillStyle = `hsl(${tileHue}, 25%, ${10 + freqFactor * 5}%)`
          ctx.fillRect(px, py, tileSize, tileSize)
        }
      }
    }

    for (const wave of activeWaves) {
      const waveColor = COLORS.waveColors[wave.waveType] || COLORS.waveColors.sine

      if (wave.active) {
        ctx.fillStyle = waveColor
        ctx.globalAlpha = 0.8
        ctx.beginPath()
        ctx.arc(
          offsetX + wave.position.x * tileSize,
          offsetY + wave.position.y * tileSize,
          tileSize * 0.25,
          0, Math.PI * 2
        )
        ctx.fill()
        ctx.globalAlpha = 1
      }

      if (wave.trail.length > 1) {
        ctx.beginPath()
        ctx.moveTo(
          offsetX + wave.trail[0].x * tileSize,
          offsetY + wave.trail[0].y * tileSize
        )
        for (let i = 1; i < wave.trail.length; i++) {
          ctx.lineTo(
            offsetX + wave.trail[i].x * tileSize,
            offsetY + wave.trail[i].y * tileSize
          )
        }
        ctx.strokeStyle = waveColor
        ctx.lineWidth = tileSize * 0.15
        ctx.globalAlpha = 0.5
        ctx.stroke()
        ctx.globalAlpha = 1

        for (let i = 0; i < wave.trail.length; i += 3) {
          const point = wave.trail[i]
          ctx.beginPath()
          ctx.arc(
            offsetX + point.x * tileSize,
            offsetY + point.y * tileSize,
            tileSize * 0.1 * point.alpha,
            0, Math.PI * 2
          )
          ctx.fillStyle = waveColor
          ctx.globalAlpha = point.alpha * 0.6
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
    }

    for (const p of particles) {
      const px = offsetX + p.x * tileSize
      const py = offsetY + p.y * tileSize
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.life / p.maxLife
      ctx.beginPath()
      ctx.arc(px, py, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    for (let i = 0; i < collectedFragments; i++) {
      const angle = collectedFragmentAngles[i] || 0
      const orbitRadius = tileSize * 1.5
      const fragX = offsetX + playerPos.x * tileSize + Math.cos(angle) * orbitRadius
      const fragY = offsetY + playerPos.y * tileSize + Math.sin(angle) * orbitRadius

      ctx.fillStyle = COLORS.fragment
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.arc(fragX, fragY, tileSize * 0.15, 0, Math.PI * 2)
      ctx.fill()

      const fragGlow = ctx.createRadialGradient(fragX, fragY, 0, fragX, fragY, tileSize * 0.4)
      fragGlow.addColorStop(0, 'rgba(255, 213, 79, 0.4)')
      fragGlow.addColorStop(1, 'rgba(255, 213, 79, 0)')
      ctx.fillStyle = fragGlow
      ctx.beginPath()
      ctx.arc(fragX, fragY, tileSize * 0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    const playerPx = offsetX + playerPos.x * tileSize + tileSize / 2
    const playerPy = offsetY + playerPos.y * tileSize + tileSize / 2
    const playerRadius = tileSize * 0.35

    const playerGlow = ctx.createRadialGradient(playerPx, playerPy, 0, playerPx, playerPy, playerRadius * 3)
    playerGlow.addColorStop(0, 'rgba(0, 229, 255, 0.3)')
    playerGlow.addColorStop(1, 'rgba(0, 229, 255, 0)')
    ctx.fillStyle = playerGlow
    ctx.beginPath()
    ctx.arc(playerPx, playerPy, playerRadius * 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = COLORS.player
    ctx.beginPath()
    ctx.arc(playerPx, playerPy, playerRadius, 0, Math.PI * 2)
    ctx.fill()

    const dirLen = tileSize * 0.5
    ctx.strokeStyle = COLORS.player
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playerPx, playerPy)
    ctx.lineTo(playerPx + playerDir.dx * dirLen, playerPy + playerDir.dy * dirLen)
    ctx.stroke()

    if (isPaused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '48px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('暂停', canvas.width / 2, canvas.height / 2)
    }

    if (isLevelComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
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
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
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
  }, [tick, getGrid, getGridSize, getTileSize, playerPos, playerDir, activeWaves, particles,
    isPaused, isLevelComplete, isGameOver, collectedFragments, collectedFragmentAngles,
    currentFrequency, doorAnimations, getDoors])

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
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    />
  )
}
