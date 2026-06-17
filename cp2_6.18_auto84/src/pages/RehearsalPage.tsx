import { useMemo, useState } from 'react'
import type { Member, ScoreRecord } from '../types'
import { PRESET_SONGS } from '../types'
import {
  buildRehearsalSummaries,
  filterSummariesByDate,
  filterSummariesBySongs,
  formatDateDisplay
} from '../utils/dataHelper'

interface RehearsalPageProps {
  members: Member[]
  allScores: ScoreRecord[]
  onSelectForScoring: (member: Member) => void
  refreshScores: () => void
}

export default function RehearsalPage({
  members,
  allScores,
  onSelectForScoring
}: RehearsalPageProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedSongs, setSelectedSongs] = useState<string[]>([])
  const [showDatePicker, setShowDatePicker] = useState(false)

  const summaries = useMemo(() => buildRehearsalSummaries(allScores), [allScores])
  const filteredByDate = useMemo(
    () => filterSummariesByDate(summaries, startDate, endDate),
    [summaries, startDate, endDate]
  )
  const finalList = useMemo(
    () => filterSummariesBySongs(filteredByDate, selectedSongs),
    [filteredByDate, selectedSongs]
  )

  const toggleSong = (song: string) => {
    setSelectedSongs(prev =>
      prev.includes(song) ? prev.filter(s => s !== song) : [...prev, song]
    )
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setSelectedSongs([])
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">排演记录</h1>
          <p className="page-subtitle">记录团员表现，筛选查看历史排演</p>
        </div>
      </div>

      <div className="members-quick-row">
        <div className="section-label">快速评分（选择团员）：</div>
        <div className="member-chips">
          {members.map(m => (
            <button
              key={m.id}
              className="member-chip ripple-parent"
              onClick={() => onSelectForScoring(m)}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-item date-filter-wrap">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            📅 {startDate || '开始'} ~ {endDate || '结束'}
          </button>
          {showDatePicker && (
            <div className="date-picker-popup">
              <div className="date-picker-row">
                <label>开始：</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="date-picker-row">
                <label>结束：</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
              <div className="date-picker-actions">
                <button className="btn btn-primary btn-sm" onClick={() => setShowDatePicker(false)}>确定</button>
              </div>
            </div>
          )}
        </div>

        <div className="filter-item">
          <span className="section-label">曲目：</span>
          <div className="song-filter-chips">
            {PRESET_SONGS.map(song => (
              <button
                key={song}
                className={`song-chip ${selectedSongs.includes(song) ? 'active' : ''}`}
                onClick={() => toggleSong(song)}
              >
                {song}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
          清除筛选
        </button>
      </div>

      <div className="records-grid">
        {finalList.length === 0 ? (
          <div className="empty-text">暂无符合条件的排演记录</div>
        ) : (
          finalList.map(summary => (
            <div key={summary.date} className="rehearsal-card">
              <div className="rehearsal-top">
                <div className="rehearsal-date">{formatDateDisplay(summary.date)}</div>
                <div className="rehearsal-count">
                  参演人数：{summary.memberCount} 人
                </div>
              </div>
              <div className="rehearsal-bars">
                <div className="bar-row">
                  <span className="bar-label">音准</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${summary.avgPitch}%`, background: '#42a5f5' }}
                    />
                  </div>
                  <span className="bar-value">{summary.avgPitch}</span>
                </div>
                <div className="bar-row">
                  <span className="bar-label">节奏</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${summary.avgRhythm}%`, background: '#66bb6a' }}
                    />
                  </div>
                  <span className="bar-value">{summary.avgRhythm}</span>
                </div>
                <div className="bar-row">
                  <span className="bar-label">表现力</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${summary.avgExpression}%`, background: '#ab47bc' }}
                    />
                  </div>
                  <span className="bar-value">{summary.avgExpression}</span>
                </div>
              </div>
              <div className="rehearsal-songs">
                {summary.songs.map(song => (
                  <span key={song} className="song-tag">{song}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
