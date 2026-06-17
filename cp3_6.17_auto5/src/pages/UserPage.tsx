import { useEffect, useState } from 'react'
import { api } from '../services/api'
import type { User, AssessmentRecord } from '../types'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../components/KnowledgeGraph'

interface UserPageProps {
  currentUser: User | null
  onUserChange: (user: User | null) => void
}

export default function UserPage({ currentUser, onUserChange }: UserPageProps) {
  const [users, setUsers] = useState<User[]>([])
  const [assessments, setAssessments] = useState<Record<string, AssessmentRecord>>({})
  const [knowledgePoints, setKnowledgePoints] = useState<any[]>([])

  useEffect(() => {
    api.getUsers().then(setUsers)
    api.getKnowledgePoints('course-1').then(setKnowledgePoints)
  }, [])

  useEffect(() => {
    if (currentUser) {
      api.getAssessments(currentUser.id).then(setAssessments)
    }
  }, [currentUser])

  function handleScoreChange(kpId: string, score: number) {
    if (!currentUser) return
    const clamped = Math.max(0, Math.min(100, score))
    api.updateAssessment(currentUser.id, kpId, { score: clamped }).then(rec => {
      setAssessments(prev => ({ ...prev, [kpId]: rec }))
    })
  }

  const avgScore =
    Object.values(assessments).length > 0
      ? Math.round(
          Object.values(assessments).reduce((s, a) => s + a.score, 0) /
            Object.values(assessments).length
        )
      : 0

  const weakCount = Object.values(assessments).filter(a => a.score < 60).length
  const reviewedCount = Object.values(assessments).filter(a => a.reviewed).length

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1a237e', marginBottom: 4 }}>
          👥 用户管理中心
        </h2>
        <p style={{ fontSize: 13, color: '#757575' }}>选择用户身份并管理测评数据</p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 14,
          marginBottom: 24
        }}
      >
        {users.map(user => (
          <button
            key={user.id}
            onClick={() => onUserChange(user)}
            style={{
              padding: 18,
              borderRadius: 10,
              border: currentUser?.id === user.id ? '2px solid #1a237e' : '1px solid #e0e0e0',
              background: currentUser?.id === user.id ? '#e8eaf6' : '#fff',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              transition: 'all 0.2s'
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: user.role === 'teacher' ? '#1a237e' : '#00bcd4',
                color: '#fff',
                fontSize: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}
            >
              {user.name.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#212121' }}>{user.name}</div>
              <div style={{ fontSize: 12, color: '#757575', marginTop: 2 }}>
                {user.role === 'teacher' ? '👨‍🏫 教师账号' : '👨‍🎓 学生账号'}
              </div>
              <div style={{ fontSize: 11, color: '#9e9e9e', marginTop: 2 }}>{user.email}</div>
            </div>
          </button>
        ))}
      </div>

      {currentUser && currentUser.role === 'student' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <div>
            <div
              style={{
                background: `linear-gradient(135deg, ${avgScore >= 60 ? '#4caf50' : '#f44336'}, ${
                  avgScore >= 60 ? '#66bb6a' : '#ef5350'
                })`,
                borderRadius: 12,
                padding: 20,
                color: '#fff',
                marginBottom: 16
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.9 }}>平均得分</div>
              <div style={{ fontSize: 48, fontWeight: 700, marginTop: 4 }}>{avgScore}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                {avgScore >= 80 ? '🎉 表现优秀！' : avgScore >= 60 ? '👍 继续加油！' : '💪 需要更多练习'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={statBoxStyle('#f44336')}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f44336' }}>{weakCount}</div>
                <div style={{ fontSize: 11, color: '#757575', marginTop: 2 }}>薄弱知识点</div>
              </div>
              <div style={statBoxStyle('#4caf50')}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#4caf50' }}>{reviewedCount}</div>
                <div style={{ fontSize: 11, color: '#757575', marginTop: 2 }}>已复习</div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              border: '1px solid #e0e0e0',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #e0e0e0',
                fontSize: 14,
                fontWeight: 600,
                color: '#1a237e'
              }}
            >
              📝 知识点测评得分
            </div>
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              {knowledgePoints.map(kp => {
                const rec = assessments[kp.id]
                const score = rec?.score ?? 0
                return (
                  <div
                    key={kp.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 18px',
                      borderBottom: '1px solid #f5f5f5'
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: DIFFICULTY_COLORS[kp.difficulty],
                        flexShrink: 0
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#212121', fontWeight: 500 }}>{kp.title}</div>
                      <div style={{ fontSize: 11, color: '#9e9e9e', marginTop: 2 }}>
                        {DIFFICULTY_LABELS[kp.difficulty]}
                        {rec?.reviewed && ' · ✓ 已复习'}
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={score}
                      onChange={e => handleScoreChange(kp.id, parseInt(e.target.value))}
                      style={{ width: 100 }}
                    />
                    <div
                      style={{
                        width: 44,
                        height: 32,
                        borderRadius: 6,
                        background:
                          score < 60 ? '#ffebee' : score < 80 ? '#fff8e1' : '#e8f5e9',
                        color:
                          score < 60 ? '#c62828' : score < 80 ? '#f57f17' : '#2e7d32',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 600
                      }}
                    >
                      {score}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {currentUser?.role === 'teacher' && (
        <div
          style={{
            background: '#e3f2fd',
            border: '1px solid #90caf9',
            borderRadius: 10,
            padding: 20,
            color: '#1565c0'
          }}
        >
          <h3 style={{ fontSize: 16, marginBottom: 10 }}>👨‍🏫 教师控制台</h3>
          <p style={{ fontSize: 13, lineHeight: 1.7 }}>
            您当前以教师身份登录。切换到「图谱页面」可以：
          </p>
          <ul style={{ fontSize: 13, lineHeight: 2, marginTop: 8, paddingLeft: 20 }}>
            <li>添加新课程和知识点</li>
            <li>拖拽节点调整知识图谱布局</li>
            <li>按住 Shift + 拖拽节点创建前置-后续关系</li>
            <li>查看所有知识点和关系的概览数据</li>
          </ul>
        </div>
      )}
    </div>
  )
}

const statBoxStyle = (color: string): React.CSSProperties => ({
  flex: 1,
  background: `${color}08`,
  border: `1px solid ${color}30`,
  borderRadius: 8,
  padding: 12,
  textAlign: 'center'
})
