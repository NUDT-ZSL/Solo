import React, { useEffect, useState } from 'react'
import { Task } from '../api'
import { usePetContext } from '../context/PetContext'

interface TaskModalProps {
  task: Task | null
  open: boolean
  onClose: () => void
}

const categoryConfig: Record<string, { color: string; label: string; icon: string }> = {
  feeding: { color: '#f97316', label: '喂食', icon: '🍽️' },
  walking: { color: '#22c55e', label: '遛狗', icon: '🐕' },
  medication: { color: '#a855f7', label: '用药', icon: '💊' },
  vet: { color: '#ef4444', label: '兽医', icon: '🏥' },
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
              fontSize: '28px',
              flexShrink: 0,
            }}
          >
            {config.icon}
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
