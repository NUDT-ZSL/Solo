import { useState, useEffect } from 'react'
import type { Memo } from '../types'
import './MemoPanel.css'

interface MemoPanelProps {
  memos: Memo[]
  selectedMemo: Memo | null
  onSelect: (memoId: number | null) => void
  onUpdate: (memoId: number, content: string) => void
  onDelete: (memoId: number) => void
  getColorByDate: (timestamp: number) => string
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function MemoPanel({
  memos,
  selectedMemo,
  onSelect,
  onUpdate,
  onDelete,
  getColorByDate,
  collapsed,
  onToggleCollapse,
}: MemoPanelProps) {
  const [editContent, setEditContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (selectedMemo) {
      setEditContent(selectedMemo.content)
      setIsEditing(false)
    }
  }, [selectedMemo])

  const handleSave = () => {
    if (selectedMemo && editContent.trim()) {
      onUpdate(selectedMemo.id, editContent.trim())
      setIsEditing(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateContent = (content: string, maxLen = 50) => {
    if (content.length <= maxLen) return content
    return content.slice(0, maxLen) + '...'
  }

  return (
    <div className={`memo-panel ${collapsed ? 'collapsed' : ''}`}>
      <button className="panel-toggle-btn" onClick={onToggleCollapse}>
        {collapsed ? '◀' : '▶'}
      </button>

      {!collapsed && (
        <>
          <div className="panel-header">
            <h2>
              <span className="header-icon">📍</span>
              地理备忘
            </h2>
            <span className="memo-count">{memos.length} 条</span>
          </div>

          <div className="panel-content">
            {selectedMemo && (
              <div className="memo-detail">
                <div className="detail-header">
                  <div
                    className="detail-color-dot"
                    style={{ backgroundColor: getColorByDate(selectedMemo.timestamp) }}
                  />
                  <span className="detail-time">
                    {formatDate(selectedMemo.timestamp)}
                  </span>
                </div>

                {isEditing ? (
                  <div className="edit-section">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      maxLength={200}
                      className="memo-textarea"
                      placeholder="输入备忘内容..."
                      autoFocus
                    />
                    <div className="char-count">
                      {editContent.length}/200
                    </div>
                    <div className="edit-actions">
                      <button className="btn btn-cancel" onClick={() => setIsEditing(false)}>
                        取消
                      </button>
                      <button className="btn btn-save" onClick={handleSave}>
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="view-section">
                    <p className="memo-content-text">{selectedMemo.content}</p>
                    <div className="detail-actions">
                      <button className="btn btn-edit" onClick={() => setIsEditing(true)}>
                        ✏️ 编辑
                      </button>
                      <button
                        className="btn btn-delete"
                        onClick={() => onDelete(selectedMemo.id)}
                      >
                        🗑️ 删除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="memo-list-section">
              <h3 className="list-title">备忘列表</h3>
              <div className="memo-list">
                {memos.length === 0 ? (
                  <div className="empty-state">
                    <p>暂无备忘</p>
                    <p className="empty-hint">点击地图添加备忘</p>
                  </div>
                ) : (
                  memos.map((memo) => (
                    <div
                      key={memo.id}
                      className={`memo-list-item ${
                        selectedMemo?.id === memo.id ? 'selected' : ''
                      }`}
                      onClick={() => onSelect(memo.id)}
                    >
                      <div
                        className="list-color-dot"
                        style={{ backgroundColor: getColorByDate(memo.timestamp) }}
                      />
                      <div className="list-item-content">
                        <p className="list-item-text">{truncateContent(memo.content)}</p>
                        <span className="list-item-time">
                          {formatDate(memo.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
