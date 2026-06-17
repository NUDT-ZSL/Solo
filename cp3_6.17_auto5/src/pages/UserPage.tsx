import { useState, useEffect } from 'react'
import type { Course, KnowledgePoint, User } from '../types'
import { DIFFICULTY_COLORS } from '../types'

export default function UserPage() {
  const [users, setUsers] = useState<User[]>([])
  const [points, setPoints] = useState<KnowledgePoint[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [editingScores, setEditingScores] = useState<Record<string, number>>({})
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState<'teacher' | 'student'>('student')

  useEffect(() => {
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/points').then(r => r.json()).catch(() => []),
      fetch('/api/courses').then(r => r.json())
    ]).then(([u, p, c]) => {
      setUsers(u)
      if (Array.isArray(p)) setPoints(p)
      setCourses(c)
      if (u.length > 0) {
        setSelectedUserId(u[0].id)
        setEditingScores({ ...u[0].scores })
      }
    })
  }, [])

  const selectedUser = users.find(u => u.id === selectedUserId) || null

  const handleSelectUser = (id: string) => {
    setSelectedUserId(id)
    const u = users.find(x => x.id === id)
    if (u) setEditingScores({ ...u.scores })
  }

  const handleScoreChange = (pointId: string, val: string) => {
    const n = Math.max(0, Math.min(100, parseInt(val) || 0))
    setEditingScores(prev => ({ ...prev, [pointId]: n }))
  }

  const handleSaveScores = async () => {
    if (!selectedUser) return
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: editingScores })
      })
      if (res.ok) {
        const updated = await res.json()
        setUsers(prev => prev.map(u => (u.id === selectedUser.id ? updated : u)))
      }
    } catch {}
  }

  const handleCreateUser = async () => {
    if (!newUserName.trim()) return
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName.trim(), role: newUserRole })
      })
      if (res.ok) {
        const u = await res.json()
        setUsers(prev => [...prev, u])
        setNewUserName('')
      }
    } catch {}
  }

  const handleResetReviewed = async () => {
    if (!selectedUser) return
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewed: [] })
      })
      if (res.ok) {
        const updated = await res.json()
        setUsers(prev => prev.map(u => (u.id === selectedUser.id ? updated : u)))
      }
    } catch {}
  }

  return (
    <>
      <div className="graph-area" style={{ background: '#fff', padding: 20 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 20, color: '#1a237e', marginBottom: 16 }}>👥 用户管理</h2>

          <div className="panel-section" style={{ marginBottom: 20 }}>
            <div className="panel-title">创建新用户</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                placeholder="输入用户名"
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
              />
              <select
                className="form-select"
                style={{ width: 120 }}
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value as 'teacher' | 'student')}
              >
                <option value="student">学生</option>
                <option value="teacher">教师</option>
              </select>
              <button className="primary-btn" style={{ width: 'auto' }} onClick={handleCreateUser}>
                创建
              </button>
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-title">用户列表（共 {users.length} 人）</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {users.map(u => (
                <div
                  key={u.id}
                  className={`user-card ${u.id === selectedUserId ? 'active' : ''}`}
                  onClick={() => handleSelectUser(u.id)}
                >
                  <span className="user-name">{u.name}</span>
                  <span className={`user-role ${u.role}`}>
                    {u.role === 'teacher' ? '教师' : '学生'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="info-panel">
        {selectedUser ? (
          <>
            <div className="panel-section">
              <div className="panel-title">📋 用户信息</div>
              <div style={{ marginBottom: 8, fontSize: 15, fontWeight: 500 }}>
                {selectedUser.name}
              </div>
              <div style={{ fontSize: 13, color: '#616161', marginBottom: 12 }}>
                角色：{selectedUser.role === 'teacher' ? '教师' : '学生'}
              </div>
              <div style={{ fontSize: 13, color: '#616161' }}>
                已复习：{selectedUser.reviewed.length} / {points.length} 个知识点
              </div>
              {selectedUser.role === 'student' && selectedUser.reviewed.length > 0 && (
                <button
                  className="secondary-btn"
                  style={{ marginTop: 12, width: '100%' }}
                  onClick={handleResetReviewed}
                >
                  重置复习进度
                </button>
              )}
            </div>

            {selectedUser.role === 'student' && (
              <div className="panel-section">
                <div className="panel-title">✏️ 测评得分</div>
                {courses.length > 0 && (
                  <select
                    className="filter-select"
                    style={{ width: '100%', marginBottom: 12 }}
                    disabled
                    defaultValue={courses[0]?.id || ''}
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                )}
                <div className="scores-grid">
                  {points.map(p => (
                    <div key={p.id} className="score-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: DIFFICULTY_COLORS[p.difficulty]
                          }}
                        ></span>
                        <span style={{ fontWeight: 500, fontSize: 11 }}>{p.title}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="score-input"
                        value={editingScores[p.id] ?? ''}
                        onChange={e => handleScoreChange(p.id, e.target.value)}
                        placeholder="未测"
                      />
                    </div>
                  ))}
                </div>
                <button className="primary-btn" style={{ marginTop: 12 }} onClick={handleSaveScores}>
                  保存得分
                </button>
              </div>
            )}

            {selectedUser.role === 'student' && (
              <div className="panel-section">
                <div className="panel-title">⚠️ 薄弱知识点</div>
                {(() => {
                  const weak = points.filter(p => (selectedUser.scores[p.id] || 100) < 60)
                  if (weak.length === 0) {
                    return <div className="empty-tip">暂无薄弱点，表现优秀！</div>
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {weak.map(p => (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: '#ffebee',
                            borderRadius: 4,
                            fontSize: 12
                          }}
                        >
                          <span>{p.title}</span>
                          <span style={{ color: '#f44336', fontWeight: 600 }}>
                            {selectedUser.scores[p.id]}分
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
          </>
        ) : (
          <div className="empty-tip">请选择一个用户</div>
        )}
      </div>
    </>
  )
}
