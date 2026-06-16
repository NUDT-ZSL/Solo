import React, { useState, useRef, useEffect, useCallback } from 'react'
import { User, ChatMessage, getInitials } from '@game/collaboration'
import './CollabPanel.css'

interface CollabPanelProps {
  users: User[]
  messages: ChatMessage[]
  currentUserId: string | null
  onSendMessage: (content: string) => void
}

const CollabPanel: React.FC<CollabPanelProps> = ({
  users,
  messages,
  currentUserId,
  onSendMessage,
}) => {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const sortedUsers = [...users].sort((a, b) => b.piecesCompleted - a.piecesCompleted)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (inputValue.trim()) {
        onSendMessage(inputValue.trim())
        setInputValue('')
      }
    },
    [inputValue, onSendMessage]
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="collab-panel">
      <div className="panel-section users-section">
        <h3 className="section-title">在线用户 ({users.length})</h3>
        <div className="users-list">
          {sortedUsers.map((user, index) => (
            <div key={user.id} className="user-item">
              <div className="user-avatar" style={{ backgroundColor: user.avatarColor }}>
                {getInitials(user.name)}
              </div>
              <div className="user-info">
                <span className="user-name">
                  {user.name}
                  {user.id === currentUserId && ' (我)'}
                </span>
                <span className="user-progress">
                  {user.piecesCompleted} 块完成
                </span>
              </div>
              <div className="user-rank">#{index + 1}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section chat-section">
        <h3 className="section-title">聊天室</h3>
        <div className="chat-messages">
          {messages.map((msg) => {
            const isOwn = msg.userId === currentUserId
            return (
              <div
                key={msg.id}
                className={`chat-message ${isOwn ? 'own' : 'other'} message-enter`}
              >
                {!isOwn && (
                  <div className="message-sender">{msg.userName}</div>
                )}
                <div className="message-bubble">
                  {msg.content}
                </div>
                <div className="message-time">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className={`chat-input ${isFocused ? 'focused' : ''}`}
            placeholder="输入消息..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          <button type="submit" className="send-button">
            发送
          </button>
        </form>
      </div>
    </div>
  )
}

export default CollabPanel
