import { useCallback } from 'react'
import type { ThemeVariable, ThemeColors } from '../hooks/useTheme'
import './DashboardPreview.css'

interface DashboardPreviewProps {
  onDrop: (variable: ThemeVariable, color: string) => void
  scopeId?: string
  customColors?: Partial<ThemeColors>
  title?: string
}

const STATS = [
  { label: '总用户', value: '12,847', change: '+12.5%', up: true },
  { label: '活跃率', value: '68.3%', change: '+3.2%', up: true },
  { label: '转化率', value: '4.7%', change: '-0.8%', up: false },
  { label: '平均收入', value: '¥3,240', change: '+8.1%', up: true },
]

const PROGRESS_ITEMS = [
  { label: '前端开发', value: 78 },
  { label: '后端开发', value: 55 },
  { label: 'UI设计', value: 92 },
  { label: '测试覆盖', value: 41 },
]

const TABLE_ROWS = [
  { name: '张三', role: '前端工程师', status: '在线', task: '12' },
  { name: '李四', role: '后端工程师', status: '离线', task: '8' },
  { name: '王五', role: 'UI设计师', status: '在线', task: '15' },
  { name: '赵六', role: '产品经理', status: '忙碌', task: '6' },
]

export default function DashboardPreview({ onDrop, scopeId, customColors, title }: DashboardPreviewProps) {
  const handleDrop = useCallback((e: React.DragEvent, variable: ThemeVariable) => {
    e.preventDefault()
    const color = e.dataTransfer.getData('text/plain')
    if (color) {
      onDrop(variable, color)
    }
    ;(e.currentTarget as HTMLElement).classList.remove('drop-target-active')
  }, [onDrop])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    ;(e.currentTarget as HTMLElement).classList.add('drop-target-active')
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    ;(e.currentTarget as HTMLElement).classList.remove('drop-target-active')
  }, [])

  const styleVars = customColors ? Object.entries(customColors).reduce((acc, [key, val]) => {
    acc[key] = val
    return acc
  }, {} as Record<string, string>) : undefined

  return (
    <div
      className="dashboard-preview"
      id={scopeId}
      style={styleVars as React.CSSProperties}
    >
      {title && <div className="dashboard-preview-label">{title}</div>}

      <h1
        className="dashboard-title drop-target"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, '--text-primary')}
        data-css-var="--text-primary"
      >
        数据仪表盘
      </h1>

      <div className="stats-grid">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="stat-card drop-target"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, '--bg-card')}
            data-css-var="--bg-card"
          >
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            <div className={`stat-change ${stat.up ? 'up' : 'down'}`}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      <div
        className="progress-card drop-target"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, '--progress-fill')}
        data-css-var="--progress-fill"
      >
        <h3 className="card-title">项目进度</h3>
        {PROGRESS_ITEMS.map((item) => (
          <div key={item.label} className="progress-item">
            <div className="progress-header">
              <span className="progress-label">{item.label}</span>
              <span className="progress-percent">{item.value}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="button-group">
        <button
          className="btn btn-primary drop-target"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, '--btn-primary')}
          data-css-var="--btn-primary"
        >
          主操作按钮
        </button>
        <button className="btn btn-secondary">
          次操作按钮
        </button>
        <button
          className="btn btn-accent drop-target"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, '--accent-secondary')}
          data-css-var="--accent-secondary"
        >
          强调按钮
        </button>
      </div>

      <div
        className="table-card drop-target"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, '--table-row-alt')}
        data-css-var="--table-row-alt"
      >
        <div className="table-header">
          <h3 className="card-title">团队成员</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              {['姓名', '角色', '状态', '任务'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row, i) => (
              <tr key={row.name} className={i % 2 === 1 ? 'alt-row' : ''}>
                <td className="cell-name">{row.name}</td>
                <td className="cell-role">{row.role}</td>
                <td>
                  <span className={`status-badge status-${row.status}`}>
                    {row.status}
                  </span>
                </td>
                <td className="cell-task">{row.task}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
