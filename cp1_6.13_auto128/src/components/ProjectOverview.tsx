import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppContext } from '../App'
import ProgressPanel from './ProgressPanel'

const statusConfig: Record<string, { color: string; bg: string }> = {
  '创作中': { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  '排练中': { color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
  '已发布': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export default function ProjectOverview() {
  const { state, exportScore } = useAppContext()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [showInvite, setShowInvite] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  const project = state.currentProject
  if (!project || !id) return <div className="loading-page">加载中...</div>

  const status = statusConfig[project.status] || statusConfig['创作中']
  const visibleMembers = project.members.slice(0, 6)
  const extraCount = project.members.length - visibleMembers.length

  const handleExport = async () => {
    setExporting(true)
    try {
      await new Promise(r => setTimeout(r, 600))
      await exportScore(id, project.name)
    } finally {
      setExporting(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(project.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoinByCode = () => {
    window.dispatchEvent(new CustomEvent('showJoinModal'))
  }

  return (
    <div className="project-overview">
      <div className="overview-header">
        <div className="overview-header-main">
          <div
            className="overview-theme-bar"
            style={{ backgroundColor: project.themeColor }}
          />
          <div className="overview-header-info">
            <div className="overview-title-row">
              <h1 className="overview-title">{project.name}</h1>
              <span
                className="overview-status-badge"
                style={{ color: status.color, backgroundColor: status.bg }}
              >
                ● {project.status}
              </span>
            </div>
            <div className="overview-genres">
              {project.genres?.map((g, i) => (
                <span key={i} className="genre-tag">
                  {g}
                </span>
              ))}
              {project.genres?.length === 0 && (
                <span style={{ opacity: 0.5, fontSize: 13 }}>暂无风格标签</span>
              )}
            </div>
          </div>
        </div>
        <div className="overview-header-actions">
          <button className="overview-action-btn" onClick={() => setShowInvite(true)}>
            🔗 邀请成员
          </button>
          <button
            className="overview-action-btn primary"
            onClick={() => navigate(`/project/${id}/editor`)}
          >
            🎼 打开编辑器
          </button>
          <button
            className="overview-action-btn success"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? '导出中...' : '📤 导出乐谱'}
          </button>
        </div>
      </div>

      {project.description && (
        <div className="overview-description">
          <div className="overview-section-label">💡 灵感描述</div>
          <p className="overview-description-text">{project.description}</p>
        </div>
      )}

      <div className="overview-cards-row">
        <div className="overview-card">
          <div className="overview-section-label">👥 乐队成员</div>
          <div className="members-avatars-row">
            {visibleMembers.map((m, i) => (
              <div
                key={m.id}
                className="member-avatar-wrapper"
                style={{ zIndex: visibleMembers.length - i }}
                title={`${m.name} · ${m.role}`}
              >
                <img
                  src={m.avatar}
                  alt={m.name}
                  className="member-avatar-img"
                />
                {m.role === '队长' && (
                  <span className="member-captain-badge">👑</span>
                )}
              </div>
            ))}
            {extraCount > 0 && (
              <div className="member-avatar-wrapper member-more" title={`还有 ${extraCount} 位成员`}>
                +{extraCount}
              </div>
            )}
          </div>
          <div className="members-list">
            {project.members.map(m => (
              <div key={m.id} className="member-item">
                <img src={m.avatar} alt={m.name} className="member-item-avatar" />
                <span className="member-item-name">{m.name}</span>
                <span className={`member-item-role ${m.role === '队长' ? 'captain' : ''}`}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="overview-card timeline-card">
          <div className="overview-section-label">📅 创作时间线</div>
          <div className="timeline-scroll-wrapper">
            <div className="timeline-track">
              {project.timeline?.map((t, i) => (
                <div key={i} className="timeline-node" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className={`timeline-dot ${t.completed ? 'done' : ''}`} />
                  <div className="timeline-date">{formatDate(t.date)}</div>
                  <div className="timeline-label">{t.stage}</div>
                </div>
              ))}
              <div className="timeline-node upcoming">
                <div className="timeline-dot next" />
                <div className="timeline-date">即将到来</div>
                <div className="timeline-label">下一阶段</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overview-bottom-row">
        <div className="overview-bottom-left">
          <ProgressPanel />
        </div>
        <div className="overview-bottom-right">
          <div className="overview-card">
            <div className="overview-section-label">🎼 乐谱信息</div>
            <div className="score-info-grid">
              <div className="score-info-item">
                <div className="score-info-value">{state.paragraphs.length}</div>
                <div className="score-info-label">音乐段落</div>
              </div>
              <div className="score-info-item">
                <div className="score-info-value">
                  {state.paragraphs.reduce((sum, p) => sum + (p.connections?.length || 0), 0)}
                </div>
                <div className="score-info-label">连线关系</div>
              </div>
              <div className="score-info-item">
                <div className="score-info-value">
                  {formatDate(project.createdAt)}
                </div>
                <div className="score-info-label">创建日期</div>
              </div>
              <div className="score-info-item">
                <div className="score-info-value">
                  {formatDate(project.updatedAt)}
                </div>
                <div className="score-info-label">最近更新</div>
              </div>
            </div>
            <button
              className="open-editor-btn"
              onClick={() => navigate(`/project/${id}/editor`)}
            >
              前往乐谱编辑器 →
            </button>
          </div>

          <div className="overview-card">
            <div className="overview-section-label">🔐 项目管理</div>
            <div className="project-management">
              <div className="pm-row">
                <span className="pm-label">邀请码</span>
                <div className="pm-value-row">
                  <code className="invite-code">{project.inviteCode}</code>
                  <button className="pm-copy-btn" onClick={handleCopyCode}>
                    {copied ? '✓ 已复制' : '复制'}
                  </button>
                </div>
              </div>
              <div className="pm-row">
                <span className="pm-label">项目ID</span>
                <span className="pm-value small">{project._id}</span>
              </div>
              <div className="pm-row">
                <span className="pm-label">通过邀请码加入</span>
                <button className="pm-link-btn" onClick={handleJoinByCode}>
                  加入其他项目
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowInvite(false)}>✕</button>
            <h3 className="modal-title">🎉 邀请成员加入</h3>
            <p className="modal-subtitle">将此邀请码分享给乐队成员，他们即可通过邀请码加入项目</p>
            <div className="invite-code-box">
              <code>{project.inviteCode}</code>
              <button
                className="invite-code-copy-btn"
                onClick={handleCopyCode}
              >
                {copied ? '✓ 已复制' : '复制邀请码'}
              </button>
            </div>
            <div className="invite-hint">
              <p>💡 使用方法：</p>
              <ol>
                <li>成员登录 BandCollab Studio</li>
                <li>在任意项目中点击「加入其他项目」</li>
                <li>输入以上8位邀请码即可加入</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {exporting && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">正在生成乐谱...</div>
        </div>
      )}
    </div>
  )
}
