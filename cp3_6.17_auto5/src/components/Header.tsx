import { useState } from 'react'
import type { KnowledgePoint, User } from '../types'

interface HeaderProps {
  courseTitle: string
  knowledgePoints: KnowledgePoint[]
  selectedTag: string | null
  onTagChange: (tag: string | null) => void
  currentUser: User | null
  onUserChange: (user: User | null) => void
  users: User[]
}

export default function Header({
  courseTitle,
  knowledgePoints,
  selectedTag,
  onTagChange,
  currentUser,
  onUserChange,
  users
}: HeaderProps) {
  const [tagOpen, setTagOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  const allTags = Array.from(new Set(knowledgePoints.flatMap(kp => kp.tags)))

  return (
    <header
      style={{
        height: 56,
        background: '#ffffff',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #1a237e, #00bcd4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16
          }}
        >
          K
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#1a237e' }}>知识图谱学习平台</h1>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 15, color: '#424242', fontWeight: 500 }}>{courseTitle}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setTagOpen(!tagOpen)
              setUserOpen(false)
            }}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: '1px solid #e0e0e0',
              background: selectedTag ? '#e3f2fd' : '#fff',
              color: selectedTag ? '#1976d2' : '#616161',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>🏷️</span>
            <span>{selectedTag ? `#${selectedTag}` : '全部标签'}</span>
            <span style={{ fontSize: 10 }}>▾</span>
          </button>
          {tagOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                minWidth: 160,
                padding: 4,
                zIndex: 200
              }}
            >
              <button
                onClick={() => {
                  onTagChange(null)
                  setTagOpen(false)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  textAlign: 'left',
                  background: !selectedTag ? '#f5f5f5' : 'transparent',
                  color: '#424242',
                  borderRadius: 4,
                  fontSize: 13
                }}
              >
                全部标签
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    onTagChange(tag)
                    setTagOpen(false)
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    background: selectedTag === tag ? '#e3f2fd' : 'transparent',
                    color: selectedTag === tag ? '#1976d2' : '#424242',
                    borderRadius: 4,
                    fontSize: 13
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setUserOpen(!userOpen)
              setTagOpen(false)
            }}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: '1px solid #e0e0e0',
              background: '#fff',
              color: '#424242',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: currentUser?.role === 'teacher' ? '#1976d2' : '#00bcd4',
                color: '#fff',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600
              }}
            >
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <span>{currentUser?.name || '选择用户'}</span>
            <span style={{ fontSize: 10 }}>▾</span>
          </button>
          {userOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                minWidth: 200,
                padding: 4,
                zIndex: 200
              }}
            >
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => {
                    onUserChange(user)
                    setUserOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    background: currentUser?.id === user.id ? '#f5f5f5' : 'transparent',
                    borderRadius: 4,
                    fontSize: 13
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: user.role === 'teacher' ? '#1976d2' : '#00bcd4',
                      color: '#fff',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600
                    }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#212121', fontWeight: 500 }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: '#757575' }}>
                      {user.role === 'teacher' ? '👨‍🏫 教师' : '👨‍🎓 学生'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
