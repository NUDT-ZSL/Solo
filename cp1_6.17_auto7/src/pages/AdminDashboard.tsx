import { useState, useEffect } from 'react';
import type { ApplicationRecord, ApplicationStatus } from '../logic/AdoptionLogic';
import { transitionStatus } from '../logic/AdoptionLogic';

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getStatusClass(status: ApplicationStatus): string {
  switch (status) {
    case '待审核': return 'status-pending';
    case '已通过': return 'status-approved';
    case '已拒绝': return 'status-rejected';
  }
}

export default function AdminDashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [reviewTarget, setReviewTarget] = useState<ApplicationRecord | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setLoggedIn(true);
      loadApplications();
    }
  }, []);

  const loadApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (e) {
      console.error('加载申请记录失败:', e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('admin_token', data.token);
        setLoggedIn(true);
        loadApplications();
      } else {
        const err = await res.json();
        setLoginError(err.error || '登录失败');
      }
    } catch (e) {
      setLoginError('网络错误，请稍后重试');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setLoggedIn(false);
    setUsername('');
    setPassword('');
    setApplications([]);
  };

  const openReview = (app: ApplicationRecord) => {
    setReviewTarget(app);
  };

  const closeReview = () => {
    setReviewTarget(null);
  };

  const confirmReview = async (action: 'approve' | 'reject') => {
    if (!reviewTarget) return;
    try {
      const res = await fetch(`/api/applications/${reviewTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const updated = await res.json();
        const newStatus = transitionStatus(reviewTarget.status, action);
        setApplications((prev) =>
          prev.map((a) => (a.id === reviewTarget.id ? { ...a, status: newStatus } : a))
        );
        setHighlightedId(reviewTarget.id);
        setTimeout(() => setHighlightedId(null), 500);
        setSuccessMsg(action === 'approve' ? '已通过该领养申请' : '已拒绝该领养申请');
        setTimeout(() => setSuccessMsg(''), 2500);
      }
    } catch (e) {
      console.error('审核操作失败:', e);
    } finally {
      closeReview();
    }
  };

  const pendingCount = applications.filter((a) => a.status === '待审核').length;
  const approvedCount = applications.filter((a) => a.status === '已通过').length;
  const rejectedCount = applications.filter((a) => a.status === '已拒绝').length;

  if (!loggedIn) {
    return (
      <div className="admin-login">
        <div className="login-brand">
          <span className="login-icon">🔐</span>
        </div>
        <h2 className="admin-login-title">管理员登录</h2>
        <p className="admin-login-hint">使用账号 admin / admin123 登录</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">用户名</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>
          {loginError && <span className="form-error" style={{ display: 'block', marginBottom: 16 }}>{loginError}</span>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            登录
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>领养申请管理</h1>
          <p className="page-subtitle">
            共 {applications.length} 条申请记录
          </p>
        </div>
        <div className="admin-user">
          <span>欢迎，管理员</span>
          <button className="logout-btn" onClick={handleLogout}>退出登录</button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card stat-pending">
          <div className="stat-icon">⏳</div>
          <div>
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-label">待审核</div>
          </div>
        </div>
        <div className="stat-card stat-approved">
          <div className="stat-icon">✅</div>
          <div>
            <div className="stat-value">{approvedCount}</div>
            <div className="stat-label">已通过</div>
          </div>
        </div>
        <div className="stat-card stat-rejected">
          <div className="stat-icon">❌</div>
          <div>
            <div className="stat-value">{rejectedCount}</div>
            <div className="stat-label">已拒绝</div>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-text">暂无领养申请记录</div>
        </div>
      ) : (
        <>
          <div className="applications-table-wrapper">
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
                    className={highlightedId === app.id ? 'highlight' : ''}
                  >
                    <td>
                      <div className="applicant-cell">
                        <div className="applicant-avatar">{app.applicantName.charAt(0)}</div>
                        <div>
                          <div className="applicant-name">{app.applicantName}</div>
                          <div className="applicant-meta">{app.age}岁 · {app.housingType.join('/')}</div>
                        </div>
                      </div>
                    </td>
                    <td>{app.phone}</td>
                    <td>
                      <span className="animal-name-badge">🐾 {app.animalName}</span>
                    </td>
                    <td>
                      <div className="match-score">
                        <div
                          className="match-score-bar"
                          style={{
                            width: `${app.matchScore}%`,
                            backgroundColor: app.matchScore >= 70 ? '#27AE60' : app.matchScore >= 40 ? '#F39C12' : '#E74C3C'
                          }}
                        ></div>
                        <span className="match-score-text">{app.matchScore}分</span>
                      </div>
                    </td>
                    <td>{formatDate(app.submittedAt)}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td>
                      {app.status === '待审核' ? (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => openReview(app)}
                        >
                          审核
                        </button>
                      ) : (
                        <span className="action-disabled">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-cards">
            {applications.map((app) => (
              <div
                key={app.id}
                className={`mobile-card ${highlightedId === app.id ? 'highlight-mobile' : ''}`}
              >
                <div className="mobile-card-row">
                  <span className="mobile-card-label">申请人</span>
                  <span className="mobile-card-value">{app.applicantName} · {app.age}岁</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">联系电话</span>
                  <span className="mobile-card-value">{app.phone}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">申请动物</span>
                  <span className="mobile-card-value">🐾 {app.animalName}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">匹配度</span>
                  <span className="mobile-card-value">{app.matchScore}分</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">提交时间</span>
                  <span className="mobile-card-value">{formatDate(app.submittedAt)}</span>
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">状态</span>
                  <span className={`status-badge ${getStatusClass(app.status)}`}>
                    {app.status}
                  </span>
                </div>
                <div className="mobile-card-actions">
                  {app.status === '待审核' ? (
                    <button
                      className="btn btn-sm btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => openReview(app)}
                    >
                      审核申请
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {reviewTarget && (
        <div className="modal-overlay" onClick={closeReview}>
          <div
            className="modal-content confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ justifyContent: 'center', borderBottom: 'none', paddingBottom: 0 }}>
              <h2 className="modal-title">审核领养申请</h2>
            </div>
            <div className="modal-body" style={{ paddingTop: 12 }}>
              <div className="confirm-dialog-text">
                确定要<b style={{ color: '#4A4A4A' }}>
                  {reviewTarget.applicantName}
                </b>
                申请领养<b style={{ color: '#FF8C00' }}> {reviewTarget.animalName} </b>
                的申请进行审核？
              </div>
              <div className="review-summary">
                <div className="review-summary-item">
                  <span>匹配度</span>
                  <span style={{ fontWeight: 600, color: '#FF8C00' }}>{reviewTarget.matchScore}分</span>
                </div>
                <div className="review-summary-item">
                  <span>住房类型</span>
                  <span>{reviewTarget.housingType.join('、')}</span>
                </div>
                <div className="review-summary-item">
                  <span>已有宠物</span>
                  <span>{reviewTarget.hasExistingPets ? '是' : '否'}</span>
                </div>
                {reviewTarget.petExperience && (
                  <div className="review-summary-item" style={{ alignItems: 'flex-start' }}>
                    <span>养宠经验</span>
                    <span style={{ flex: 1, textAlign: 'right', lineHeight: 1.6 }}>
                      {reviewTarget.petExperience}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <div className="confirm-dialog-actions">
                <button
                  className="btn btn-danger"
                  onClick={() => confirmReview('reject')}
                >
                  ❌ 拒绝
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={closeReview}
                >
                  取消
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => confirmReview('approve')}
                >
                  ✅ 通过
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {successMsg && <div className="success-message">{successMsg}</div>}
    </div>
  );
}
