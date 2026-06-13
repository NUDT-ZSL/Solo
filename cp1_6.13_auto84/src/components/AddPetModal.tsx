import React, { useState, useRef } from 'react'
import { usePetContext } from '../context/PetContext'

interface AddPetModalProps {
  open: boolean
  onClose: () => void
}

const petColors = ['#f97316', '#22c55e', '#a855f7', '#3b82f6', '#f43f5e']

const AddPetModal: React.FC<AddPetModalProps> = ({ open, onClose }) => {
  const { addPet } = usePetContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    birthDate: '',
    weight: '',
    avatar: '',
    borderColor: petColors[Math.floor(Math.random() * petColors.length)],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 120
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!

        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2

        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()

        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)

        const result = canvas.toDataURL('image/jpeg', 0.9)
        setFormData((prev) => ({ ...prev, avatar: result }))
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = '请输入宠物名字'
    if (!formData.breed.trim()) newErrors.breed = '请输入品种'
    if (!formData.birthDate) newErrors.birthDate = '请选择出生日期'
    if (!formData.weight.trim()) newErrors.weight = '请输入体重'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await addPet({
        name: formData.name.trim(),
        breed: formData.breed.trim(),
        birthDate: formData.birthDate,
        weight: formData.weight.trim(),
        avatar: formData.avatar,
        borderColor: formData.borderColor,
      })
      setIsClosing(true)
      setTimeout(() => {
        resetForm()
        onClose()
      }, 300)
    } catch (err) {
      console.error('添加宠物失败:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      breed: '',
      birthDate: '',
      weight: '',
      avatar: '',
      borderColor: petColors[Math.floor(Math.random() * petColors.length)],
    })
    setErrors({})
    setIsClosing(false)
  }

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      resetForm()
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
          maxWidth: '480px',
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
            🐾 添加新宠物
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: `3px solid ${formData.borderColor}`,
                background: formData.avatar ? 'transparent' : `linear-gradient(135deg, ${formData.borderColor}, #fbbf24)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {formData.avatar ? (
                <img src={formData.avatar} alt="头像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ color: 'white', fontSize: '14px', textAlign: 'center', padding: '0 20px' }}>
                  点击上传
                  <br />
                  头像照片
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              {petColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, borderColor: color }))}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: color,
                    border: formData.borderColor === color ? '3px solid #1e293b' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    padding: 0,
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>选择边框颜色</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>名字 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="如：豆豆"
                style={{
                  ...inputStyle,
                  borderColor: errors.name ? '#ef4444' : '#e2e8f0',
                }}
              />
              {errors.name && <div style={errorTextStyle}>{errors.name}</div>}
            </div>

            <div>
              <label style={labelStyle}>品种 *</label>
              <input
                type="text"
                value={formData.breed}
                onChange={(e) => setFormData((prev) => ({ ...prev, breed: e.target.value }))}
                placeholder="如：金毛寻回犬、英短蓝猫"
                style={{
                  ...inputStyle,
                  borderColor: errors.breed ? '#ef4444' : '#e2e8f0',
                }}
              />
              {errors.breed && <div style={errorTextStyle}>{errors.breed}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>出生日期 *</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, birthDate: e.target.value }))}
                  style={{
                    ...inputStyle,
                    borderColor: errors.birthDate ? '#ef4444' : '#e2e8f0',
                  }}
                />
                {errors.birthDate && <div style={errorTextStyle}>{errors.birthDate}</div>}
              </div>

              <div>
                <label style={labelStyle}>体重 (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
                  placeholder="如：5.2"
                  style={{
                    ...inputStyle,
                    borderColor: errors.weight ? '#ef4444' : '#e2e8f0',
                  }}
                />
                {errors.weight && <div style={errorTextStyle}>{errors.weight}</div>}
              </div>
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
            ✓ 添加宠物
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

export default AddPetModal
