import { useEffect, useRef } from 'react'
import { useGameStore } from '../store'
import type { JumpState, TrajectoryData } from '../types'

interface DataPanelProps {
  currentJumpState: JumpState | null
}

const FADE_DURATION = 300

const FADED_IDS_KEY = 'data_panel_faded_ids'

function loadFadedIds(): Set<number> {
  try {
    const raw = sessionStorage.getItem(FADED_IDS_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as number[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}

function saveFadedIds(set: Set<number>) {
  try {
    sessionStorage.setItem(FADED_IDS_KEY, JSON.stringify(Array.from(set)))
  } catch {
  }
}

const moduleFadedIds = loadFadedIds()

export function DataPanel({ currentJumpState }: DataPanelProps) {
  const { trajectories, lowFpsWarning } = useGameStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafIdRef = useRef<number | null>(null)
  const fadeStartMapRef = useRef<Map<number, number>>(new Map())
  const lastTrajIdsRef = useRef<Set<number>>(new Set())
  const trajectoriesRef = useRef<TrajectoryData[]>([])

  trajectoriesRef.current = trajectories

  useEffect(() => {
    const currentIds = new Set(trajectories.map((t) => t.id))
    const now = performance.now()
    for (const t of trajectories) {
      if (!lastTrajIdsRef.current.has(t.id)) {
        if (moduleFadedIds.has(t.id)) {
          fadeStartMapRef.current.set(t.id, now - FADE_DURATION - 1)
        } else {
          fadeStartMapRef.current.set(t.id, now)
        }
      }
    }
    for (const oldId of lastTrajIdsRef.current) {
      if (!currentIds.has(oldId)) {
        fadeStartMapRef.current.delete(oldId)
      }
    }
    lastTrajIdsRef.current = currentIds
  }, [trajectories])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let running = true

    const render = () => {
      if (!running) return
      drawChart(ctx, canvas.width, canvas.height, trajectoriesRef.current, fadeStartMapRef.current)
      rafIdRef.current = requestAnimationFrame(render)
    }

    rafIdRef.current = requestAnimationFrame(render)

    return () => {
      running = false
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      for (const [id, start] of fadeStartMapRef.current.entries()) {
        if (performance.now() - start >= FADE_DURATION) {
          moduleFadedIds.add(id)
        }
      }
      saveFadedIds(moduleFadedIds)
    }
  }, [])

  const latestTrajectory = trajectories[trajectories.length - 1]

  const displayHighestY = currentJumpState
    ? currentJumpState.currentHighestY.toFixed(1)
    : latestTrajectory
    ? latestTrajectory.highestY.toFixed(1)
    : '--'

  const displayLandingX = latestTrajectory ? latestTrajectory.landingX.toFixed(1) : '--'

  const displayAirTime = currentJumpState
    ? (performance.now() - currentJumpState.startTime).toFixed(0)
    : latestTrajectory
    ? latestTrajectory.airTimeMs.toFixed(0)
    : '--'

  return (
    <div
      style={{
        width: 300,
        backgroundColor: '#2D2D2D',
        borderRadius: 8,
        padding: 20,
        color: '#FFFFFF',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}
    >
      {lowFpsWarning && (
        <div
          style={{
            color: '#F44336',
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 12px',
            backgroundColor: 'rgba(244, 67, 54, 0.15)',
            borderRadius: 4,
            border: '1px solid rgba(244, 67, 54, 0.4)'
          }}
        >
          ⚠ 警告：平均帧率低于 55 FPS
        </div>
      )}

      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>跳跃数据</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <DataRow label="最高点 Y" value={`${displayHighestY} px`} highlight />
        <DataRow label="落地 X" value={`${displayLandingX} px`} />
        <DataRow
          label="滞空时间"
          value={`${displayAirTime} ms`}
          live={!!currentJumpState}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#AAA' }}>滞空时间统计</div>
        <canvas
          ref={canvasRef}
          width={260}
          height={170}
          style={{
            width: '100%',
            backgroundColor: '#1E1E1E',
            borderRadius: 6,
            display: 'block'
          }}
        />
      </div>

      {trajectories.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxHeight: 180,
            overflowY: 'auto',
            fontSize: 11,
            color: '#BBB'
          }}
        >
          <div style={{ fontWeight: 600, color: '#AAA', marginBottom: 4 }}>历史记录</div>
          {[...trajectories].reverse().map((t) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 8px',
                backgroundColor: '#1E1E1E',
                borderRadius: 3
              }}
            >
              <span>#{t.id}</span>
              <span>高:{t.highestY.toFixed(0)}</span>
              <span>落:{t.landingX.toFixed(0)}</span>
              <span>{t.airTimeMs.toFixed(0)}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function drawChart(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  trajectories: TrajectoryData[],
  fadeStartMap: Map<number, number>
) {
  const now = performance.now()
  const padL = 40
  const padR = 10
  const padT = 10
  const padB = 28

  ctx.clearRect(0, 0, w, h)

  const maxAir = Math.max(1500, ...trajectories.map((t) => t.airTimeMs))
  const chartW = w - padL - padR
  const chartH = h - padT - padB
  const barGap = 4
  const barCount = 10
  const barW = Math.max(8, (chartW - barGap * (barCount - 1)) / barCount)

  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(padL, padT)
  ctx.lineTo(padL, padT + chartH)
  ctx.lineTo(padL + chartW, padT + chartH)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${maxAir}ms`, padL - 4, padT)
  ctx.fillText('0', padL - 4, padT + chartH)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (let i = 0; i < barCount; i++) {
    const label = i < trajectories.length ? `#${trajectories.length - barCount + i + 1}` : ''
    const x = padL + i * (barW + barGap) + barW / 2
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText(label, x, padT + chartH + 6)
  }

  for (let i = 0; i < barCount; i++) {
    const trajIndex = trajectories.length - barCount + i
    if (trajIndex < 0) continue
    const traj = trajectories[trajIndex]

    let alpha = 1
    const fadeStart = fadeStartMap.get(traj.id)
    if (fadeStart !== undefined) {
      const elapsed = now - fadeStart
      if (elapsed < FADE_DURATION) {
        alpha = Math.max(0, elapsed / FADE_DURATION)
      }
    }

    const barH = (traj.airTimeMs / maxAir) * chartH
    const x = padL + i * (barW + barGap)
    const y = padT + chartH - barH

    ctx.fillStyle = `rgba(66, 165, 245, ${alpha})`
    ctx.fillRect(x, y, barW, barH)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText('最近10次滞空时间 (ms)', w / 2, h - 2)
}

function DataRow({
  label,
  value,
  highlight,
  live
}: {
  label: string
  value: string
  highlight?: boolean
  live?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px',
        backgroundColor: highlight ? 'rgba(255, 179, 71, 0.1)' : '#1E1E1E',
        borderRadius: 6,
        border: highlight ? '1px solid rgba(255, 179, 71, 0.3)' : 'none'
      }}
    >
      <span style={{ fontSize: 13, color: '#CCC' }}>
        {label}
        {live && (
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#4CAF50',
              marginLeft: 6,
              animation: 'blink 1s infinite'
            }}
          />
        )}
      </span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: highlight ? '#FFB347' : '#FFFFFF',
          fontFamily: 'monospace'
        }}
      >
        {value}
      </span>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
