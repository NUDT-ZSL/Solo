import React from 'react'

export type CourseStatus = 'upcoming' | 'ongoing' | 'ended'

export interface Course {
  id: string
  name: string
  duration: number
  teacher: string
  maxStudents: number
  description: string
  startTime: string
  status: CourseStatus
  enrolledStudents: number
  studentIds: string[]
}

interface CourseCardProps {
  course: Course
  onEdit?: (course: Course) => void
  onDelete?: (course: Course) => void
  onClick?: (course: Course) => void
  showActions?: boolean
}

const statusConfig: Record<CourseStatus, { label: string; color: string }> = {
  upcoming: { label: '即将开课', color: '#3498db' },
  ongoing: { label: '进行中', color: '#2ecc71' },
  ended: { label: '已结束', color: '#95a5a6' }
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const EditIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const DeleteIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M15 6V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v2" />
  </svg>
)

const CourseCard: React.FC<CourseCardProps> = ({ course, onEdit, onDelete, onClick, showActions = true }) => {
  const config = statusConfig[course.status]

  return (
    <div
      onClick={() => onClick?.(course)}
      style={{
        width: 240,
        minHeight: 220,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        padding: 16,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxSizing: 'border-box'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          backgroundColor: config.color,
          color: '#ffffff',
          fontSize: 12,
          padding: '4px 10px',
          borderRadius: 8
        }}
      >
        {config.label}
      </div>

      <div style={{ marginTop: 28, fontSize: 16, fontWeight: 600, color: '#2c3e50', lineHeight: 1.3 }}>
        {course.name}
      </div>

      <div style={{ fontSize: 13, color: '#7f8c8d', lineHeight: 1.6, minHeight: 42 }}>
        {course.description || '暂无描述'}
      </div>

      <div style={{ fontSize: 13, color: '#34495e', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>教师：</span>
          <span style={{ fontWeight: 500 }}>{course.teacher}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>时长：</span>
          <span style={{ fontWeight: 500 }}>{course.duration}分钟</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>时间：</span>
          <span style={{ fontWeight: 500 }}>{formatTime(course.startTime)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>人数：</span>
          <span style={{ fontWeight: 500, color: course.enrolledStudents >= course.maxStudents ? '#e74c3c' : '#2ecc71' }}>
            {course.enrolledStudents}/{course.maxStudents}
          </span>
        </div>
      </div>

      {showActions && (onEdit || onDelete) && (
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            gap: 8,
            paddingTop: 12,
            borderTop: '1px solid #ecf0f1'
          }}
        >
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(course)
              }}
              style={{
                flex: 1,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '6px 8px',
                border: '1px solid #3498db',
                borderRadius: 8,
                background: 'transparent',
                color: '#3498db',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#3498db'
                e.currentTarget.style.color = '#ffffff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#3498db'
              }}
            >
              <EditIcon size={24} />
              <span>编辑</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(course)
              }}
              style={{
                flex: 1,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '6px 8px',
                border: '1px solid #e74c3c',
                borderRadius: 8,
                background: 'transparent',
                color: '#e74c3c',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e74c3c'
                e.currentTarget.style.color = '#ffffff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#e74c3c'
              }}
            >
              <DeleteIcon size={24} />
              <span>删除</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default CourseCard
