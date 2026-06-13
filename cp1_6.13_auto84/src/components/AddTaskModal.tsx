import React, { useState, useEffect } from 'react'
import { usePetContext } from '../context/PetContext'

interface AddTaskModalProps {
  open: boolean
  onClose: () => void
  defaultDate?: string
  petId: string
}

const categories = [
  { value: 'feeding', label: '喂食', icon: '🍽️', color: '#f97316' },
  { value: 'walking', label: '遛狗/运动', icon: '🐕', color: '#22c55e' },
  { value: 'medication', label: '用药', icon: '💊', color: '#a855f7' },
  { value: 'vet', label: '兽医', icon: '🏥', color: '#ef4444' },
]

const AddTaskModal: React.FC<AddTaskModalProps> = ({ open, onClose, defaultDate, petId }) => {
  const { addTask, pets } = usePetContext()
  const [isClosing, setIsClosing] = useState(false)
  const [selectedPetId, setSelectedPetId] = useState(petId)
  const [formData, setFormData] = useState({
    title: '',
    category: 'feeding' as 'feeding' | 'walking' | 'medication' | 'vet',
    date: defaultDate || new Date().toISOString().split('T')[0],
    time: '08:00',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setSelectedPetId(petId)
      setFormData({
        title: '',
        category: 'feeding',
        date: defaultDate || new Date().toISOString().split('T')[0],
        time: '08:00',
        notes: '',
      })
      setErrors({})
      setIsClosing(false)
    }
  }, [open, petId, defaultDate])

  const timeOptions = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      timeOptions.push(time)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = '请输入任务标题'
    if (!formData.date) newErrors.date = '请选择日期'
    if (!formData.time) newErrors.time = '请选择时间'
    if (!selectedPetId) newErrors.petId = '请选择宠物'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await addTask({
        petId: selectedPetId,
        title: formData.title.trim(),
        category: formData.category,
        date: formData.date,
        time: formData.time,
        notes: formData.notes.trim(),
      })
      setIsClosing(true)
      setTimeout(() => {
        onClose()
      }, 300)
    } catch (err) {
      console.error('添加任务失败:', err)
    }
  }

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!open) return null

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
        padding: '20px',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          overflowY: 'auto',
          transform: isClosing ? 'translateY(10px) scale(0.98)' : 'translateY(0) scale(1)',
          opacity: isClosing ? 0 : 1,
          transition: 'all 0.3s ease-out',
          animation: isClosing ? 'none' : 'modalFadeIn 0.3s ease-out',
        }}
      >
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b', fontWeight: 700 }}>
            ➕ 新建任务
          </h2>
          <button
            type="button"
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

        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {pets.length > 1 && (
              <div>
                <label style={labelStyle}>选择宠物 *</label>
                <select
                  value={selectedPetId}
                  onChange={(e) => setSelectedPetId(e.target.value)}
                  style={selectStyle}
                >
                  {pets.map((pet) => (
                    <option key={pet._id} value={pet._id}>
                      {pet.name} - {pet.breed}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={labelStyle}>任务类别 *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, category: cat.value as any }))}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '10px',
                      border: formData.category === cat.value ? `2px solid ${cat.color}` : '2px solid transparent',
                      background: formData.category === cat.value ? `${cat.color}10` : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{cat.icon}</span>
                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>任务标题 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="如：早餐喂食、晨间遛狗"
                style={{
                  ...inputStyle,
                  borderColor: errors.title ? '#ef4444' : '#e2e8f0',
                }}
              />
              {errors.title && <div style={errorTextStyle}>{errors.title}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>日期 *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  style={{
                    ...inputStyle,
                    borderColor: errors.date ? '#ef4444' : '#e2e8f0',
                  }}
                />
                {errors.date && <div style={errorTextStyle}>{errors.date}</div>}
              </div>

              <div>
                <label style={labelStyle}>时间 *</label>
                <select
                  value={formData.time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                  style={selectStyle}
                >
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>备注说明</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="如：狗粮150g、温水泡软..."
                rows={3}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  minHeight: '80px',
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '20px 28px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={cancelBtnStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            取消
          </button>
          <button
            type="submit"
            style={submitBtnStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#d97706')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f59e0b')}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            ✓ 创建任务
          </button>
        </div>
      </form>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '14px',
  color: '#1e293b',
  outline: 'none',
  transition: 'all 0.15s ease',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: '#fafafa',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '14px',
  color: '#1e293b',
  outline: 'none',
  transition: 'all 0.15s ease',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: '#fafafa',
  cursor: 'pointer',
}

const errorTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#ef4444',
  marginTop: '4px',
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  background: '#f1f5f9',
  color: '#475569',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const submitBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  borderRadius: '8px',
  border: 'none',
  background: '#f59e0b',
  color: 'white',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

export default AddTaskModal
