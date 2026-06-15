import { useState, useEffect } from 'react'
import {
  Pledge,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  getPledgeById,
  addMilestone,
  getCurrentUserId
} from './dataStore'

interface PledgeDetailProps {
  pledgeId: string
  onClose: () => void
  onUpdated: () => void
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

function compressImage(file: File, maxWidth: number = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = maxWidth / img.width
        const width = maxWidth
        const height = img.height * scale
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export default function PledgeDetail({ pledgeId, onClose, onUpdated }: PledgeDetailProps) {
  const [pledge, setPledge] = useState<Pledge | undefined>(getPledgeById(pledgeId))
  const [milestoneDate, setMilestoneDate] = useState(todayStr())
  const [milestoneSummary, setMilestoneSummary] = useState('')
  const [milestonePhoto, setMilestonePhoto] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const currentUserId = getCurrentUserId()
  const isOwn = pledge ? pledge.userId === currentUserId : false

  const maxSummary = 200
  const summaryCount = milestoneSummary.length
  const summaryCounterClass =
    summaryCount > maxSummary * 0.9
      ? summaryCount > maxSummary
        ? 'danger'
        : 'warning'
      : ''

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!pledge) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <p style={{ textAlign: 'center', padding: 40 }}>未找到该承诺</p>
          <button className="btn-primary" style={{ width: '100%' }} onClick={onClose}>
            返回
          </button>
        </div>
      </div>
    )
  }

  const sortedMilestones = [...pledge.milestones].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  )

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const compressed = await compressImage(file, 300)
      setMilestonePhoto(compressed)
    } catch (err) {
      console.error('图片处理失败:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmitMilestone = async () => {
    if (!milestoneSummary.trim() || isSubmitting) return
    if (milestoneSummary.length > maxSummary) return
    if (!milestoneDate) return

    setIsSubmitting(true)
    try {
      const updated = addMilestone(pledge.id, {
        date: milestoneDate,
        summary: milestoneSummary.trim(),
        photo: milestonePhoto || undefined
      })
      if (updated) {
        setPledge(updated)
        setMilestoneDate(todayStr())
        setMilestoneSummary('')
        setMilestonePhoto('')
        onUpdated()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <div className="modal-title">📍 {pledge.destination}</div>
            <div className="modal-meta" style={{ marginTop: 10 }}>
              <span
                className="category-tag"
                style={{ background: CATEGORY_COLORS[pledge.category] }}
              >
                {CATEGORY_LABELS[pledge.category]}
              </span>
              <span className="modal-info-item">
                🗓️ {formatDate(pledge.departureDate)}
              </span>
              <span className="user-badge">
                <span className="user-avatar" style={{ width: 18, height: 18, fontSize: 10 }}>
                  {pledge.userName.charAt(0)}
                </span>
                {pledge.userName}
                {isOwn && <span className="own-card-badge" style={{ marginLeft: 6 }}>我</span>}
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="modal-section">
          <div className="progress-label" style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: '#f8fafc' }}>完成进度</span>
            <span style={{ fontWeight: 700, color: '#22c55e', fontSize: 18 }}>{pledge.progress}%</span>
          </div>
          <div className="progress-bar" style={{ height: 12 }}>
            <div
              className="progress-fill"
              style={{ width: `${pledge.progress}%` }}
            />
          </div>
        </div>

        <div className="modal-section">
          <div className="section-title">💚 我的承诺</div>
          <div className="modal-description">{pledge.description}</div>
        </div>

        {isOwn && (
          <div className="add-milestone-section">
            <div className="add-milestone-title">
              <span>✅</span>
              添加完成记录
            </div>
            <div className="form-group">
              <label className="form-label">日期</label>
              <input
                type="date"
                className="form-input"
                value={milestoneDate}
                max={todayStr()}
                onChange={(e) => setMilestoneDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">总结（最多{maxSummary}字）</label>
              <textarea
                className="form-textarea"
                placeholder="分享今天的环保行动..."
                value={milestoneSummary}
                onChange={(e) => setMilestoneSummary(e.target.value)}
                maxLength={maxSummary}
              />
              <div className={`char-counter ${summaryCounterClass}`}>
                {summaryCount}/{maxSummary}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">现场照片（可选）</label>
              <label className="file-upload">
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
                <div className="file-upload-text">
                  {uploading ? '处理中...' : milestonePhoto ? '点击更换照片' : '📷 点击上传照片（自动压缩）'}
                </div>
              </label>
              {milestonePhoto && (
                <div className="file-preview">
                  <img src={milestonePhoto} alt="预览" />
                  <button
                    className="file-preview-remove"
                    onClick={() => setMilestonePhoto('')}
                    aria-label="移除照片"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  setMilestoneSummary('')
                  setMilestonePhoto('')
                  setMilestoneDate(todayStr())
                }}
              >
                清空
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmitMilestone}
                disabled={!milestoneSummary.trim() || isSubmitting || milestoneSummary.length > maxSummary}
                style={{
                  opacity: !milestoneSummary.trim() || isSubmitting || milestoneSummary.length > maxSummary ? 0.6 : 1,
                  cursor: !milestoneSummary.trim() || isSubmitting || milestoneSummary.length > maxSummary ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? '提交中...' : '提交记录'}
              </button>
            </div>
          </div>
        )}

        <div className="modal-section">
          <div className="section-title">
            <span>📜</span>
            完成记录
            <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
              ({sortedMilestones.length}条)
            </span>
          </div>

          {sortedMilestones.length === 0 ? (
            <div className="timeline-empty">
              {isOwn ? '还没有完成记录，去添加第一条吧！💪' : '旅行者还没有更新完成记录'}
            </div>
          ) : (
            <div className="timeline">
              {sortedMilestones.map((ms) => (
                <div key={ms.id} className="timeline-item">
                  <div className="timeline-date">{formatDate(ms.date)}</div>
                  <div className="timeline-summary">{ms.summary}</div>
                  {ms.photo && (
                    <div className="timeline-photo">
                      <img src={ms.photo} alt="记录照片" loading="lazy" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
