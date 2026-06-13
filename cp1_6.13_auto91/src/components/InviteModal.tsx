import React, { useEffect } from 'react'
import { User, Skill, levelLabels } from '../utils/matching'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: () => void
  partner: User | null
  skillTheyTeach: Skill | null
  skillTheyLearn: Skill | null
}

const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  partner,
  skillTheyTeach,
  skillTheyLearn
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#00000055',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '400px',
          minHeight: '280px',
          borderRadius: '16px',
          backgroundColor: '#f8fafc',
          padding: '28px 24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#1e293b',
          margin: '0 0 20px 0',
          textAlign: 'center'
        }}>
          🎉 配对成功！
        </h2>

        {partner && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <img
              src={partner.avatar}
              alt={partner.name}
              style={{ width: '48px', height: '48px', borderRadius: '50%' }}
            />
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#334155' }}>
              {partner.name}
            </span>
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#ffffff',
          borderRadius: '12px'
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 6px 0' }}>TA 教你</p>
            <p style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#16a34a',
              margin: 0
            }}>
              {skillTheyTeach?.name}
            </p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              {skillTheyTeach ? levelLabels[skillTheyTeach.level] : ''}
            </p>
          </div>
          <div style={{
            width: '1px',
            backgroundColor: '#e2e8f0',
            margin: '0 16px'
          }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 6px 0' }}>你教TA</p>
            <p style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#6366f1',
              margin: 0
            }}>
              {skillTheyLearn?.name}
            </p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              {skillTheyLearn ? levelLabels[skillTheyLearn.level] : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
          <button
            style={{
              flex: 1,
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#64748b',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={onClose}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            拒绝
          </button>
          <button
            style={{
              flex: 1,
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={onAccept}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4f46e5'
              e.currentTarget.style.transform = 'translateY(-4px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6366f1'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
            }}
          >
            接受邀请
          </button>
        </div>
      </div>
    </div>
  )
}

export default InviteModal
