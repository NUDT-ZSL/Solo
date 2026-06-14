import { useState } from 'react'
import { Artist } from '../types'
import { createArtist } from '../api'

interface RegisterPageProps {
  onRegistered: (artist: Artist) => void
}

export default function RegisterPage({ onRegistered }: RegisterPageProps) {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) return
    const artist = await createArtist({ name, bio, avatar: avatar || 'https://trae-api-cn.mchport.guru/api/ide/v1/text_to_image?prompt=default%20artist%20avatar%2C%20minimalist&image_size=square' })
    onRegistered(artist)
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: 'calc(100vh - 64px)', padding: 32,
    }}>
      <div style={{
        width: 480, background: 'rgba(17,24,39,0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 16,
        padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <h2 style={{ fontSize: 24, color: '#fff', marginBottom: 8, textAlign: 'center' }}>艺术家注册</h2>
        <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 32, textAlign: 'center' }}>创建您的艺术家账户，开始展示作品</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: '#9ca3af', marginBottom: 6, display: 'block' }}>艺名 *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入您的艺名"
              style={{
                width: '100%', padding: '12px 16px', background: '#1e293b',
                border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14,
                outline: 'none', transition: 'border-color 0.3s ease',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#f59e0b' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#374151' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, color: '#9ca3af', marginBottom: 6, display: 'block' }}>个人简介</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="介绍一下您的艺术风格和创作理念..."
              style={{
                width: '100%', padding: '12px 16px', background: '#1e293b',
                border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14,
                minHeight: 100, resize: 'vertical', outline: 'none',
                transition: 'border-color 0.3s ease',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#f59e0b' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#374151' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, color: '#9ca3af', marginBottom: 6, display: 'block' }}>头像链接</label>
            <input
              value={avatar}
              onChange={e => setAvatar(e.target.value)}
              placeholder="输入头像图片URL（可选）"
              style={{
                width: '100%', padding: '12px 16px', background: '#1e293b',
                border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14,
                outline: 'none', transition: 'border-color 0.3s ease',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#f59e0b' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#374151' }}
            />
          </div>

          {avatar && (
            <div style={{ textAlign: 'center' }}>
              <img src={avatar} alt="预览" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #374151' }} />
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            style={{
              width: '100%', height: 48, borderRadius: 8, border: 'none',
              background: name.trim() ? 'linear-gradient(135deg, #f59e0b, #eab308)' : '#374151',
              color: name.trim() ? '#fff' : '#6b7280',
              fontSize: 16, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'not-allowed',
              transition: 'filter 0.2s ease',
            }}
            onMouseEnter={e => { if (name.trim()) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)' }}
          >
            创建艺术家账户
          </button>
        </div>
      </div>
    </div>
  )
}
