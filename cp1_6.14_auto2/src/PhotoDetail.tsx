import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import type { PhotoData } from './PhotoUploader'

export interface MemoryData {
  id: string
  photoId: string
  content: string
  createdAt: string
  updatedAt: string
}

interface PhotoDetailProps {
  photo: PhotoData | null
  onClose: () => void
  onMemorySaved: () => void
  onUpdateGPS: (photoId: string, lat: number, lng: number) => void
}

const HIGHLIGHT_COLORS = [
  { label: '黄', value: '#fef08a' },
  { label: '绿', value: '#bbf7d0' },
  { label: '蓝', value: '#bfdbfe' },
  { label: '粉', value: '#fbcfe8' },
  { label: '橙', value: '#fed7aa' }
]

const formatExifDate = (iso: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const PhotoDetail: React.FC<PhotoDetailProps> = ({
  photo,
  onClose,
  onMemorySaved,
  onUpdateGPS
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [memories, setMemories] = useState<MemoryData[]>([])
  const [saving, setSaving] = useState(false)
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [pendingHighlight, setPendingHighlight] = useState<string | null>(null)
  const [localLat, setLocalLat] = useState<string>('')
  const [localLng, setLocalLng] = useState<string>('')

  useEffect(() => {
    if (!photo) return
    setMemories([])
    setEditingMemoryId(null)
    if (editorRef.current) editorRef.current.innerHTML = ''
    axios
      .get<MemoryData[]>(`/api/photos/${photo.id}/memories`)
      .then((r) => setMemories(r.data))
      .catch(() => setMemories([]))
    setLocalLat(typeof photo.latitude === 'number' ? String(photo.latitude) : '')
    setLocalLng(typeof photo.longitude === 'number' ? String(photo.longitude) : '')
  }, [photo])

  const exec = useCallback((command: string, value?: string) => {
    if (!editorRef.current) return
    editorRef.current.focus()
    document.execCommand(command, false, value)
    editorRef.current.focus()
  }, [])

  const applyHighlight = (color: string) => {
    exec('hiliteColor', color)
    setShowColorPicker(false)
    setPendingHighlight(null)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const html = e.clipboardData.getData('text/html')
    const text = e.clipboardData.getData('text/plain')

    if (editorRef.current) {
      if (html) {
        const sanitized = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/on\w+\s*=/gi, 'data-on=')
        document.execCommand('insertHTML', false, sanitized)
      } else if (text) {
        document.execCommand('insertText', false, text)
      }
    }
  }

  const saveMemory = async () => {
    if (!photo || !editorRef.current) return
    const content = editorRef.current.innerHTML.trim()
    if (!content) {
      alert('回忆内容不能为空')
      return
    }
    setSaving(true)
    try {
      if (editingMemoryId) {
        await axios.put(`/api/memories/${editingMemoryId}`, { content })
        const idx = memories.findIndex((m) => m.id === editingMemoryId)
        if (idx >= 0) {
          const updated = [...memories]
          updated[idx] = { ...updated[idx], content, updatedAt: new Date().toISOString() }
          setMemories(updated)
        }
      } else {
        const resp = await axios.post<MemoryData>(`/api/photos/${photo.id}/memories`, { content })
        setMemories((prev) => [...prev, resp.data])
      }
      if (editorRef.current) editorRef.current.innerHTML = ''
      setEditingMemoryId(null)
      onMemorySaved()
    } finally {
      setSaving(false)
    }
  }

  const editMemory = (m: MemoryData) => {
    setEditingMemoryId(m.id)
    if (editorRef.current) {
      editorRef.current.innerHTML = m.content
    }
    editorRef.current?.focus()
    editorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const deleteMemory = async (id: string) => {
    if (!confirm('确定删除这条回忆吗？')) return
    try {
      await axios.delete(`/api/memories/${id}`)
      setMemories((prev) => prev.filter((m) => m.id !== id))
      if (editingMemoryId === id) {
        setEditingMemoryId(null)
        if (editorRef.current) editorRef.current.innerHTML = ''
      }
      onMemorySaved()
    } catch (_) {
      alert('删除失败')
    }
  }

  const saveGPS = () => {
    if (!photo) return
    const lat = parseFloat(localLat)
    const lng = parseFloat(localLng)
    if (isNaN(lat) || isNaN(lng)) {
      alert('请输入有效的经纬度')
      return
    }
    onUpdateGPS(photo.id, lat, lng)
  }

  if (!photo) return null

  return (
    <div
      style={{
        width: 320,
        height: '100%',
        background: '#ffffff',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '-2px 0 16px rgba(0,0,0,0.08)',
        flexShrink: 0
      }}
    >
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>照片详情</h3>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: 14, border: 'none',
            background: '#f1f5f9', color: '#475569', cursor: 'pointer', fontSize: '0.85rem'
          }}
        >✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ position: 'relative', width: '100%', height: 200, background: '#f8fafc' }}>
          <img
            src={photo.dataUrl}
            alt={photo.originalName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500, marginBottom: 10, wordBreak: 'break-all' }}>
            📄 {photo.originalName}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.7 }}>
            <div>📅 拍摄时间：{formatExifDate(photo.takenAt)}</div>
            <div>📍 GPS：
              {typeof photo.latitude === 'number' && typeof photo.longitude === 'number'
                ? `${photo.latitude.toFixed(4)}, ${photo.longitude.toFixed(4)}`
                : '未设置'}
            </div>
          </div>

          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="number"
                step="any"
                placeholder="纬度"
                value={localLat}
                onChange={(e) => setLocalLat(e.target.value)}
                style={{
                  flex: 1, padding: '6px 8px', fontSize: '0.75rem',
                  border: '1px solid #e2e8f0', borderRadius: 6
                }}
              />
              <input
                type="number"
                step="any"
                placeholder="经度"
                value={localLng}
                onChange={(e) => setLocalLng(e.target.value)}
                style={{
                  flex: 1, padding: '6px 8px', fontSize: '0.75rem',
                  border: '1px solid #e2e8f0', borderRadius: 6
                }}
              />
            </div>
            <button
              onClick={saveGPS}
              style={{
                padding: '6px 10px', background: '#0ea5e9', color: 'white',
                border: 'none', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500
              }}
            >💾 保存位置</button>
          </div>
        </div>

        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
            {editingMemoryId ? '✏️ 编辑回忆' : '📝 添加文字回忆'}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            marginBottom: 8,
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => exec('bold')}
              onMouseDown={(e) => e.preventDefault()}
              title="加粗"
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: '#ffffff', fontWeight: 700, cursor: 'pointer',
                color: '#0f172a', fontSize: '0.85rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >B</button>
            <button
              onClick={() => exec('italic')}
              onMouseDown={(e) => e.preventDefault()}
              title="斜体"
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: '#ffffff', fontStyle: 'italic', fontWeight: 600, cursor: 'pointer',
                color: '#0f172a', fontSize: '0.85rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >I</button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  if (pendingHighlight) {
                    applyHighlight(pendingHighlight)
                  } else {
                    setShowColorPicker((v) => !v)
                  }
                }}
                onMouseDown={(e) => e.preventDefault()}
                title="颜色高亮"
                style={{
                  width: 28, height: 28, borderRadius: 6, border: 'none',
                  background: '#fef08a', fontWeight: 700, cursor: 'pointer',
                  color: '#0f172a', fontSize: '0.85rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >🖍️</button>
              {showColorPicker && (
                <div style={{
                  position: 'absolute', top: 34, left: 0,
                  background: 'white', borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  padding: 8, display: 'flex', gap: 4, zIndex: 20
                }}>
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        setPendingHighlight(c.value)
                        applyHighlight(c.value)
                      }}
                      title={c.label}
                      style={{
                        width: 26, height: 26, borderRadius: 6, border: '2px solid #e2e8f0',
                        background: c.value, cursor: 'pointer', fontWeight: 700,
                        fontSize: '0.7rem', color: '#0f172a'
                      }}
                    >{c.label}</button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 1, height: 18, background: '#e2e8f0', margin: '0 4px' }} />
            <button
              onClick={() => exec('underline')}
              onMouseDown={(e) => e.preventDefault()}
              title="下划线"
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: '#ffffff', textDecoration: 'underline', cursor: 'pointer',
                color: '#0f172a', fontSize: '0.85rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >U</button>
            <button
              onClick={() => exec('strikeThrough')}
              onMouseDown={(e) => e.preventDefault()}
              title="删除线"
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: '#ffffff', textDecoration: 'line-through', cursor: 'pointer',
                color: '#64748b', fontSize: '0.85rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >S</button>
            {editingMemoryId && (
              <button
                onClick={() => {
                  setEditingMemoryId(null)
                  if (editorRef.current) editorRef.current.innerHTML = ''
                }}
                style={{
                  marginLeft: 'auto',
                  padding: '4px 8px', borderRadius: 6, border: 'none',
                  background: '#fef2f2', color: '#dc2626', fontSize: '0.7rem', cursor: 'pointer'
                }}
              >取消编辑</button>
            )}
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onPaste={handlePaste}
            style={{
              minHeight: 100,
              maxHeight: 180,
              overflowY: 'auto',
              padding: 12,
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: '0.85rem',
              lineHeight: 1.6,
              color: '#0f172a',
              outline: 'none',
              background: '#ffffff'
            }}
            data-placeholder="在这里写下你的回忆..."
          />

          <button
            onClick={saveMemory}
            disabled={saving}
            style={{
              marginTop: 10, width: '100%',
              padding: '10px 14px',
              background: saving ? '#cbd5e1' : 'linear-gradient(90deg, #f97316, #d946ef)',
              color: 'white', border: 'none', borderRadius: 8,
              fontSize: '0.85rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >{saving ? '保存中...' : (editingMemoryId ? '💾 更新回忆' : '💾 保存回忆')}</button>
        </div>

        {memories.length > 0 && (
          <div style={{ padding: '0 16px 16px 16px' }}>
            <div style={{
              fontSize: '0.85rem', fontWeight: 600, color: '#0f172a',
              marginBottom: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9'
            }}>
              📚 已保存的回忆（{memories.length}）
            </div>
            {memories.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: 12,
                  background: '#f8fafc',
                  borderRadius: 10,
                  marginBottom: 8,
                  border: '1px solid #e2e8f0'
                }}
              >
                <div
                  style={{
                    fontSize: '0.8rem',
                    lineHeight: 1.6,
                    color: '#0f172a',
                    wordBreak: 'break-word'
                  }}
                  dangerouslySetInnerHTML={{ __html: m.content }}
                />
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginTop: 8,
                  fontSize: '0.7rem', color: '#94a3b8'
                }}>
                  <span>{formatExifDate(m.updatedAt)}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => editMemory(m)}
                      style={{
                        padding: '3px 8px', borderRadius: 4, border: 'none',
                        background: '#eff6ff', color: '#2563eb',
                        fontSize: '0.7rem', cursor: 'pointer'
                      }}
                    >编辑</button>
                    <button
                      onClick={() => deleteMemory(m.id)}
                      style={{
                        padding: '3px 8px', borderRadius: 4, border: 'none',
                        background: '#fef2f2', color: '#dc2626',
                        fontSize: '0.7rem', cursor: 'pointer'
                      }}
                    >删除</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PhotoDetail
