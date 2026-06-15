import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { presetsApi } from '../http'
import type { PresetItem } from '../types'

const PresetsPage: React.FC = () => {
  const [presets, setPresets] = useState<PresetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const navigate = useNavigate()

  const fetchPresets = useCallback(async () => {
    try {
      const data = await presetsApi.getPresets()
      setPresets(data)
    } catch (err) {
      console.error('加载预设失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPresets()
  }, [fetchPresets])

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (!window.confirm('确定要删除这个预设吗？')) return
      setDeletingId(id)
      try {
        await presetsApi.deletePreset(id)
        setPresets((prev) => prev.filter((p) => p.id !== id))
      } catch (err) {
        console.error('删除失败:', err)
      } finally {
        setDeletingId(null)
      }
    },
    []
  )

  const handlePlay = useCallback(
    (preset: PresetItem, e: React.MouseEvent) => {
      e.stopPropagation()
      navigate(`/?preset=${preset.id}`)
    },
    [navigate]
  )

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 120px)',
          color: '#7c7599',
          fontSize: '16px',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '24px' }}>⏳</span>
        加载中...
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#e0d8f0',
              fontFamily: 'Georgia, serif',
              marginBottom: '8px',
            }}
          >
            📁 我的音景预设
          </h2>
          <p style={{ fontSize: '14px', color: '#7c7599' }}>
            管理你保存的环境音混合方案
          </p>
        </div>
        <Link
          to="/"
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            background: '#6c5ce7',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#7d6ff0' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#6c5ce7' }}
        >
          ➕ 新建混音
        </Link>
      </div>

      {presets.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 32px',
            color: '#7c7599',
            gap: '16px',
          }}
        >
          <span style={{ fontSize: '64px' }}>🎼</span>
          <p style={{ fontSize: '18px' }}>还没有保存的预设</p>
          <p style={{ fontSize: '14px' }}>
            去混合器创建你的第一个音景吧！
          </p>
          <Link
            to="/"
            style={{
              marginTop: '16px',
              padding: '12px 32px',
              borderRadius: '8px',
              background: '#6c5ce7',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#7d6ff0' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#6c5ce7' }}
          >
            开始混音
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {presets.map((preset) => (
            <div
              key={preset.id}
              style={{
                width: '280px',
                background: '#1e1e2e',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s ease',
                border: '1px solid #2d2a3e',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6c5ce7'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2d2a3e'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              onClick={() => navigate(`/presets/${preset.id}`)}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontFamily: 'Georgia, serif',
                  fontWeight: 600,
                  color: '#e0d8f0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {preset.name}
              </h3>

              {preset.description && (
                <p
                  style={{
                    fontSize: '13px',
                    color: '#a8a0c0',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {preset.description}
                </p>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {preset.tracks.map((track) => (
                  <span
                    key={track.soundId || track.id}
                    style={{
                      background: '#3a3650',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#a8a0c0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {track.emoji} {track.name}
                  </span>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '4px',
                  paddingTop: '12px',
                  borderTop: '1px solid #2d2a3e',
                }}
              >
                <span style={{ fontSize: '11px', color: '#7c7599' }}>
                  {preset.tracks.length} 个音源 · {preset.masterVolume}% 音量
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => handlePlay(preset, e)}
                    title="播放"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#2d2a3e',
                      color: '#b8a9e8',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#4a4660' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#2d2a3e' }}
                  >
                    ▶
                  </button>
                  <Link
                    to={`/presets/${preset.id}`}
                    onClick={(e) => e.stopPropagation()}
                    title="编辑"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#2d2a3e',
                      color: '#b8a9e8',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#4a4660' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#2d2a3e' }}
                  >
                    ✏️
                  </Link>
                  <button
                    onClick={(e) => handleDelete(preset.id, e)}
                    title="删除"
                    disabled={deletingId === preset.id}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#2d2a3e',
                      color: '#b8a9e8',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#e74c3c'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#2d2a3e'; e.currentTarget.style.color = '#b8a9e8' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PresetsPage
