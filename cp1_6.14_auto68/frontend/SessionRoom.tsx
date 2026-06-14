import React, { useState, useEffect, useRef } from 'react';
import { sessionAPI, userAPI } from './http';

interface User {
  id: string;
  nickname: string;
  nativeLanguage: string;
  targetLanguage: string;
  avatarColor: string;
}

interface Message {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'topic';
}

interface Note {
  id: string;
  sessionId: string;
  userId: string;
  messageId: string;
  content: string;
  timestamp: number;
}

interface SessionRoomProps {
  sessionId: string;
  currentUser: User;
  partner: User;
  isReadOnly?: boolean;
  onBack: () => void;
}

const topicCards = [
  { id: 1, title: '你最喜欢的电影', content: '你最近看过什么好看的电影？' },
  { id: 2, title: '周末做什么', content: '周末你通常会做些什么？' },
  { id: 3, title: '美食分享', content: '你最喜欢吃什么菜？' },
  { id: 4, title: '旅行经历', content: '你去过最有趣的地方是哪里？' },
  { id: 5, title: '学习语言', content: '你为什么想学习这门语言？' },
  { id: 6, title: '工作与生活', content: '你是做什么工作的？' },
  { id: 7, title: '兴趣爱好', content: '你平时有什么兴趣爱好？' },
  { id: 8, title: '音乐品味', content: '你喜欢听什么类型的音乐？' },
];

