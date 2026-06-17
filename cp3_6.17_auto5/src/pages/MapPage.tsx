import { useState, useEffect } from 'react'
import KnowledgeGraph from '../components/KnowledgeGraph'
import { useRecommendPath } from '../hooks/useRecommendPath'
import type { Course, KnowledgePoint, Relation, User } from '../types'
import { DIFFICULTY_COLORS } from '../types'

export default function MapPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [points, setPoints] = useState<KnowledgePoint[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [filterTag, setFilterTag] = useState<string>('')
  const [selectedPoint, setSelectedPoint] = useState<KnowledgePoint | null>(null)
  const [pathTrigger, setPathTrigger] = useState(0)

  const isTeacher = currentUser?.role === 'teacher'

  const allTags = Array.from(new Set(points.flatMap(p => p.tags))).sort()

  const coursePoints = points.filter(p => p.courseId === selectedCourseId)
  const courseRelations = relations.filter(r => {
    const src = points.find(p => p.id === r.sourceId)
    const tgt = points.find(p => p.id === r.targetId)
    return src?.courseId === selectedCourseId && tgt?.courseId === selectedCourseId
  })

  const recommendPath = useRecommendPath(
    coursePoints,
    courseRelations,
    currentUser?.scores || {},
    currentUser?.reviewed || [],
    pathTrigger
  )

  const currentCourse = courses.find(c => c.id === selectedCourseId)

  useEffect(() => {
    Promise.all([
      fetch('/api/courses').then(r => r.json()),
      fetch('/api/points').then(r => r.json()).catch(() => []),
      fetch('/api/relations').then(r => r.json()).catch(() => []),
      fetch('/api/users').then(r => r.json())
    ]).then(([c, p, rel, u]) => {
      setCourses(c)
      if (Array.isArray(p)) setPoints(p)
      if (Array.isArray(rel)) setRelations(rel)
      setUsers(u)
      if (u.length > 0) setCurrentUser(u.find((x: User) => x.role === 'student') || u[0])
      if (c.length > 0) setSelectedCourseId(c[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedCourseId || courses.length === 0) return
    Promise.all([
      fetch(`/api/courses/${selectedCourseId}/points`).then(r => r.json()),
      fetch(`/api/courses/${selectedCourseId}/relations`).then(r => r.json())
    ]).then(([p, rel]) => {
      setPoints(prev => {
        const others = prev.filter(x => x.courseId !== selectedCourseId)
        return [...others, ...p]
      })
      setRelations(rel)
    })
  }, [selectedCourseId, courses.length])

  const handlePointMove = async (id: string, x: number, y: number) => {
    setPoints(prev => prev.map(p => (p.id === id ? { ...p, x, y } : p)))
    try {
      await fetch(`/api/points/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y })
      })
    } catch {}
  }

  const handleRelationCreate = async (sourceId: string, targetId: string) => {
    try {
      const res = await fetch('/api/relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetId })
      })
      if (res.ok) {
        const newRel = await res.json()
        setRelations(prev => [...prev, newRel])
      }
    } catch {}
  }

  const handleMarkReviewed = async (pointId: string) => {
    if (!currentUser) return
    const nextReviewed = currentUser.reviewed.includes(pointId)
      ? currentUser.reviewed
      : [...currentUser.reviewed, pointId]
    const updated = { ...currentUser, reviewed: nextReviewed }
    setCurrentUser(updated)
    setUsers(prev => prev.map(u => (u.id === currentUser.id ? updated : u)))
    try {
      await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewed: nextReviewed })
      })
    } catch {}
    setSelectedPoint(null)
  }

  const handleAddPoint = async () => {
    if (!selectedCourseId) return
    const title = prompt('请输入知识点标题：')
    if (!title) return
    const description = prompt('请输入知识点详情：') || ''
    const difficulty = (prompt('请输入难度（初级/中级/高级）：') as '初级' | '中级' | '高级') || '初级'
    const tagsInput = prompt('请输入标签（用逗号分隔，最多5个）：') || ''
    const tags = tagsInput.split(/[,，]/).map(t => t.trim()).filter(Boolean).slice(0, 5)
    const newPoint: Omit<KnowledgePoint, 'id'> = {
      courseId: selectedCourseId,
      title,
      description,
      difficulty,
      tags,
      x: 200 + Math.random() * 300,
      y: 200 + Math.random() * 200
    }
    try {
      const res = await fetch('/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPoint)
      })
      if (res.ok) {
        const p = await res.json()
        setPoints(prev => [...prev, p])
      }
    } catch {}
  }

  const currentPathIndex = recommendPath.findIndex(id => !currentUser?.reviewed.includes(id))

  return (
    <>
      <div className="graph-area">
        <KnowledgeGraph
          points={coursePoints}
          relations={courseRelations}
          recommendPath={recommendPath}
          filterTag={filterTag}
          isTeacher={isTeacher}
          onPointClick={setSelectedPoint}
          onPointMove={handlePointMove}
          onRelationCreate={handleRelationCreate}
        />
      </div>

      <div className="info-panel">
        <div className="panel-section">
          <div className="panel-title">🎯 课程信息</div>
          <select
            className="filter-select"
            style={{ width: '100%', marginBottom: 10 }}
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 12, color: '#616161', lineHeight: 1.6 }}>
            {currentCourse?.description}
          </div>
        </div>

        <div className="panel-section">
          <div className="panel-title">👤 当前用户</div>
          <select
            className="filter-select"
            style={{ width: '100%' }}
            value={currentUser?.id || ''}
            onChange={e => {
              const u = users.find(x => x.id === e.target.value)
              if (u) setCurrentUser(u)
              setPathTrigger(t => t + 1)
            }}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role === 'teacher' ? '教师' : '学生'})
              </option>
            ))}
          </select>
        </div>

        <div className="panel-section">
          <div className="panel-title">🏷️ 标签过滤</div>
          <select
            className="filter-select"
            style={{ width: '100%' }}
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
          >
            <option value="">显示全部标签</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        {isTeacher && (
          <div className="panel-section">
            <div className="panel-title">✏️ 教师操作</div>
            <button className="secondary-btn" style={{ width: '100%' }} onClick={handleAddPoint}>
              + 添加知识点
            </button>
          </div>
        )}

        <div className="panel-section">
          <div className="panel-title">📝 复习路径</div>
          <button
            className="primary-btn"
            style={{ marginBottom: 12 }}
            onClick={() => setPathTrigger(t => t + 1)}
            disabled={!currentUser || currentUser.role !== 'student'}
          >
            {pathTrigger === 0 ? '生成复习路径' : '重新生成路径'}
          </button>
          {recommendPath.length > 0 ? (
            <div className="path-list">
              {recommendPath.map((pid, idx) => {
                const p = coursePoints.find(x => x.id === pid)
                if (!p) return null
                const isDone = currentUser?.reviewed.includes(pid)
                const isCurrent = idx === currentPathIndex
                return (
                  <div
                    key={pid}
                    className={`path-item ${isCurrent ? 'current' : ''} ${isDone ? 'done' : ''}`}
                    onClick={() => setSelectedPoint(p)}
                  >
                    <div className="path-order">{idx + 1}</div>
                    <div className="path-info">
                      <div className="path-title">{p.title} {isDone && '✓'}</div>
                      <div className="path-difficulty">{p.difficulty}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-tip">
              {pathTrigger === 0 ? '点击上方按钮生成复习路径' : '暂无需要复习的知识点'}
            </div>
          )}
          {currentPathIndex >= 0 && recommendPath[currentPathIndex] && (
            <button
              className="success-btn"
              style={{ marginTop: 12 }}
              onClick={() => {
                const p = coursePoints.find(x => x.id === recommendPath[currentPathIndex])
                if (p) setSelectedPoint(p)
              }}
            >
              ▶ 开始复习下一节
            </button>
          )}
        </div>

        <div className="panel-section">
          <div className="panel-title">🎨 图例</div>
          <div className="legend-list">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: DIFFICULTY_COLORS['初级'] }}></span>
              初级知识点
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: DIFFICULTY_COLORS['中级'] }}></span>
              中级知识点
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: DIFFICULTY_COLORS['高级'] }}></span>
              高级知识点
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#1976d2', borderRadius: 0, height: 3 }}></span>
              前置关系
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#f44336', borderRadius: 0, height: 3 }}></span>
              推荐复习路径
            </div>
          </div>
        </div>
      </div>

      {selectedPoint && (
        <div className="detail-modal-overlay" onClick={() => setSelectedPoint(null)}>
          <div className="detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{selectedPoint.title}</div>
              <button className="modal-close" onClick={() => setSelectedPoint(null)}>
                ×
              </button>
            </div>
            <span
              className="difficulty-badge"
              style={{ background: DIFFICULTY_COLORS[selectedPoint.difficulty] }}
            >
              {selectedPoint.difficulty}
            </span>
            <div className="modal-description">{selectedPoint.description}</div>
            <div className="modal-tags">
              {selectedPoint.tags.map(tag => (
                <span key={tag} className="tag-item">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="modal-footer">
              {currentUser?.role === 'student' && currentUser.scores[selectedPoint.id] !== undefined && (
                <div className="score-info">
                  <span>测评得分</span>
                  <span
                    className={`score-value ${currentUser.scores[selectedPoint.id] < 60 ? 'weak' : ''}`}
                  >
                    {currentUser.scores[selectedPoint.id]} 分
                    {currentUser.scores[selectedPoint.id] < 60 && '（薄弱点）'}
                  </span>
                </div>
              )}
              {currentUser?.role === 'student' && (
                <button
                  className="success-btn"
                  disabled={currentUser.reviewed.includes(selectedPoint.id)}
                  onClick={() => handleMarkReviewed(selectedPoint.id)}
                >
                  {currentUser.reviewed.includes(selectedPoint.id) ? '✓ 已完成复习' : '完成复习'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
