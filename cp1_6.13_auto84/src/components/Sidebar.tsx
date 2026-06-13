import React, { useState } from 'react'
import { usePetContext } from '../context/PetContext'
import { Pet } from '../api'
import AddPetModal from './AddPetModal'

const petColorOptions = ['#f97316', '#22c55e', '#a855f7', '#3b82f6', '#f43f5e']

const getPetColor = (pet: Pet) => {
  if (pet.borderColor && petColorOptions.includes(pet.borderColor)) {
    return pet.borderColor
  }
  const name = pet.name || 'pet'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return petColorOptions[Math.abs(hash) % petColorOptions.length]
}

const getInitial = (name: string) => name.charAt(0).toUpperCase()

const Sidebar: React.FC = () => {
  const { pets, currentPetId, setCurrentPetId, getCurrentPetTasks } = usePetContext()
  const [showAddModal, setShowAddModal] = useState(false)

  const petTasks = getCurrentPetTasks()
  const today = new Date().toISOString().split('T')[0]
  const todayTasks = petTasks.filter((t) => t.date === today)
  const completedToday = todayTasks.filter((t) => t.completed).length

  const getAvatar = (pet: Pet) => {
    const borderColor = getPetColor(pet)
    if (pet.avatar) {
      return (
        <img
          src={pet.avatar}
          alt={pet.name}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: `3px solid ${borderColor}`,
          }}
        />
      )
    }
    return (
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${borderColor}, #fbbf24)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          border: `3px solid ${borderColor}`,
        }}
      >
        {getInitial(pet.name)}
      </div>
    )
  }

  return (
    <>
      <aside className="sidebar desktop-sidebar" style={sidebarStyle}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '28px' }}>🐾</span>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b', fontWeight: 700 }}>
              PetCarePlanner
            </h2>
          </div>
          {currentPetId && pets.length > 0 && (
            <div
              style={{
                background: '#fff7ed',
                borderRadius: '10px',
                padding: '12px',
                border: '1px solid #fed7aa',
              }}
            >
              <div style={{ fontSize: '12px', color: '#9a3412', marginBottom: '4px' }}>今日进度</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>
                  已完成任务
                </span>
                <span style={{ fontSize: '16px', color: '#f59e0b', fontWeight: 700 }}>
                  {completedToday}/{todayTasks.length}
                </span>
              </div>
              <div
                style={{
                  marginTop: '8px',
                  height: '6px',
                  background: '#fed7aa',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${todayTasks.length ? (completedToday / todayTasks.length) * 100 : 0}%`,
                    background: '#f59e0b',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
              我的宠物
            </h3>
            <button
              onClick={() => setShowAddModal(true)}
              style={addButtonStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#d97706')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#f59e0b')}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              + 添加
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pets.map((pet, index) => (
              <div
                key={pet._id}
                onClick={() => pet._id && setCurrentPetId(pet._id)}
                style={{
                  ...petCardStyle,
                  border: currentPetId === pet._id ? '3px solid #f59e0b' : '3px solid transparent',
                  animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
                }}
                className="pet-card"
                onMouseEnter={(e) => {
                  if (currentPetId !== pet._id) {
                    e.currentTarget.style.background = '#f1f5f9'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff'
                }}
              >
                {getAvatar(pet)}
                <div style={{ flex: 1, marginLeft: '12px', overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#1e293b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {pet.name}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {pet.breed}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      marginTop: '2px',
                    }}
                  >
                    {pet.weight}kg · {pet.birthDate}
                  </div>
                </div>
              </div>
            ))}

            {pets.length === 0 && (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '14px',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐱</div>
                还没有添加宠物
                <br />
                点击上方按钮添加你的毛孩子
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
            <span>💡</span>
            <span>点击宠物卡片切换视图</span>
          </div>
        </div>
      </aside>

      <nav className="mobile-bottom-nav">
        <div className="mobile-nav-scroll">
          {pets.map((pet) => {
            const borderColor = getPetColor(pet)
            const isActive = currentPetId === pet._id
            return (
              <div
                key={pet._id}
                onClick={() => pet._id && setCurrentPetId(pet._id)}
                className={`mobile-pet-item ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  padding: '6px 10px',
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                }}
              >
                {pet.avatar ? (
                  <img
                    src={pet.avatar}
                    alt={pet.name}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: isActive ? `3px solid #f59e0b` : `3px solid ${borderColor}`,
                      transition: 'all 0.2s ease',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${borderColor}, #fbbf24)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      border: isActive ? `3px solid #f59e0b` : `3px solid ${borderColor}`,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {getInitial(pet.name)}
                  </div>
                )}
                <span style={{ fontSize: '11px', color: isActive ? '#f59e0b' : '#64748b', fontWeight: isActive ? 600 : 500 }}>
                  {pet.name}
                </span>
              </div>
            )
          })}
          <div
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              flexShrink: 0,
              padding: '6px 10px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#f1f5f9',
                border: '2px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: '20px',
              }}
            >
              +
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>添加</span>
          </div>
        </div>
      </nav>

      <AddPetModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </>
  )
}

const sidebarStyle: React.CSSProperties = {
  width: '300px',
  minWidth: '300px',
  background: '#f8fafc',
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  borderRight: '1px solid #e2e8f0',
}

const petCardStyle: React.CSSProperties = {
  width: '260px',
  height: '100px',
  borderRadius: '12px',
  background: '#ffffff',
  padding: '16px',
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  transition: 'background 0.2s ease, border-color 0.2s ease',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  boxSizing: 'border-box',
}

const addButtonStyle: React.CSSProperties = {
  background: '#f59e0b',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '6px 14px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  fontFamily: 'inherit',
}

export default Sidebar
