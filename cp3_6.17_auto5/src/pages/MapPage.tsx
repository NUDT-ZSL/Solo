import { useEffect, useState } from 'react'
import KnowledgeGraph, { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../components/KnowledgeGraph'
import DetailModal from '../components/DetailModal'
import { useRecommendPath } from '../hooks/useRecommendPath'
import { api } from '../services/api'
import type {
  Course,
  KnowledgePoint,
  Relation,
  User,
  AssessmentRecord,
  AssessmentsMap,
  Difficulty
} from '../types'

interface MapPageProps {
  currentUser: User | null
}

const COURSE_ID = 'course-1'

export default function MapPage({ currentUser }: MapPageProps) {
  const [course, setCourse] = useState<Course | null>(null)
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([])
  const [relations, setRelations] = useState<Relation[]>([])
  const [assessments, setAssessments] = useState<AssessmentsMap>({})
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedKp, setSelectedKp] = useState<KnowledgePoint | null>(null)
  const [pathTrigger, setPathTrigger] = useState(0)
  const [recommendPath, setRecommendPathState] = useState<string[]>([])
  const [isTablet, setIsTablet] = useState(false)
  const [teacherForm, setTeacherForm] = useState({
    show: false,
    title: '',
    description: '',
    difficulty: 'beginner' as Difficulty,
    tags: ''
  })

  const computedPath = useRecommendPath({
    knowledgePoints,
    relations,
    assessments,
    trigger: pathTrigger
  })

  useEffect(() => {
    if (pathTrigger > 0) {
      setRecommendPathState(computedPath)
    }
  }, [computedPath, pathTrigger])

  const activePath = recommendPath.filter(id => !assessments[id]?.reviewed)

  useEffect(() => {
    async function load() {
      const [c, kps, rels] = await Promise.all([
        api.getCourse(COURSE_ID),
        api.getKnowledgePoints(COURSE_ID),
        api.getRelations(COURSE_ID)
      ])
      setCourse(c)
      setKnowledgePoints(kps)
      setRelations(rels)
    }
    load()
  }, [])

  useEffect(() => {
    if (currentUser) {
      api.getAssessments(currentUser.id).then(setAssessments)
    }
  }, [currentUser])

  useEffect(() => {
    function check() {
      setIsTablet(window.innerWidth <= 1024)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const isTeacher = currentUser?.role === 'teacher'

  async function handleNodeMove(id: string, x: number, y: number) {
    setKnowledgePoints(prev => prev.map(kp => (kp.id === id ? { ...kp, x, y } : kp)))
    await api.updateKnowledgePoint(id, { x, y })
  }

  async function handleRelationCreate(from: string, to: string) {
    try {
      const rel = await api.createRelation({ courseId: COURSE_ID, from, to })
      setRelations(prev => [...prev, rel])
    } catch (e) {
      console.warn('Relation exists or error')
    }
  }

  async function handleMarkReviewed(kpId: string) {
    if (!currentUser) return
    await api.updateAssessment(currentUser.id, kpId, { reviewed: true })
    setAssessments(prev => ({
      ...prev,
      [kpId]: { ...prev[kpId], reviewed: true }
    }))
    setRecommendPathState(prev => prev.filter(id => id !== kpId))
  }

  async function handleGeneratePath() {
    if (!currentUser) return
    try {
      const path = await api.getRecommendPath(currentUser.id, COURSE_ID)
      setRecommendPathState(path)
      setPathTrigger(Date.now())
    } catch (e) {
      console.error('Failed to get recommend path:', e)
    }
  }

  async function handleAddKp(e: React.FormEvent) {
    e.preventDefault()
    const tagArr = teacherForm.tags
      .split(/[,，\s]+/)
      .map(t => t.trim())
      .filter(Boolean)
      .slice(0, 5)

    const newKp = await api.createKnowledgePoint({
      courseId: COURSE_ID,
      title: teacherForm.title,
      description: teacherForm.description,
      difficulty: teacherForm.difficulty,
      tags: tagArr,
      x: 400 + Math.random() * 200,
      y: 300 + Math.random() * 200
    })
    setKnowledgePoints(prev => [...prev, newKp])
    setTeacherForm({ show: false, title: '', description: '', difficulty: 'beginner', tags: '' })
  }

  const weakCount = knowledgePoints.filter(
    kp => (assessments[kp.id]?.score ?? 100) < 60 && !assessments[kp.id]?.reviewed
  ).length

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isTablet ? 'column' : 'row',
        gap: 16,
        padding: 16,
        height: isTablet ? 'auto' : 'calc(100vh - 56px)'
      }}
    >
      <div
        style={{
          width: isTablet ? '100%' : '70%',
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          minHeight: isTablet ? '60vh' : 500
        }}
      >
        <KnowledgeGraph
          knowledgePoints={knowledgePoints}
          relations={relations}
          highlightPath={activePath}
          selectedTag={selectedTag}
          onNodeClick={setSelectedKp}
          onNodeMove={handleNodeMove}
          onRelationCreate={handleRelationCreate}
          isTeacher={isTeacher}
        />
      </div>

      <div
        style={{
          width: isTablet ? '100%' : '30%',
          background: '#f5f5f5',
          borderRadius: 8,
          padding: 16,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxHeight: isTablet ? 'none' : 'calc(100vh - 88px)'
        }}
      >
        {isTeacher ? (
          <>
            <div style={panelSectionStyle}>
              <div style={sectionTitleStyle}>
                <span>📚 教师控制台</span>
              </div>
              <button
                onClick={() => setTeacherForm(f => ({ ...f, show: !f.show }))}
                style={primaryBtnStyle}
              >
                + 添加知识点
              </button>

              {teacherForm.show && (
                <form onSubmit={handleAddKp} style={{ marginTop: 14 }}>
                  <div style={formItemStyle}>
                    <label style={formLabelStyle}>标题</label>
                    <input
                      value={teacherForm.title}
                      onChange={e => setTeacherForm(f => ({ ...f, title: e.target.value }))}
                      style={formInputStyle}
                      required
                    />
                  </div>
                  <div style={formItemStyle}>
                    <label style={formLabelStyle}>详情描述</label>
                    <textarea
                      value={teacherForm.description}
                      onChange={e => setTeacherForm(f => ({ ...f, description: e.target.value }))}
                      style={{ ...formInputStyle, minHeight: 80, resize: 'vertical' }}
                      required
                    />
                  </div>
                  <div style={formItemStyle}>
                    <label style={formLabelStyle}>难度</label>
                    <select
                      value={teacherForm.difficulty}
                      onChange={e =>
                        setTeacherForm(f => ({ ...f, difficulty: e.target.value as Difficulty }))
                      }
                      style={formInputStyle}
                    >
                      <option value="beginner">初级</option>
                      <option value="intermediate">中级</option>
                      <option value="advanced">高级</option>
                    </select>
                  </div>
                  <div style={formItemStyle}>
                    <label style={formLabelStyle}>标签（用逗号分隔，最多5个）</label>
                    <input
                      value={teacherForm.tags}
                      onChange={e => setTeacherForm(f => ({ ...f, tags: e.target.value }))}
                      style={formInputStyle}
                      placeholder="例如：基础, React, Hooks"
                    />
                  </div>
                  <button type="submit" style={{ ...primaryBtnStyle, width: '100%', marginTop: 4 }}>
                    确认添加
                  </button>
                </form>
              )}
            </div>

            <div style={panelSectionStyle}>
              <div style={sectionTitleStyle}>
                <span>📊 图谱概览</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <div style={statCardStyle('#1a237e')}>
                  <div style={statValueStyle}>{knowledgePoints.length}</div>
                  <div style={statLabelStyle}>知识点</div>
                </div>
                <div style={statCardStyle('#00bcd4')}>
                  <div style={statValueStyle}>{relations.length}</div>
                  <div style={statLabelStyle}>关系连线</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={panelSectionStyle}>
              <div style={sectionTitleStyle}>
                <span>🎯 复习路径</span>
              </div>

              <button onClick={handleGeneratePath} style={primaryBtnStyle}>
                🔮 生成复习路径
              </button>

              {activePath.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 13, color: '#757575', marginBottom: 8 }}>
                    为你推荐的复习顺序（共 {activePath.length} 个）：
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {activePath.map((id, idx) => {
                      const kp = knowledgePoints.find(k => k.id === id)
                      if (!kp) return null
                      const score = assessments[id]?.score
                      return (
                        <button
                          key={id}
                          onClick={() => setSelectedKp(kp)}
                          style={{
                            ...navBtnStyle,
                            borderColor: idx === 0 ? '#f44336' : '#e0e0e0',
                            background: idx === 0 ? '#fff5f5' : '#fff'
                          }}
                        >
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: idx === 0 ? '#f44336' : '#bdbdbd',
                              color: '#fff',
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              flexShrink: 0
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span style={{ flex: 1, textAlign: 'left', color: '#212121' }}>
                            {kp.title}
                          </span>
                          {typeof score === 'number' && (
                            <span
                              style={{
                                fontSize: 12,
                                color: score < 60 ? '#f44336' : '#4caf50',
                                fontWeight: 500
                              }}
                            >
                              {score}分
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {activePath.length > 0 && activePath[0] && (
                    <button
                      onClick={() => {
                        const next = knowledgePoints.find(k => k.id === activePath[0])
                        if (next) setSelectedKp(next)
                      }}
                      style={{ ...nextBtnStyle }}
                    >
                      下一节 →
                    </button>
                  )}
                </div>
              )}
            </div>

            <div style={panelSectionStyle}>
              <div style={sectionTitleStyle}>
                <span>📊 学习概览</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <div style={statCardStyle('#f44336')}>
                  <div style={statValueStyle}>{weakCount}</div>
                  <div style={statLabelStyle}>薄弱点</div>
                </div>
                <div style={statCardStyle('#4caf50')}>
                  <div style={statValueStyle}>
                    {Object.values(assessments).filter(a => a.reviewed).length}
                  </div>
                  <div style={statLabelStyle}>已复习</div>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, color: '#757575', marginBottom: 8 }}>难度分布</div>
                {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(d => {
                  const count = knowledgePoints.filter(kp => kp.difficulty === d).length
                  const total = knowledgePoints.length || 1
                  return (
                    <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: DIFFICULTY_COLORS[d]
                        }}
                      />
                      <span style={{ fontSize: 12, color: '#616161', width: 40 }}>
                        {DIFFICULTY_LABELS[d]}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          background: '#eeeeee',
                          borderRadius: 3,
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${(count / total) * 100}%`,
                            height: '100%',
                            background: DIFFICULTY_COLORS[d]
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, color: '#9e9e9e', width: 24 }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {selectedTag && (
          <div style={panelSectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#757575' }}>
                当前筛选：<span style={{ color: '#00bcd4', fontWeight: 500 }}>#{selectedTag}</span>
              </span>
              <button onClick={() => setSelectedTag(null)} style={clearBtnStyle}>
                清除
              </button>
            </div>
          </div>
        )}
      </div>

      <DetailModal
        kp={selectedKp}
        assessment={selectedKp ? assessments[selectedKp.id] : undefined}
        onClose={() => setSelectedKp(null)}
        onMarkReviewed={selectedKp ? () => handleMarkReviewed(selectedKp.id) : undefined}
        isInPath={selectedKp ? activePath.includes(selectedKp.id) : false}
      />
    </div>
  )
}

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  padding: 16,
  height: 'calc(100vh - 56px)',
  '@media (max-width: 1024px)': {
    flexDirection: 'column',
    height: 'auto'
  }
}

const graphAreaStyle: React.CSSProperties = {
  width: '70%',
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  overflow: 'hidden',
  minHeight: 500
}

const panelStyle: React.CSSProperties = {
  width: '30%',
  background: '#f5f5f5',
  borderRadius: 8,
  padding: 16,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 14
}

const panelSectionStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: 14,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#1a237e',
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 6
}

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 16px',
  borderRadius: 8,
  background: 'linear-gradient(135deg, #1a237e, #00bcd4)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  transition: 'transform 0.15s, box-shadow 0.15s'
}

const nextBtnStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 12,
  padding: '12px 16px',
  borderRadius: 8,
  background: 'linear-gradient(135deg, #f44336, #ff7043)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600
}

const navBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1.5px solid',
  background: '#fff',
  fontSize: 13,
  textAlign: 'left',
  transition: 'all 0.2s ease'
}

const statCardStyle = (color: string): React.CSSProperties => ({
  flex: 1,
  background: `${color}10`,
  borderTop: `3px solid ${color}`,
  borderRadius: 6,
  padding: 10,
  textAlign: 'center'
})

const statValueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: '#212121'
}

const statLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#757575',
  marginTop: 2
}

const formItemStyle: React.CSSProperties = {
  marginBottom: 12
}

const formLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: '#616161',
  marginBottom: 4,
  fontWeight: 500
}

const formInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #e0e0e0',
  fontSize: 13,
  color: '#212121'
}

const clearBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 4,
  background: '#f5f5f5',
  color: '#757575',
  fontSize: 12
}

export { COURSE_ID }
