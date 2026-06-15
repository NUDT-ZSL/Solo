import React, { useState } from 'react'
import { ChatMessage as ChatMessageType } from '../services/apiClient'
import { roleLabels, formatDate } from './shared'

interface ChatTimelineProps {
  messages: ChatMessageType[]
}

const ChatTimeline: React.FC<ChatTimelineProps> = ({ messages }) => {
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const handleClick = (msgId: string) => {
    setHighlightedId(prev => prev === msgId ? null : msgId)
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '28px' }}>
      <div style={{
        position: 'absolute',
        left: '8px',
        top: '8px',
        bottom: '8px',
        width: '2px',
        backgroundColor: '#e0e0e0',
      }}></div>
      {messages.map(msg => {
        const isHighlighted = highlightedId === msg.id
        return (
          <div
            key={msg.id}
            className={`chat-msg${isHighlighted ? ' chat-msg--highlighted' : ''}`}
            style={{
              position: 'relative',
              marginBottom: '16px',
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: '#f5f9ff',
              cursor: 'pointer',
            }}
            onClick={() => handleClick(msg.id)}
          >
            <div style={{
              position: 'absolute',
              left: '-24px',
              top: '18px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#FF8C00',
              border: '2px solid #fff',
            }}></div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#4A3728' }}>
                {roleLabels[msg.role]}
                {msg.type === 'image' && ' 📷'}
              </span>
              <span style={{ fontSize: '12px', color: '#999' }}>{formatDate(msg.timestamp)}</span>
            </div>
            <div style={{ fontSize: '14px', color: '#333', lineHeight: 1.6 }}>
              {msg.type === 'image' ? (
                <img
                  src="https://placehold.co/200x150/FF8C00/ffffff?text=Chat+Image"
                  alt="聊天图片"
                  style={{ borderRadius: '6px', marginTop: '4px', cursor: 'pointer' }}
                />
              ) : (
                msg.content
              )}
            </div>
            {isHighlighted && msg.orderNode && (
              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                backgroundColor: '#fff3e0',
                borderRadius: '6px',
                borderLeft: '3px solid #FF8C00',
                fontSize: '13px',
                color: '#555',
                animation: 'fadeIn 0.2s ease',
              }}>
                <strong>{msg.orderNode.label}：</strong>
                {formatDate(msg.orderNode.time)}
              </div>
            )}
            {msg.orderNode && !isHighlighted && (
              <div style={{ fontSize: '12px', color: '#FF8C00', marginTop: '8px' }}>
                🔗 点击查看关联订单节点
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ChatTimeline
