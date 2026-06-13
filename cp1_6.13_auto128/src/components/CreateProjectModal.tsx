import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../App'

const GENRE_OPTIONS = ['摇滚', '流行', '爵士', '民谣', '电子', '古典', 'R&B', '嘻哈', '朋克', '金属']

interface Props {
  onClose: () => void
}

export default function CreateProjectModal({ onClose }: Props) {
  const { createProject } = useAppContext()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showGenreDropdown, setShowGenreDropdown] = useState(false)

  const handleAddGenre = (g: string) => {
    if (genres.includes(g)) return
    if (genres.length >= 5) return
    setGenres([...genres, g])
  }

  const handleRemoveGenre = (g: string) => {
    setGenres(genres.filter(x => x !== g))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('请填写项目名称')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const project = await createProject({
        name: name.trim(),
        genres,
        description: description.trim(),
      })
      navigate(`/project/${project._id}`)
      onClose()
    } catch (err: any) {
      setError(err?.message || '创建失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box large" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3 className="modal-title">🎵 创建新项目</h3>
        <p className="modal-subtitle">开始新的音乐创作，组建你的虚拟乐队工作室</p>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">项目名称 *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：夏夜星辰 EP"
              autoFocus
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              风格标签 <span className="form-label-hint">(最多5个)</span>
            </label>
            <div className="genre-select-wrapper">
              <div className="selected-genres">
                {genres.map(g => (
                  <span key={g} className="genre-pill">
                    {g}
                    <button
                      type="button"
                      className="genre-remove"
                      onClick={() => handleRemoveGenre(g)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {genres.length < 5 && (
                  <button
                    type="button"
                    className="genre-add-btn"
                    onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                  >
                    + 添加风格
                  </button>
                )}
              </div>
              {showGenreDropdown && (
                <div className="genre-dropdown">
                  {GENRE_OPTIONS.filter(g => !genres.includes(g)).map(g => (
                    <button
                      key={g}
                      type="button"
                      className="genre-dropdown-item"
                      onClick={() => {
                        handleAddGenre(g)
                        if (genres.length + 1 >= 5) setShowGenreDropdown(false)
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">灵感描述</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="描述一下这首歌的灵感来源、情绪基调或你想表达的内容..."
              rows={4}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="modal-btn cancel" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="modal-btn primary" disabled={submitting}>
              {submitting ? '创建中...' : '✨ 创建项目'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
