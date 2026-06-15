import { useState, useEffect } from 'react'
import type { Task, Member, Priority, TaskStatus } from './types'
import { getPriorityColor } from './utils'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (task: Omit<Task, 'id' | 'createdAt'>) => void
  members: Member[]
  milestones: string[]
}

export default function TaskModal({ isOpen, onClose, onCreate, members, milestones }: TaskModalProps) {
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [milestone, setMilestone] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedHours, setEstimatedHours] = useState(8)

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setAssigneeId(members[0]?.id || '')
      setPriority('medium')
      setMilestone(milestones[0] || '')
      setDescription('')
      setEstimatedHours(8)
    }
  }, [isOpen, members, milestones])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onCreate({
      title: title.slice(0, 40),
      status: 'todo' as TaskStatus,
      assigneeId,
      priority,
      milestone,
      description,
      estimatedHours
    })
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        style={{
          width: '500px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          padding: '24px',
          animation: 'scaleIn 0.2s ease-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#333' }}>
            新建任务
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              background: 'transparent',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: '#999',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f0f0f0'
              e.currentTarget.style.color = '#333'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#999'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '6px' }}>
              任务标题 <span style={{ color: '#ff5252' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 40))}
              placeholder="请输入任务标题（最多40字）"
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                border: '1px solid #d0d0d0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1976d2'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d0d0d0'
              }}
            />
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px', textAlign: 'right' }}>
              {title.length}/40
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '6px' }}>
              负责人
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                border: '1px solid #d0d0d0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                background: '#ffffff',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1976d2'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d0d0d0'
              }}
            >
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
              优先级
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['high', 'medium', 'low'] as Priority[]).map(p => (
                <label
                  key={p}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `2px solid ${priority === p ? getPriorityColor(p) : '#e0e0e0'}`,
                    background: priority === p ? `${getPriorityColor(p)}15` : 'transparent',
                    transition: 'all 0.2s ease',
                    fontSize: '14px',
                    fontWeight: priority === p ? 600 : 400,
                    color: priority === p ? getPriorityColor(p) : '#666'
                  }}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={priority === p}
                    onChange={() => setPriority(p)}
                    style={{ display: 'none' }}
                  />
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: priority === p ? getPriorityColor(p) : 'transparent',
                      border: `2px solid ${getPriorityColor(p)}`
                    }}
                  />
                  {p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '6px' }}>
              关联里程碑
            </label>
            <select
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                border: '1px solid #d0d0d0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                background: '#ffffff',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1976d2'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d0d0d0'
              }}
            >
              {milestones.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '6px' }}>
              任务描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入任务描述..."
              style={{
                width: '100%',
                height: '120px',
                padding: '12px',
                border: '1px solid #d0d0d0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1976d2'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d0d0d0'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            style={{
              width: '100%',
              height: '44px',
              background: title.trim() ? '#1976d2' : '#b0b0b0',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: title.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.1s ease'
            }}
            onMouseDown={(e) => {
              if (title.trim()) {
                e.currentTarget.style.transform = 'scale(0.96)'
              }
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            创建任务
          </button>
        </form>
      </div>
    </div>
  )
}
