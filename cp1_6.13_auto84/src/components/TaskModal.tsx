import React, { useEffect, useState } from 'react'
import { Task } from '../api'
import { usePetContext } from '../context/PetContext'

interface TaskModalProps {
  task: Task | null
  open: boolean
  onClose: () => void
}

const categoryConfig: Record<string, { color: string; label: string; svg: React.ReactNode }> = {
  feeding: {
    color: '#f97316',
    label: '喂食',
    svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C13.1046 2 14 2.89543 14 4C14 5.10457 13.1046 6 12 6C10.8954 6 10 5.10457 10 4C10 2.89543 10.8954 2 12 2Z" fill="white"/>
        <path d="M5 11C5 8.79086 6.79086 7 9 7H15C17.2091 7 19 8.79086 19 11V17C19 19.2091 17.2091 21 15 21H9C6.79086 21 5 19.2091 5 17V11Z" fill="white"/>
        <path d="M12 7V21M12 11H5" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  walking: {
    color: '#22c55e',
    label: '遛狗',
    svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="13" cy="4" r="2.5" fill="white"/>
        <path d="M9 20L10 14L7 17L4 19L5 20L7 19.5L9 20Z" fill="white"/>
        <path d="M13 6C11 7 10 9 10 12L12 13L14 18L17 17L16 12L18 10" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  medication: {
    color: '#a855f7',
    label: '用药',
    svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="10" width="18" height="8" rx="4" transform="rotate(-45 3 10)" fill="white"/>
        <path d="M9.5 14.5L14.5 9.5" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  vet: {
    color: '#ef4444',
    label: '兽医',
    svg: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.5 8.5L21 9L16 14L17.5 21L12 17.5L6.5 21L8 14L3 9L9.5 8.5L12 2Z" fill="white"/>
        <path d="M12 10V15M9.5 12.5H14.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
}

const TaskModal: React.FC<TaskModalProps> = ({ task, open, onClose }) => {
  const { updateTask, deleteTask, pets } = usePetContext()
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setIsClosing(false)
    }
  }, [open])

  if (!open || !task) return null

  const config = categoryConfig[task.category] || categoryConfig.feeding
  const pet = pets.find((p) => p._id === task.petId)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleToggleComplete = async () => {
    if (task._id) {
      await updateTask(task._id, { completed: !task.completed })
    }
  }

  const handleDelete = async () => {
    if (task._id && window.confirm('确定要删除这个任务吗？')) {
      await deleteTask(task._id)
      handleClose()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000040',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          width: '90%',
          maxWidth: '440px',
          padding: '28px',
          transform: isClosing ? 'translateY(10px) scale(0.98)' : 'translateY(0) scale(1)',
          opacity: isClosing ? 0 : 1,
          transition: 'all 0.3s ease-out',
          animation: isClosing ? 'none' : 'modalFadeIn 0.3s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: config.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {config.svg}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '6px',
                background: `${config.color}15`,
                color: config.color,
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '8px',
              }}
            >
              {config.label}
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', color: '#1e293b', fontWeight: 700 }}>
              {task.title}
            </h3>
            {pet && (
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                🐾 {pet.name} · {pet.breed}
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '8px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9'
              e.currentTarget.style.color = '#1e293b'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.color = '#94a3b8'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              📅
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>日期</div>
              <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500 }}>{task.date}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              ⏰
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>时间</div>
              <div style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500 }}>{task.time}</div>
            </div>
          </div>

          {task.notes && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                📝
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>备注</div>
                <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>{task.notes}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: task.completed ? '#dcfce7' : '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              {task.completed ? '✅' : '⏳'}
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>状态</div>
              <div
                style={{
                  fontSize: '15px',
                  color: task.completed ? '#16a34a' : '#dc2626',
                  fontWeight: 600,
                }}
              >
                {task.completed ? '已完成' : '待完成'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleDelete}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fef2f2'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            🗑️ 删除
          </button>
          <button
            onClick={handleToggleComplete}
            style={{
              flex: 2,
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              background: task.completed ? '#64748b' : '#f59e0b',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = task.completed ? '#475569' : '#d97706'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = task.completed ? '#64748b' : '#f59e0b'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {task.completed ? '↩️ 标记为未完成' : '✓ 标记为完成'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TaskModal