const SessionRoom: React.FC<SessionRoomProps> = ({
  sessionId,
  currentUser,
  partner,
  isReadOnly = false,
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    message: Message | null;
  }>({ visible: false, x: 0, y: 0, message: null });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topicsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    loadNotes();
    
    if (!isReadOnly) {
      connectWebSocket();
      markSessionRead();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = () => {
    const wsUrl = `ws://localhost:3001`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', userId: currentUser.id }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat' && data.message) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    };
    
    wsRef.current = ws;
  };

  const markSessionRead = async () => {
    try {
      await userAPI.markRead(currentUser.id, sessionId);
    } catch (e) {
      console.error('Mark read error:', e);
    }
  };

  const loadMessages = async () => {
    try {
      const res: any = await sessionAPI.getMessages(sessionId);
      if (res.success) {
        setMessages(res.messages);
      }
    } catch (e) {
      console.error('Load messages error:', e);
    }
  };

  const loadNotes = async () => {
    try {
      const res: any = await sessionAPI.getNotes(sessionId, currentUser.id);
      if (res.success) {
        setNotes(res.notes);
      }
    } catch (e) {
      console.error('Load notes error:', e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isReadOnly) return;
    
    const content = inputText.trim();
    setInputText('');
    
    try {
      const res: any = await sessionAPI.sendMessage({
        sessionId,
        senderId: currentUser.id,
        content,
      });
      if (res.success) {
        setMessages((prev) => [...prev, res.message]);
      }
    } catch (e) {
      console.error('Send message error:', e);
    }
  };

  const handleTopicClick = (topic: typeof topicCards[0]) => {
    if (isReadOnly) return;
    setInputText(topic.content);
  };

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (clientX: number, clientY: number, message: Message) => {
    if (isReadOnly || message.senderId === currentUser.id) return;
    
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      setContextMenu({
        visible: true,
        x: clientX,
        y: clientY,
        message,
      });
    }, 1000);
  };

  const handleMessageMouseDown = (e: React.MouseEvent, message: Message) => {
    if (e.button !== 0) return;
    startLongPress(e.clientX, e.clientY, message);
  };

  const handleMessageMouseUp = () => {
    clearLongPressTimer();
  };

  const handleMessageMouseLeave = () => {
    clearLongPressTimer();
  };

  const handleMessageContextMenu = (e: React.MouseEvent, message: Message) => {
    if (isReadOnly || message.senderId === currentUser.id) return;
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      message,
    });
  };

  const handleTouchStart = (e: React.TouchEvent, message: Message) => {
    if (isReadOnly || message.senderId === currentUser.id) return;
    const touch = e.touches[0];
    startLongPress(touch.clientX, touch.clientY, message);
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
  };

  const handleTouchMove = () => {
    clearLongPressTimer();
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, message: null });
  };

  const handleCorrectPronunciation = () => {
    if (!contextMenu.message) return;
    setSelectedMessage(contextMenu.message);
    setCorrectionText(contextMenu.message.content);
    setShowCorrectionModal(true);
    handleCloseContextMenu();
  };

  const handleSubmitCorrection = async () => {
    if (!selectedMessage || !correctionText.trim()) return;
    
    try {
      const res: any = await sessionAPI.addCorrection({
        sessionId,
        messageId: selectedMessage.id,
        correctorId: currentUser.id,
        originalText: selectedMessage.content,
        correctedText: correctionText.trim(),
      });
      if (res.success) {
        setShowCorrectionModal(false);
        setSelectedMessage(null);
        setCorrectionText('');
      }
    } catch (e) {
      console.error('Submit correction error:', e);
    }
  };

  const handleAddNote = () => {
    if (!contextMenu.message) return;
    const noteContent = `原文：${contextMenu.message.content}\n笔记：`;
    
    sessionAPI.addNote({
      sessionId,
      userId: currentUser.id,
      messageId: contextMenu.message.id,
      content: noteContent,
    }).then((res: any) => {
      if (res.success) {
        setNotes((prev) => [res.note, ...prev]);
        setShowNotesPanel(true);
      }
    }).catch((e) => console.error('Add note error:', e));
    
    handleCloseContextMenu();
  };

  const handleAddNewNote = () => {
    const newNote: Note = {
      id: `temp-${Date.now()}`,
      sessionId,
      userId: currentUser.id,
      messageId: '',
      content: '',
      timestamp: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleNoteContentChange = (noteId: string, content: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, content } : n))
    );
  };

  const handleSaveNote = async (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note || !note.content.trim()) return;
    
    if (noteId.startsWith('temp-')) {
      try {
        const res: any = await sessionAPI.addNote({
          sessionId,
          userId: currentUser.id,
          content: note.content,
        });
        if (res.success) {
          setNotes((prev) =>
            prev.map((n) => (n.id === noteId ? res.note : n))
          );
        }
      } catch (e) {
        console.error('Save note error:', e);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="session-room" onClick={handleCloseContextMenu}>
      <div className="room-header">
        <button className="back-btn" onClick={onBack}>
          ← 返回
        </button>
        <div className="room-partner-info">
          <div
            className="partner-avatar-small"
            style={{ backgroundColor: partner.avatarColor }}
          >
            {partner.nickname.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="partner-name">{partner.nickname}</div>
            <div className="partner-lang">
              母语：{partner.nativeLanguage} | 学习：{partner.targetLanguage}
            </div>
          </div>
        </div>
        <button
          className="notes-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowNotesPanel(!showNotesPanel);
          }}
        >
          📝 笔记
        </button>
      </div>

      <div className="room-body">
        <div className="messages-section">
          <div className="topics-carousel" ref={topicsContainerRef}>
            {topicCards.map((topic) => (
              <div
                key={topic.id}
                className="topic-card"
                onClick={() => handleTopicClick(topic)}
              >
                <div className="topic-title">{topic.title}</div>
              </div>
            ))}
          </div>

          <div className="messages-list">
            {messages.map((message) => {
              const isOwn = message.senderId === currentUser.id;
              const sender = isOwn ? currentUser : partner;
              
              return (
                <div
                  key={message.id}
                  className={`message-bubble ${isOwn ? 'own' : 'other'}`}
                  onMouseDown={(e) => handleMessageMouseDown(e, message)}
                  onMouseUp={handleMessageMouseUp}
                  onMouseLeave={handleMessageMouseLeave}
                  onContextMenu={(e) => handleMessageContextMenu(e, message)}
                  onTouchStart={(e) => handleTouchStart(e, message)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                >
                  {!isOwn && (
                    <div
                      className="message-avatar"
                      style={{ backgroundColor: sender.avatarColor }}
                    >
                      {sender.nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="message-content-wrapper">
                    <div className="message-content">
                      {message.content}
                    </div>
                    <div className="message-time">{formatTime(message.timestamp)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {!isReadOnly && (
            <div className="input-section">
              <input
                type="text"
                className="message-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息..."
              />
              <button
                className="send-btn"
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
              >
                ➤
              </button>
            </div>
          )}
        </div>

        {(showNotesPanel || window.innerWidth >= 768) && (
          <div className={`notes-panel ${showNotesPanel ? 'visible' : ''}`}>
            <div className="notes-header">
              <h3>我的笔记</h3>
              <button className="add-note-btn" onClick={handleAddNewNote}>
                + 新建
              </button>
            </div>
            <div className="notes-list">
              {notes.length === 0 ? (
                <div className="notes-empty">暂无笔记</div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="note-item">
                    <textarea
                      className="note-content"
                      value={note.content}
                      onChange={(e) => handleNoteContentChange(note.id, e.target.value)}
                      onBlur={() => handleSaveNote(note.id)}
                      placeholder="写点什么..."
                    />
                    <div className="note-time">
                      {new Date(note.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {contextMenu.visible && contextMenu.message && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={handleCorrectPronunciation}>
            🔊 纠正发音
          </div>
          <div className="context-menu-item" onClick={handleAddNote}>
            📝 记笔记
          </div>
        </div>
      )}

      {showCorrectionModal && selectedMessage && (
        <div className="modal-overlay" onClick={() => setShowCorrectionModal(false)}>
          <div
            className="correction-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>纠正发音</h3>
            <div className="original-text">
              <span>原文：</span>
              <p>{selectedMessage.content}</p>
            </div>
            <textarea
              className="correction-textarea"
              value={correctionText}
              onChange={(e) => setCorrectionText(e.target.value)}
              placeholder="输入正确的发音或表达..."
            />
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowCorrectionModal(false)}
              >
                取消
              </button>
              <button className="submit-btn" onClick={handleSubmitCorrection}>
                提交纠正
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionRoom;
