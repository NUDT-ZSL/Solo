import { useCallback } from 'react'
import type { ThemeVariable } from '../hooks/useTheme'

interface DashboardPreviewProps {
  onDrop: (variable: ThemeVariable, color: string) => void
  style?: React.CSSProperties
  className?: string
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

function handleDragOver(e: React.DragEvent) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
  ;(e.currentTarget as HTMLElement).style.outline = '2px dashed var(--accent-primary)'
  ;(e.currentTarget as HTMLElement).style.outlineOffset = '2px'
}

function handleDragLeave(e: React.DragEvent) {
  ;(e.currentTarget as HTMLElement).style.outline = 'none'
}

export default function DashboardPreview({ onDrop, style, className }: DashboardPreviewProps) {
  const handleDrop = useCallback((e: React.DragEvent, variable: ThemeVariable) => {
    e.preventDefault()
    const color = e.dataTransfer.getData('text/plain')
    if (color) {
      onDrop(variable, color)
    }
    ;(e.currentTarget as HTMLElement).style.outline = 'none'
  }, [onDrop])

  return (
    <div
      className={className}
      style={{
        padding: '28px',
        height: '100%',
        overflowY: 'auto',
        backgroundColor: 'var(--bg-primary)',
        ...style,
      }}
    >
      <h1
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, '--text-primary')}
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '24px',
          cursor: 'default',
          borderRadius: '8px',
        }}
      >
        数据仪表盘
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {STATS.map((stat) => (
          <div
            key={stat.label}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, '--bg-card')}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 20px var(--shadow-color)',
              border: '1px solid var(--border-color)',
              cursor: 'default',
            }}
          >
            <div style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}>
              {stat.label}
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '4px',
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: '13px',
              color: stat.up ? 'var(--accent-secondary)' : '#e74c3c',
              fontWeight: 500,
            }}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, '--progress-fill')}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px var(--shadow-color)',
          border: '1px solid var(--border-color)',
        }}
      >
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '16px',
        }}>
          项目进度
        </h3>
        {PROGRESS_ITEMS.map((item) => (
          <div key={item.label} style={{ marginBottom: '14px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}>
              <span style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
              }}>
                {item.label}
              </span>
              <span style={{
                fontSize: '13px',
                color: 'var(--text-primary)',
                fontWeight: 500,
              }}>
                {item.value}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'var(--progress-bg)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${item.value}%`,
                height: '100%',
                backgroundColor: 'var(--progress-fill)',
                borderRadius: '4px',
                transition: 'width 0.6s ease-in-out, background-color 0.4s ease-in-out',
              }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        <button
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, '--btn-primary')}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--btn-primary)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.3s ease',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--btn-hover)'
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px var(--shadow-color)'
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--btn-primary)'
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
          }}
        >
          主操作按钮
        </button>
        <button
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px var(--shadow-color)'
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-card)'
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
          }}
        >
          次操作按钮
        </button>
        <button
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, '--accent-secondary')}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--accent-secondary)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px var(--shadow-color)'
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
          }}
        >
          强调按钮
        </button>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, '--table-row-alt')}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px var(--shadow-color)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            团队成员
          </h3>
        </div>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border-color)',
            }}>
              {['姓名', '角色', '状态', '任务'].map((h) => (
                <th key={h} style={{
                  padding: '12px 20px',
                  textAlign: 'left',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row, i) => (
              <tr
                key={row.name}
                style={{
                  backgroundColor: i % 2 === 1 ? 'var(--table-row-alt)' : 'transparent',
                  borderBottom: i < TABLE_ROWS.length - 1 ? '1px solid var(--border-color)' : 'none',
                }}
              >
                <td style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                }}>
                  {row.name}
                </td>
                <td style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                }}>
                  {row.role}
                </td>
                <td style={{ padding: '12px 20px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor:
                      row.status === '在线' ? 'var(--accent-secondary)' :
                      row.status === '忙碌' ? '#e67e22' : '#636e72',
                    color: '#ffffff',
                    opacity: row.status === '离线' ? 0.7 : 1,
                  }}>
                    {row.status}
                  </span>
                </td>
                <td style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  fontFamily: "'Cascadia Code', monospace",
                }}>
                  {row.task}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
