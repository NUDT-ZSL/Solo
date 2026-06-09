import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';

interface ChatPanelProps {
  ws: WebSocket | null;
  messages: ChatMessage[];
  userName: string;
  onSendMessage: (content: string) => void;
}

export default function ChatPanel({ messages, userName, onSendMessage }: ChatPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current && expanded) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, expanded]);

  const handleSend = () => {
    if (!input.trim()) return;
    if (input.length > 100) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel">
      {expanded && (
        <div className="chat-box">
          <div className="chat-header">展厅聊天</div>
          <div className="chat-messages">
            {messages.map((msg, idx) => {
              const isVisitor = msg.type !== 'system' && msg.userName === userName;
              const msgClass = msg.type === 'system' ? 'system' : isVisitor ? 'visitor' : 'other';
              return (
                <div key={`${msg.timestamp}-${idx}`} className={`chat-message ${msgClass}`}>
                  {msg.type !== 'system' && (
                    <div className="chat-user" style={{ color: isVisitor ? '#F39C12' : '#808088' }}>
                      {msg.userName}
                    </div>
                  )}
                  <div className="chat-bubble">{msg.content}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input">
            <input
              type="text"
              placeholder="输入消息(最多100字)..."
              value={input}
              maxLength={100}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <span className="char-count">{input.length}/100</span>
          </div>
        </div>
      )}
      <button className="chat-toggle" onClick={() => setExpanded(!expanded)}>
        聊
      </button>
    </div>
  );
}
