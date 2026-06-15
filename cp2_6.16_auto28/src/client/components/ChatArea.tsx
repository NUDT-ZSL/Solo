import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useWebSocket } from '../context/WebSocketContext'
import { useUser } from '../context/UserContext'
import type { ChatMessage } from '../../shared/types'

interface ChatAreaProps {
  stageId: string
  compact?: boolean
}

const ChatArea = ({ stageId, compact = false }: ChatAreaProps) => {
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, sendMessage } = useWebSocket()
  const { userId } = useUser()

  const stageMessages = messages.filter(m => m.stageId === stageId).slice(-50)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [stageMessages])

  const handleSend = () => {
    if (message.trim()) {
      sendMessage(stageId, message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (compact) {
    return (
      <div className="flex flex-col h-80">
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 mb-4 px-1">
          {stageMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white/40 text-sm">
              暂无消息，发送第一条消息吧！
            </div>
          ) : (
            stageMessages.map((msg: ChatMessage) => (
              <div
                key={msg.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <img
                  src={msg.avatar}
                  alt={msg.nickname}
                  className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-white/10"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${msg.userId === userId ? 'text-cyan-400' : 'text-white'}`}>
                      {msg.nickname}
                      {msg.userId === userId && (
                        <span className="ml-2 text-xs text-cyan-400/60">(我)</span>
                      )}
                    </span>
                    <span className="text-xs text-white/40">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed break-words">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="发送消息..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="btn-gradient px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-effect mx-6 mb-6 rounded-2xl overflow-hidden">
      <div className="h-64 overflow-y-auto scrollbar-hide p-4 space-y-2">
        {stageMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/40 text-sm">
            欢迎来到演出现场！与其他观众一起互动吧！
          </div>
        ) : (
          stageMessages.map((msg: ChatMessage) => (
            <div
              key={msg.id}
              className="flex items-center h-10 px-3 rounded-lg bg-white/10 hover:bg-white/15 transition-colors"
              style={{ minHeight: '40px', height: 'auto', paddingTop: '8px', paddingBottom: '8px' }}
            >
              <img
                src={msg.avatar}
                alt={msg.nickname}
                className="w-7 h-7 rounded-full flex-shrink-0 mr-3 border border-white/10"
              />
              <div className="flex-1 flex items-center gap-3 min-w-0 overflow-hidden">
                <span className={`text-sm font-medium flex-shrink-0 ${msg.userId === userId ? 'text-cyan-400' : 'text-white/90'}`}>
                  {msg.nickname}
                </span>
                <span className="text-white/70 text-sm truncate flex-1 min-w-0">
                  {msg.content}
                </span>
                <span className="text-xs text-white/40 flex-shrink-0 ml-auto pl-2">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="发送消息..."
          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="btn-gradient px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default ChatArea
