import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ProgressChart from '../components/ProgressChart'
import type { Member, ScoreRecord } from '../types'
import { formatDateDisplay, calculateAverage } from '../utils/dataHelper'

interface MemberDetailPageProps {
  members: Member[]
}

export default function MemberDetailPage({ members }: MemberDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [records, setRecords] = useState<ScoreRecord[]>([])
  const [loading, setLoading] = useState(true)

  const member = members.find(m => m.id === id)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/members/${id}/scores`)
      .then(res => res.json())
      .then(data => {
        setRecords(data.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (!member) {
    return <div className="page-container"><p className="empty-text">团员不存在</p></div>
  }

  const avgPitch = calculateAverage(records.map(r => r.pitch))
  const avgRhythm = calculateAverage(records.map(r => r.rhythm))
  const avgExpression = calculateAverage(records.map(r => r.expression))
  const overallAvg = calculateAverage([avgPitch, avgRhythm, avgExpression])

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
            ← 返回
          </button>
          <h1 className="page-title">{member.name} - 个人详情</h1>
          <p className="page-subtitle">{member.voicePart} · 加入于 {member.joinDate} · 共 {records.length} 次排演记录</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">综合平均分</div>
          <div className="stat-value" style={{ color: '#7c4dff' }}>{overallAvg}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">音准平均</div>
          <div className="stat-value" style={{ color: '#42a5f5' }}>{avgPitch}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">节奏平均</div>
          <div className="stat-value" style={{ color: '#66bb6a' }}>{avgRhythm}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">表现力平均</div>
          <div className="stat-value" style={{ color: '#ab47bc' }}>{avgExpression}</div>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : records.length === 0 ? (
        <div className="empty-text">暂无排演记录</div>
      ) : (
        <ProgressChart records={records} />
      )}

      {records.length > 0 && (
        <div className="records-list" style={{ marginTop: 24 }}>
          <h2 className="section-title">历史记录</h2>
          {[...records].reverse().map(record => (
            <div key={record.id} className="record-item">
              <div className="record-date">{formatDateDisplay(record.date)}</div>
              <div className="record-scores">
                <span className="score-tag" style={{ background: '#42a5f5' }}>音准 {record.pitch}</span>
                <span className="score-tag" style={{ background: '#66bb6a' }}>节奏 {record.rhythm}</span>
                <span className="score-tag" style={{ background: '#ab47bc' }}>表现力 {record.expression}</span>
              </div>
              {record.note && <div className="record-note">备注：{record.note}</div>}
              {record.songs.length > 0 && (
                <div className="record-songs">
                  {record.songs.map(s => (
                    <span key={s} className="song-tag">{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
