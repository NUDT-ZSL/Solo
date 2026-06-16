import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { statusLabels, designerReplies } from '../data/mockData';

interface DetailPanelProps {
  commissionId: string;
  onClose: () => void;
}

export default function DetailPanel({ commissionId, onClose }: DetailPanelProps) {
  const commission = useStore((state) =>
    state.commissions.find((c) => c.id === commissionId)
  );
  const getMessagesByCommission = useStore((state) => state.getMessagesByCommission);
  const addMessage = useStore((state) => state.addMessage);

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = getMessagesByCommission(commissionId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    addMessage(commissionId, 'client', inputValue);
    setInputValue('');

    const delay = 1000 + Math.random() * 1000;
    setTimeout(() => {
      const randomReply = designerReplies[Math.floor(Math.random() * designerReplies.length)];
      addMessage(commissionId, 'designer', randomReply);
    }, delay);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!commission) return null;

  const getProgressColor = (progress: number) => {
    const r = Math.round(229 - (229 - 129) * (progress / 100));
    const g = Math.round(115 + (199 - 115) * (progress / 100));
    const b = Math.round(115 + (132 - 115) * (progress / 100));
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="detail-panel-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div>
            <h2>{commission.artworkTitle}</h2>
            <p className="panel-status">
              状态: <span className={`status-tag status-${commission.status}`}>
                {statusLabels[commission.status]}
              </span>
            </p>
          </div>
          <button className="panel-close" onClick={onClose}>×</button>
        </div>

        <div className="panel-progress-section">
          <div className="progress-header">
            <span>项目进度</span>
            <span className="progress-percent">{commission.progress}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${commission.progress}%`,
                backgroundColor: getProgressColor(commission.progress)
              }}
            />
          </div>
        </div>

        <div className="panel-info">
          <div className="info-item">
            <span className="info-label">预算</span>
            <span className="info-value">¥{commission.budget}</span>
          </div>
          <div className="info-item">
            <span className="info-label">截止日期</span>
            <span className="info-value">{commission.deadline}</span>
          </div>
        </div>

        <div className="panel-description">
          <h4>项目描述</h4>
          <p>{commission.description}</p>
        </div>

        <div className="chat-section">
          <h4>消息沟通</h4>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">暂无消息，开始沟通吧~</div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${msg.sender === 'client' ? 'client' : 'designer'}`}
              >
                <div className="message-bubble">
                  {msg.content}
                </div>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
            />
            <button onClick={handleSend} className="btn-primary">
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
