import React, { useState, useMemo } from 'react'
import { useGame } from '../context/GameContext'
import type { GameResult, FrameData } from '../types'

interface ResultPanelProps {
  onPlayAgain: () => void
}

function computeRatingDetail(result: GameResult): { score: number; breakdown: string[] } {
  const survivalScore = result.survivalRate * 0.4
  const breakdown: string[] = []

  breakdown.push(`存活率 ${result.survivalRate}% → +${Math.round(survivalScore * 100) / 100}分`)

  if (result.survivalRate >= 100) breakdown.push('🏆 全员存活加成')
  if (result.winner === 'player') breakdown.push('⚔️ 胜利基础分')
  else if (result.winner === 'enemy') breakdown.push('💀 失败扣分')

  const totalDamageScore = Math.min(result.totalDamage / 1000, 15)
  breakdown.push(`总伤害 ${result.totalDamage} → +${Math.round(totalDamageScore * 10) / 10}分`)

  const skillScore = Math.min(result.skillUsage * 2, 10)
  breakdown.push(`技能 ${result.skillUsage} 次 → +${skillScore}分`)

  const timeScore = result.duration < 60 ? 5 : result.duration < 120 ? 2 : 0
  if (timeScore > 0) breakdown.push(`速通 ${result.duration}s → +${timeScore}分`)

  const score = survivalScore * 100 + totalDamageScore + skillScore + timeScore
  return { score: Math.min(100, score), breakdown }
}

export const ResultPanel: React.FC<ResultPanelProps> = ({ onPlayAgain }) => {
  const { result, engine } = useGame()
  const [showReplay, setShowReplay] = useState(false)
  const [replayFrame, setReplayFrame] = useState(0)
  const [replaySpeed, setReplaySpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [cameraMode, setCameraMode] = useState<'top' | 'free'>('top')
  const [showBreakdown, setShowBreakdown] = useState(false)

  if (!result) return null

  const ratingDetail = useMemo(() => computeRatingDetail(result), [result])

  const frameData: FrameData[] = engine?.getFrameData() || []
  const totalFrames = frameData.length

  React.useEffect(() => {
    if (!isPlaying || !showReplay) return
    const interval = setInterval(() => {
      setReplayFrame(f => {
        if (f >= totalFrames - 1) {
          setIsPlaying(false)
          return totalFrames - 1
        }
        return f + replaySpeed
      })
    }, 33 / replaySpeed)
    return () => clearInterval(interval)
  }, [isPlaying, replaySpeed, showReplay, totalFrames])

  const ratingColors: Record<string, string> = {
    S: '#FFD700',
    A: '#4FC3F7',
    B: '#81C784',
    C: '#90A4AE'
  }

  const ratingDescriptions: Record<string, string> = {
    S: '完美指挥！',
    A: '出色表现！',
    B: '表现尚可',
    C: '仍需努力'
  }

  const winnerText = result.winner === 'player' ? '🏆 胜利！' :
    result.winner === 'enemy' ? '💀 失败...' : '⚖️ 平局'
  const winnerColor = result.winner === 'player' ? '#4FC3F7' :
    result.winner === 'enemy' ? '#FF5252' : '#FFC107'

  const currentFrame = frameData[Math.min(replayFrame, frameData.length - 1)]

  return (
    <>
      <div className="result-overlay">
        <div className="result-panel">
          <div className="result-winner" style={{ color: winnerColor }}>
            {winnerText}
          </div>

          <div className="rating-display">
            <span className="rating-label">评级</span>
            <span
              className="rating-value"
              style={{
                color: ratingColors[result.rating],
                textShadow: `0 0 30px ${ratingColors[result.rating]}80`
              }}
            >
              {result.rating}
            </span>
            <span className="rating-desc" style={{ color: ratingColors[result.rating] }}>
              {ratingDescriptions[result.rating]}
            </span>
          </div>

          <div className="result-stats">
            <div className="stat-row">
              <span className="stat-label">舰队存活率</span>
              <span className="stat-value">{result.survivalRate}%</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">总输出伤害</span>
              <span className="stat-value">{result.totalDamage}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">技能使用次数</span>
              <span className="stat-value">{result.skillUsage}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">战斗时长</span>
              <span className="stat-value">{result.duration} 秒</span>
            </div>
          </div>

          <button
            className="breakdown-toggle"
            onClick={() => setShowBreakdown(!showBreakdown)}
          >
            {showBreakdown ? '▼ 收起评分详情' : '▶ 查看评分详情'}
          </button>

          {showBreakdown && (
            <div className="rating-breakdown">
              {ratingDetail.breakdown.map((line, i) => (
                <div key={i} className="breakdown-line">{line}</div>
              ))}
              <div className="breakdown-total">
                综合得分：{Math.round(ratingDetail.score)} / 100
              </div>
            </div>
          )}

          <div className="result-actions">
            <button className="primary-btn" onClick={onPlayAgain}>
              🔄 再来一局
            </button>
            {frameData.length > 0 && (
              <button className="secondary-btn" onClick={() => setShowReplay(!showReplay)}>
                🎬 {showReplay ? '关闭回放' : '战斗回放'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showReplay && (
        <div className="replay-panel">
          <div className="replay-header">
            <h3>🎬 战斗回放</h3>
            <div className="camera-toggle">
              <button
                className={cameraMode === 'top' ? 'active' : ''}
                onClick={() => setCameraMode('top')}
              >俯视</button>
              <button
                className={cameraMode === 'free' ? 'active' : ''}
                onClick={() => setCameraMode('free')}
              >自由</button>
            </div>
          </div>

          <div className="replay-timeline">
            <span className="frame-label">
              帧 {Math.floor(replayFrame)} / {totalFrames}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(0, totalFrames - 1)}
              value={Math.min(replayFrame, Math.max(0, totalFrames - 1))}
              onChange={(e) => setReplayFrame(Number(e.target.value))}
              className="timeline-slider"
            />
          </div>

          <div className="replay-controls">
            <button onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
            </button>
            <button onClick={() => setReplaySpeed(0.5)} className={replaySpeed === 0.5 ? 'active' : ''}>
              0.5x
            </button>
            <button onClick={() => setReplaySpeed(1)} className={replaySpeed === 1 ? 'active' : ''}>
              1x
            </button>
            <button onClick={() => setReplaySpeed(2)} className={replaySpeed === 2 ? 'active' : ''}>
              2x
            </button>
            <button onClick={() => setReplayFrame(0)}>
              ⏮️ 重置
            </button>
          </div>

          {currentFrame && (
            <div className="replay-events">
              <h4>帧事件</h4>
              {currentFrame.events.length === 0 ? (
                <div className="no-events">此帧无事件</div>
              ) : (
                currentFrame.events.map(ev => (
                  <div key={ev.id} className="replay-event">
                    {ev.message}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
