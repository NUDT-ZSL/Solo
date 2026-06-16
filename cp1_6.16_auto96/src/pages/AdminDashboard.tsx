import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import type { Application, ApplicationStatus } from '../logic/AdoptionLogic'
import { transitionStatus, canTransition } from '../logic/AdoptionLogic'
import '../styles/AdminDashboard.css'

function AdminDashboard() {
  const { isLoggedIn, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [applications, setApplications] = useState<Application[]>([])
  const [loadingApps, setLoadingApps] = useState(false)
  const [highlightId, setHighlightId] = useState<number | null>(null)

  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [processingAction, setProcessingAction] = useState(false)

  useEffect(() => {
    if (isLoggedIn) {
      loadApplications()
    }
  }, [isLoggedIn])

  const loadApplications = async () => {
    setLoadingApps(true)
    try {
      const response = await fetch('/api/applications')
      if (response.ok) {
        const data = await response.json()
        setApplications(data)
      }
    } catch (error) {
      console.error('Failed to load applications:', error)
    } finally {
      setLoadingApps(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoggingIn(true)

    try {
      const success = await login(username, password)
      if (!success) {
        setLoginError('用户名或密码错误')
      }
    } catch (error) {
      setLoginError('登录失败，请稍后重试')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleActionClick = (app: Application, action: 'approve' | 'reject') => {
    const targetStatus: ApplicationStatus = action === 'approve' ? 'approved' : 'rejected'
    if (!canTransition(app.status, targetStatus)) {
      alert('当前状态无法进行此操作')
      return
    }

    setSelectedApp(app)
    setActionType(action)
    setShowConfirm(true)
  }

  const handleConfirmAction = async () => {
    if (!selectedApp) return

    const targetStatus: ApplicationStatus = actionType === 'approve' ? 'approved' : 'rejected'

    try {
      transitionStatus(selectedApp.status, targetStatus)
    } catch (e) {
      alert('状态转换无效')
      return
    }

    setProcessingAction(true)

    try {
      const response = await fetch(`/api/applications/${selectedApp.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: targetStatus }),
      })

      if (response.ok) {
        const updatedApp = await response.json()
        setApplications((prev) =>
          prev.map((app) => (app.id === selectedApp.id ? updatedApp : app))
        )
        setHighlightId(selectedApp.id)
        setTimeout(() => setHighlightId(null), 3000)
      }
    } catch (error) {
      console.error('Failed to update application:', error)
      alert('操作失败，请稍后重试')
    } finally {
      setProcessingAction(false)
      setShowConfirm(false)
      setSelectedApp(null)
    }
  }

  const getStatusLabel = (status: ApplicationStatus) => {
    const labels = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
    }
    return labels[status]
  }

  const getStatusClass = (status: ApplicationStatus) => {
    return `status-tag status-${status}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isLoggedIn) {
    return (
      <div className="admin-login">
        <div className="login-card">
          <h2>管理员登录</h2>
          <p className="login-tip">默认账号：admin / admin123</p>

          {loginError && <div className="form-error">{loginError}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label>密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="login-btn" disabled={loggingIn}>
              {loggingIn ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>申请管理</h1>
        <p className="subtitle">共 {applications.length} 条申请记录</p>
      </div>

      {loadingApps ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="applications-table">
              <thead>
                <tr>
                  <th>申请人</th>
                  <th>联系电话</th>
                  <th>申请动物</th>
                  <th>匹配度</th>
                  <th>提交时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className={highlightId === app.id ? 'highlight-row' : ''}
                  >
                    <td>{app.applicantName}</td>
                    <td>{app.phone}</td>
                    <td>{app.animalName}</td>
                    <td>
                      <span className="match-score">{app.matchScore}分</span>
                    </td>
                    <td>{formatDate(app.createdAt)}</td>
                    <td>
                      <span className={getStatusClass(app.status)}>
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                    <td>
                      {app.status === 'pending' && (
                        <div className="action-buttons">
                          <button
                            className="action-btn approve"
                            onClick={() => handleActionClick(app, 'approve')}
                          >
                            通过
                          </button>
                          <button
                            className="action-btn reject"
                            onClick={() => handleActionClick(app, 'reject')}
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                      {app.status !== 'pending' && (
                        <span className="no-action">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cards-container">
            {applications.map((app) => (
              <div
                key={app.id}
                className={`application-card ${
                  highlightId === app.id ? 'highlight-row' : ''
                }`}
              >
                <div className="card-header">
                  <span className="card-applicant">{app.applicantName}</span>
                  <span className={getStatusClass(app.status)}>
                    {getStatusLabel(app.status)}
                  </span>
                </div>
                <div className="card-body">
                  <div className="card-item">
                    <span className="label">联系电话</span>
                    <span className="value">{app.phone}</span>
                  </div>
                  <div className="card-item">
                    <span className="label">申请动物</span>
                    <span className="value">{app.animalName}</span>
                  </div>
                  <div className="card-item">
                    <span className="label">匹配度</span>
                    <span className="value match-score">{app.matchScore}分</span>
                  </div>
                  <div className="card-item">
                    <span className="label">提交时间</span>
                    <span className="value">{formatDate(app.createdAt)}</span>
                  </div>
                </div>
                {app.status === 'pending' && (
                  <div className="card-footer">
                    <button
                      className="action-btn approve"
                      onClick={() => handleActionClick(app, 'approve')}
                    >
                      通过
                    </button>
                    <button
                      className="action-btn reject"
                      onClick={() => handleActionClick(app, 'reject')}
                    >
                      拒绝
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {showConfirm && selectedApp && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>确认操作</h3>
            <p>
              确定要
              <strong className={actionType === 'approve' ? 'approve-text' : 'reject-text'}>
                {actionType === 'approve' ? '通过' : '拒绝'}
              </strong>
              {selectedApp.applicantName} 对 {selectedApp.animalName} 的领养申请吗？
            </p>
            <div className="confirm-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowConfirm(false)}
                disabled={processingAction}
              >
                取消
              </button>
              <button
                className={`confirm-btn ${actionType}`}
                onClick={handleConfirmAction}
                disabled={processingAction}
              >
                {processingAction ? '处理中...' : actionType === 'approve' ? '确认通过' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
