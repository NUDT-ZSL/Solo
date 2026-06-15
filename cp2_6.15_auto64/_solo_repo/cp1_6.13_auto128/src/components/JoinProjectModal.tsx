import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../App'

interface Props {
  onClose: () => void
}

export default function JoinProjectModal({ onClose }: Props) {
  const { state, joinProject } = useAppContext()
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const projectList = state.projects.filter(p => p._id !== state.currentProject?._id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = inviteCode.trim().toUpperCase()
    if (!code || code.length !== 8) {
      setError('请输入8位邀请码')
      return
    }
    if (!state.currentProject) {
      setError('请先进入一个项目')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await joinProject(state.currentProject._id, code)
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || '加入失败，请检查邀请码')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3 className="modal-title">🔐 加入项目</h3>
        <p className="modal-subtitle">通过8位邀请码加入其他乐队项目</p>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">邀请码 *</label>
            <input
              type="text"
              className="form-input invite-code-input"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              placeholder="8位邀请码，如 A3B7K9M2"
              maxLength={8}
              autoFocus
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="modal-btn cancel" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="modal-btn primary" disabled={submitting}>
              {submitting ? '加入中...' : '加入项目'}
            </button>
          </div>
        </form>

        {projectList.length > 0 && (
          <>
            <div className="modal-divider" />
            <div className="quick-join-section">
              <div className="quick-join-label">或快速切换到已有项目：</div>
              <div className="quick-join-list">
                {projectList.map(p => (
                  <button
                    key={p._id}
                    className="quick-join-item"
                    onClick={() => {
                      navigate(`/project/${p._id}`)
                      onClose()
                    }}
                  >
                    <span
                      className="quick-join-color"
                      style={{ backgroundColor: p.themeColor }}
                    />
                    <span className="quick-join-name">{p.name}</span>
                    <span className="quick-join-status">{p.status}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
