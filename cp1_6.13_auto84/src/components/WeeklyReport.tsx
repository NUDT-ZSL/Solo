import React, { useMemo } from 'react'
import { usePetContext } from '../context/PetContext'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO, isWithinInterval, subDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface WeeklyReportProps {
  open: boolean
  onClose: () => void
}

const WeeklyReport: React.FC<WeeklyReportProps> = ({ open, onClose }) => {
  const { pets, currentPetId, tasks } = usePetContext()
  const currentPet = pets.find((p) => p._id === currentPetId)

  const reportData = useMemo(() => {
    const today = new Date()
    const weekStart = subDays(startOfWeek(today, { weekStartsOn: 1 }), currentPetId ? 0 : 0)
    const last7DaysStart = subDays(today, 6)
    const days = eachDayOfInterval({ start: last7DaysStart, end: today })

    const petIds = currentPetId ? [currentPetId] : pets.map((p) => p._id!).filter(Boolean)

    let feedingCount = 0
    let walkingCount = 0
    let walkingMinutes = 0
    let medicationCount = 0
    let vetCount = 0
    let completedCount = 0
    let totalCount = 0
    const abnormalNotes: string[] = []
    const dailyStats: { date: string; feeding: number; walking: number; completed: number; total: number }[] = []

    days.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayTasks = tasks.filter(
        (t) => petIds.includes(t.petId) && t.date === dateStr
      )
      let dayFeeding = 0
      let dayWalking = 0
      let dayCompleted = 0

      dayTasks.forEach((t) => {
        totalCount++
        if (t.completed) {
          completedCount++
          dayCompleted++
        }
        switch (t.category) {
          case 'feeding':
            feedingCount++
            dayFeeding++
            break
          case 'walking':
            walkingCount++
            dayWalking++
            walkingMinutes += 30
            break
          case 'medication':
            medicationCount++
            break
          case 'vet':
            vetCount++
            break
        }
        if (t.notes && (t.notes.includes('异常') || t.notes.includes('生病') || t.notes.includes('不舒服') || t.notes.includes('呕吐') || t.notes.includes('拉稀'))) {
          abnormalNotes.push(`${dateStr}: ${t.notes}`)
        }
      })

      dailyStats.push({
        date: format(day, 'MM/dd'),
        feeding: dayFeeding,
        walking: dayWalking,
        completed: dayCompleted,
        total: dayTasks.length,
      })
    })

    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return {
      feedingCount,
      walkingCount,
      walkingMinutes,
      medicationCount,
      vetCount,
      totalCount,
      completedCount,
      completionRate,
      abnormalNotes,
      dailyStats,
      dateRange: `${format(last7DaysStart, 'M月d日', { locale: zhCN })} - ${format(today, 'M月d日', { locale: zhCN })}`,
    }
  }, [tasks, pets, currentPetId])

  if (!open) return null

  const getGrade = (rate: number) => {
    if (rate >= 90) return { emoji: '🌟', text: '非常棒！', color: '#16a34a' }
    if (rate >= 70) return { emoji: '👍', text: '做得不错', color: '#22c55e' }
    if (rate >= 50) return { emoji: '💪', text: '继续加油', color: '#f59e0b' }
    return { emoji: '📝', text: '需要努力', color: '#ef4444' }
  }

  const grade = getGrade(reportData.completionRate)

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000040',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'modalFadeIn 0.3s ease-out',
        }}
      >
        <div
          style={{
            padding: '24px 28px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)',
            color: 'white',
            borderRadius: '20px 20px 0 0',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>📊 每周健康报告</div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>
                {currentPet ? currentPet.name : '全家宠物'} 的一周总结
              </h2>
              <div style={{ fontSize: '13px', marginTop: '6px', opacity: 0.9 }}>
                {reportData.dateRange}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
          <div
            style={{
              marginTop: '16px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div style={{ fontSize: '40px' }}>{grade.emoji}</div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>{grade.text}</div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                任务完成率：{reportData.completedCount}/{reportData.totalCount} ({reportData.completionRate}%)
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 28px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            {[
              { emoji: '🍽️', label: '喂食次数', value: reportData.feedingCount, unit: '次', color: '#f97316' },
              { emoji: '🐕', label: '遛狗总时长', value: reportData.walkingMinutes, unit: '分钟', color: '#22c55e' },
              { emoji: '💊', label: '用药次数', value: reportData.medicationCount, unit: '次', color: '#a855f7' },
              { emoji: '🏥', label: '就诊/体检', value: reportData.vetCount, unit: '次', color: '#ef4444' },
            ].map((item, i) => (
              <div
                key={item.label}
                style={{
                  background: `${item.color}08`,
                  border: `1px solid ${item.color}20`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  animation: `fadeInUp 0.3s ease-out ${0.05 * i}s both`,
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{item.emoji}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: item.color }}>
                  {item.value}
                  <span style={{ fontSize: '13px', fontWeight: 500, marginLeft: '2px' }}>{item.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>
              📅 每日任务统计
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {reportData.dailyStats.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ width: '56px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{d.date}</div>
                  <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#f97316' }}>
                      🍽️ {d.feeding}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#22c55e' }}>
                      🐕 {d.walking}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: d.total > 0 && d.completed === d.total ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                    {d.completed}/{d.total} ✓
                  </div>
                </div>
              ))}
            </div>
          </div>

          {reportData.abnormalNotes.length > 0 && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '14px 16px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#b91c1c', marginBottom: '8px' }}>
                ⚠️ 异常备注记录
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#7f1d1d', lineHeight: 1.8 }}>
                {reportData.abnormalNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          {reportData.abnormalNotes.length === 0 && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '14px 16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>✨</div>
              <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 500 }}>
                本周一切正常，{currentPet?.name || '毛孩子们'}状态良好！
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WeeklyReport
