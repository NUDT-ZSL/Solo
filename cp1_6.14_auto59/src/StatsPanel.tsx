import { useState, useMemo } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import type { Task, Member } from './types'

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
)

interface StatsPanelProps {
  tasks: Task[]
  members: Member[]
}

type ViewMode = 'day' | 'week' | 'month'

export default function StatsPanel({ tasks, members }: StatsPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('day')

  const memberStats = useMemo(() => {
    return members.map(member => {
      const memberTasks = tasks.filter(t => t.assigneeId === member.id)
      const totalTasks = memberTasks.length
      const completedTasks = memberTasks.filter(t => t.status === 'done').length
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      const totalHours = memberTasks.reduce((sum, t) => sum + t.estimatedHours, 0)

      return {
        member,
        totalTasks,
        completedTasks,
        completionRate,
        totalHours
      }
    })
  }, [tasks, members])

  const doughnutData = useMemo(() => ({
    labels: memberStats.map(s => s.member.name),
    datasets: [
      {
        data: memberStats.map(s => s.totalTasks),
        completionRates: memberStats.map(s => s.completionRate),
        backgroundColor: memberStats.map(s => s.member.color),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 8
      }
    ]
  }), [memberStats])

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: {
            size: 14
          },
          color: '#333',
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        titleFont: {
          size: 14,
          weight: 600 as const
        },
        bodyFont: {
          size: 13
        },
        padding: 14,
        cornerRadius: 8,
        boxPadding: 6,
        callbacks: {
          afterBody: function(context: any) {
            const dataIndex = context[0].dataIndex
            const stat = memberStats[dataIndex]
            return [
              '',
              `完成率: ${stat.completionRate}%`
            ]
          },
          label: function(context: any) {
            const stat = memberStats[context.dataIndex]
            return [
              `任务数: ${stat.totalTasks}`,
              `已完成: ${stat.completedTasks}`
            ]
          },
          beforeLabel: function(context: any) {
            const stat = memberStats[context.dataIndex]
            return stat.member.name
          }
        }
      }
    },
    cutout: '65%',
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 500
    }
  }), [memberStats])

  const barChartData = useMemo(() => {
    let labels: string[] = []
    let multiplier = 1

    if (viewMode === 'day') {
      labels = ['今天']
      multiplier = 1
    } else if (viewMode === 'week') {
      labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      multiplier = 7
    } else {
      labels = ['第1周', '第2周', '第3周', '第4周']
      multiplier = 4
    }

    const datasets = members.map(member => {
      const memberTasks = tasks.filter(t => t.assigneeId === member.id)
      const data = labels.map(() => {
        const randomFactor = 0.5 + Math.random() * 1
        return Math.round((memberTasks.reduce((sum, t) => sum + t.estimatedHours, 0) / multiplier) * randomFactor)
      })

      return {
        label: member.name,
        data,
        backgroundColor: member.color,
        borderRadius: 4
      }
    })

    return { labels, datasets }
  }, [viewMode, tasks, members])

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        titleFont: {
          size: 14,
          weight: 600 as const
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.raw} 小时`
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#666',
          font: {
            size: 12
          }
        }
      },
      y: {
        grid: {
          color: '#e0e0e0'
        },
        ticks: {
          color: '#666',
          font: {
            size: 12
          }
        },
        title: {
          display: true,
          text: '工作时长 (小时)',
          color: '#666',
          font: {
            size: 12
          }
        }
      }
    },
    animation: {
      duration: 500
    }
  }

  return (
    <div
      style={{
        height: '300px',
        background: '#f5f5f5',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        gap: '24px'
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
            成员工作负荷分布
          </h3>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
            累计工作时长
          </h3>
          <div style={{ display: 'flex', gap: '4px', background: '#e0e0e0', borderRadius: '8px', padding: '2px' }}>
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '6px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: viewMode === mode ? '#1976d2' : 'transparent',
                  color: viewMode === mode ? '#ffffff' : '#666'
                }}
              >
                {mode === 'day' ? '日' : mode === 'week' ? '周' : '月'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Bar data={barChartData} options={barOptions} />
        </div>
      </div>
    </div>
  )
}
