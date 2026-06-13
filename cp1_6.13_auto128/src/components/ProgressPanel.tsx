import React, { useState, useEffect } from 'react'
import { useAppContext } from '../App'
import { projectAPI } from '../api'
import type { StageConfirmation } from '../types'

const STAGE_LABELS = [
  { name: '创作', icon: '🎨', desc: '完成歌曲的旋律和歌词' },
  { name: '编曲', icon: '🎹', desc: '分配各乐器的演奏部分' },
  { name: '排练', icon: '🎸', desc: '乐队成员共同排练' },
  { name: '录制', icon: '🎙️', desc: '进入录音室完成录制' },
  { name: '发布', icon: '🚀', desc: '正式发布音乐作品' },
]

interface CircularProgressProps {
  percent: number
  size?: number
  strokeWidth?: number
}

function CircularProgress({ percent, size = 160, strokeWidth = 14 }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference
  const [animatedPercent, setAnimatedPercent] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercent(percent)
    }, 100)
    return () => clearTimeout(timer)
  }, [percent])

  const animatedOffset = circumference - (animatedPercent / 100) * circumference

  const gradientId = 'progressGradient'

  return (
    <div className="circular-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="none"
          opacity="0.15"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="circular-progress-content">
        <div className="circular-progress-percent">{animatedPercent}%</div>
        <div className="circular-progress-label">总体进度</div>
      </div>
    </div>
  )
}

interface StageItemProps {
  index: number
  label: typeof STAGE_LABELS[number]
  confirmation: StageConfirmation | undefined
  totalMembers: number
  onConfirm: (stageIndex: number) => void
  isCurrentUserConfirmed: boolean
  justCompleted: boolean
}

function StageItem({
  index,
  label,
  confirmation,
  totalMembers,
  onConfirm,
  isCurrentUserConfirmed,
  justCompleted,
}: StageItemProps) {
  const allConfirmed = confirmation?.allConfirmed || false
  const confirmedCount = confirmation?.confirmedBy.length || 0

  return (
    <div
      className={`stage-item ${allConfirmed ? 'completed' : ''} ${
        justCompleted ? 'just-completed' : ''
      }`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="stage-index">{String(index + 1).padStart(2, '0')}</div>
      <div className="stage-icon">{label.icon}</div>
      <div className="stage-info">
        <div className="stage-name">{label.name}</div>
        <div className="stage-desc">{label.desc}</div>
        <div className="stage-progress-bar">
          <div
            className="stage-progress-fill"
            style={{
              width: `${totalMembers > 0 ? (confirmedCount / totalMembers) * 100 : 0}%`,
              backgroundColor: allConfirmed ? '#22c55e' : '#6366f1',
            }}
          />
        </div>
        <div className="stage-progress-text">
          {confirmedCount} / {totalMembers} 人确认
        </div>
      </div>
      <div className="stage-checkbox-wrapper">
        <div className={`stage-checkbox ${allConfirmed ? 'checked' : ''}`}>
          {allConfirmed && <span className="stage-checkmark">✓</span>}
        </div>
      </div>
      <button
        className={`stage-confirm-btn ${
          isCurrentUserConfirmed ? 'confirmed' : ''
        } ${allConfirmed ? 'all-done' : ''}`}
        onClick={() => !allConfirmed && onConfirm(index)}
        disabled={allConfirmed || isCurrentUserConfirmed}
      >
        {allConfirmed ? '已完成' : isCurrentUserConfirmed ? '已确认' : '确认完成'}
      </button>
    </div>
  )
}

export default function ProgressPanel() {
  const { state, dispatch } = useAppContext()
  const [justCompletedStage, setJustCompletedStage] = useState<number | null>(null)
  const project = state.currentProject
  const userId = state.user?.id

  if (!project) return null

  const confirmations = project.confirmations || []
  const totalMembers = project.members.length
  const completedCount = confirmations.filter(c => c.allConfirmed).length
  const percent = Math.round((completedCount / STAGE_LABELS.length) * 100)

  const handleConfirm = async (stageIndex: number) => {
    if (!userId || !project) return
    try {
      const result = await projectAPI.confirm(project._id, {
        stageIndex,
        memberId: userId,
      })
      if (result.allConfirmed) {
        setJustCompletedStage(stageIndex)
        setTimeout(() => setJustCompletedStage(null), 600)
      }
      const updatedConfirmations = await projectAPI.getConfirmations(project._id)
      dispatch({ type: 'UPDATE_CONFIRMATIONS', payload: updatedConfirmations })
      const updatedProject = await projectAPI.get(project._id)
      dispatch({ type: 'UPDATE_PROJECT', payload: updatedProject })
    } catch (err) {
      console.error('确认阶段失败:', err)
    }
  }

  return (
    <div className="progress-panel">
      <div className="progress-header">
        <h3 className="progress-title">📊 排练进度</h3>
      </div>

      <div className="progress-ring-wrapper">
        <CircularProgress percent={percent} />
        <div className="progress-ring-summary">
          <div className="progress-summary-item">
            <span className="progress-summary-icon">✅</span>
            <span className="progress-summary-count">{completedCount}</span>
            <span className="progress-summary-label">已完成阶段</span>
          </div>
          <div className="progress-summary-item">
            <span className="progress-summary-icon">⏳</span>
            <span className="progress-summary-count">{STAGE_LABELS.length - completedCount}</span>
            <span className="progress-summary-label">待完成阶段</span>
          </div>
          <div className="progress-summary-item">
            <span className="progress-summary-icon">👥</span>
            <span className="progress-summary-count">{totalMembers}</span>
            <span className="progress-summary-label">参与成员</span>
          </div>
        </div>
      </div>

      <div className="stages-divider" />

      <div className="stages-list">
        {STAGE_LABELS.map((label, index) => {
          const confirmation = confirmations.find(c => c.stageIndex === index)
          const isCurrentUserConfirmed =
            userId ? confirmation?.confirmedBy.includes(userId) || false : false
          return (
            <StageItem
              key={index}
              index={index}
              label={label}
              confirmation={confirmation}
              totalMembers={totalMembers}
              onConfirm={handleConfirm}
              isCurrentUserConfirmed={isCurrentUserConfirmed}
              justCompleted={justCompletedStage === index}
            />
          )
        })}
      </div>
    </div>
  )
}
