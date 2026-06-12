import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ExchangeRequest, Message } from '@/types';
import { getAvatarColor, truncateText, formatRelativeTime } from '@/utils';
import { FaPaperPlane } from 'react-icons/fa';

export default function ChatPage() {
  const { currentUser, ws, showToast } = useAppContext();
  const [exchanges, setExchanges] = useState<ExchangeRequest[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<ExchangeRequest | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchExchanges = async () => {
      try {
        const res = await fetch(`/api/exchanges?userId=${currentUser._id}`);
        const data = await res.json();
        setExchanges(data);
      } catch (err) {
        console.error('Fetch exchanges error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchExchanges();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedExchange) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?exchangeId=${selectedExchange._id}`);
        const data = await res.json();
        setMessages(data);
        scrollToBottom();
      } catch (err) {
        console.error('Fetch messages error:', err);
      }
    };

    fetchMessages();

    if (ws) {
      ws.send(
        JSON.stringify({
          type: 'mark_read',
          exchangeId: selectedExchange._id,
          userId: currentUser?._id,
          fromUserId:
            selectedExchange.fromUserId === currentUser?._id
              ? selectedExchange.toUserId
              : selectedExchange.fromUserId,
        })
      );
    }
  }, [selectedExchange, ws, currentUser, scrollToBottom]);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message' && data.data) {
          const newMsg = data.data as Message;
          if (selectedExchange && newMsg.exchangeId === selectedExchange._id) {
            setMessages((prev) => {
              if (prev.some((m) => m._id === newMsg._id)) return prev;
              return [...prev, newMsg];
            });
            scrollToBottom();
          }
        }
      } catch (e) {
        console.error('WS message parse error:', e);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, selectedExchange, scrollToBottom]);

  const handleSend = () => {
    if (!inputText.trim() || !ws || !currentUser || !selectedExchange) return;

    const otherUserId =
      selectedExchange.fromUserId === currentUser._id
        ? selectedExchange.toUserId
        : selectedExchange.fromUserId;

    ws.send(
      JSON.stringify({
        type: 'message',
        exchangeId: selectedExchange._id,
        fromUserId: currentUser._id,
        toUserId: otherUserId,
        content: inputText.trim(),
        messageType: 'text',
      })
    );

    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getOtherUser = (exchange: ExchangeRequest) => {
    if (!currentUser) return null;
    return exchange.fromUserId === currentUser._id ? exchange.toUser : exchange.fromUser;
  };

  if (!currentUser) {
    return (
      <div style={{ paddingTop: '100px', textAlign: 'center', color: '#6b7280' }}>
        请先注册登录后查看消息
      </div>
    );
  }

  return (
    <div
      style={{
        paddingTop: '64px',
        height: '100vh',
        display: 'flex',
      }}
    >
      <div
        style={{
          width: '320px',
          borderRight: '1px solid #e5e7eb',
          backgroundColor: '#fff',
          overflowY: 'auto',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
            消息
          </h2>
        </div>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
            加载中...
          </div>
        ) : exchanges.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
            暂无交换请求，快去发现技能吧！
          </div>
        ) : (
          exchanges.map((exchange) => {
            const otherUser = getOtherUser(exchange);
            const isSelected = selectedExchange?._id === exchange._id;
            const avatarColor = getAvatarColor(otherUser?.nickname || '?');
            const initial = (otherUser?.nickname || '?').charAt(0);

            return (
              <div
                key={exchange._id}
                onClick={() => setSelectedExchange(exchange)}
                style={{
                  padding: '14px 20px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#f0f0ff' : 'transparent',
                  borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center text-white font-semibold flex-shrink-0"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: avatarColor,
                      fontSize: '16px',
                    }}
                  >
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                        {otherUser?.nickname || '未知用户'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                        {formatRelativeTime(exchange.createdAt)}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {exchange.skillName}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        className="flex-1 flex flex-col"
        style={{
          backgroundColor: '#fafafa',
          minWidth: 0,
        }}
      >
        {selectedExchange ? (
          <>
            <div
              style={{
                padding: '16px 24px',
                backgroundColor: '#fff',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', margin: 0 }}>
                {getOtherUser(selectedExchange)?.nickname || '未知用户'} · {selectedExchange.skillName}
              </h3>
              <span
                style={{
                  fontSize: '12px',
                  color:
                    selectedExchange.status === 'pending'
                      ? '#f59e0b'
                      : selectedExchange.status === 'confirmed'
                      ? '#3b82f6'
                      : '#10b981',
                }}
              >
                {selectedExchange.status === 'pending'
                  ? '待确认'
                  : selectedExchange.status === 'confirmed'
                  ? '已确认'
                  : '已完成'}
              </span>
            </div>

            <div
              ref={chatContainerRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 24px',
              }}
            >
              {messages.map((msg) => {
                const isSelf = msg.fromUserId === currentUser._id;
                const isSystem = msg.type === 'system';

                if (isSystem) {
                  return (
                    <div key={msg._id} style={{ textAlign: 'center', margin: '12px 0' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '6px 16px',
                          borderRadius: '12px',
                          backgroundColor: '#f3f4f6',
                          color: '#6b7280',
                          fontSize: '12px',
                        }}
                      >
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg._id}
                    style={{
                      display: 'flex',
                      justifyContent: isSelf ? 'flex-end' : 'flex-start',
                      marginBottom: '12px',
                    }}
                  >
                    <div
                      className={`message-bubble ${isSelf ? 'message-bubble-self' : 'message-bubble-other'}`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div
              style={{
                padding: '16px 24px',
                backgroundColor: '#fff',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <input
                className="input-focus"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                style={{
                  flex: 1,
                  maxWidth: '75%',
                  padding: '10px 20px',
                  borderRadius: '24px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f9fafb',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
              />
              <button
                className="btn-hover flex items-center justify-center"
                onClick={handleSend}
                disabled={!inputText.trim()}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: inputText.trim() ? '#6366f1' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              >
                <FaPaperPlane />
              </button>
            </div>
          </>
        ) : (
          <div
            className="flex items-center justify-center"
            style={{ flex: 1, color: '#9ca3af', fontSize: '15px' }}
          >
            选择一个对话开始聊天
          </div>
        )}
      </div>
    </div>
  );
}
