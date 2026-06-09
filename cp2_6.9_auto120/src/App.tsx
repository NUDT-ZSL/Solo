import { useState, useEffect, useRef, useCallback } from 'react';
import GalleryRoom from './components/GalleryRoom';
import ChatPanel from './components/ChatPanel';
import type { Hall, ChatMessage } from './types';

const COLOR_NAMES = ['红', '橙', '黄', '绿', '青', '蓝', '紫'];
const getRandomColorName = () => COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];

export default function App() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [currentHallId, setCurrentHallId] = useState<string | null>(null);
  const [currentHall, setCurrentHall] = useState<Hall | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineFading, setOnlineFading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const userNameRef = useRef<string>(getRandomColorName());
  const userColorRef = useRef<string>(userNameRef.current);

  useEffect(() => {
    fetch('/api/halls')
      .then((res) => res.json())
      .then((data: Hall[]) => setHalls(data))
      .catch((err) => console.error('Failed to load halls:', err));
  }, []);

  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        /* noop */
      }
      wsRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback((hallId: string) => {
    closeWebSocket();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?hallId=${hallId}&userName=${userNameRef.current}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      /* noop */
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === 'online') {
        setOnlineFading(true);
        setTimeout(() => {
          setOnlineCount(data.count);
          setOnlineFading(false);
        }, 150);

        if (data.action === 'join' && data.userName && data.userName !== userNameRef.current) {
          setMessages((prev) => [
            ...prev,
            {
              type: 'system',
              userName: '系统',
              userColor: 'system',
              content: `${data.userName}已进入展厅`,
              timestamp: Date.now()
            }
          ]);
        }
      } else if (data.type === 'chat') {
        setMessages((prev) => [
          ...prev,
          {
            type: 'chat',
            userName: data.userName,
            userColor: data.userColor,
            content: data.content,
            timestamp: data.timestamp
          }
        ]);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  }, [closeWebSocket]);

  const handleHallSelect = useCallback((hallId: string) => {
    if (hallId === currentHallId) return;

    setTransitioning(true);
    setLoading(true);
    setMessages([]);

    setTimeout(() => {
      setCurrentHallId(hallId);
      fetch(`/api/halls/${hallId}`)
        .then((res) => res.json())
        .then((data: Hall) => {
          setCurrentHall(data);
          connectWebSocket(hallId);
        })
        .catch((err) => {
          console.error('Failed to load hall:', err);
        })
        .finally(() => {
          setTimeout(() => {
            setLoading(false);
            setTransitioning(false);
          }, 200);
        });
    }, 400);
  }, [currentHallId, connectWebSocket]);

  const handleBackToHome = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      closeWebSocket();
      setCurrentHallId(null);
      setCurrentHall(null);
      setOnlineCount(0);
      setMessages([]);
      setTimeout(() => {
        setTransitioning(false);
      }, 400);
    }, 400);
  }, [closeWebSocket]);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!content.trim()) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'chat',
        userName: userNameRef.current,
        userColor: userColorRef.current,
        content: content.trim()
      })
    );
  }, []);

  useEffect(() => {
    return () => {
      closeWebSocket();
    };
  }, [closeWebSocket]);

  return (
    <div className="app-container">
      {currentHallId && currentHall && (
        <div className="top-bar">
          <button className="back-button" onClick={handleBackToHome}>
            ← 返回
          </button>
          <div className="hall-title">{currentHall.name}</div>
          <div className="online-count">
            <span className="online-dot" />
            <span>在线</span>
            <span className={`online-number ${onlineFading ? 'fading' : ''}`}>{onlineCount}/10</span>
          </div>
        </div>
      )}

      {!currentHallId ? (
        <div
          className={`home-view ${transitioning ? 'fade-out' : 'fade-in'}`}
          style={{ opacity: transitioning ? 0 : 1, transition: 'opacity 0.8s ease' }}
        >
          <h1 className="home-title">虚拟艺术画廊</h1>
          <p className="home-subtitle">请选择一个展厅开始参观</p>
          <div className="hall-cards">
            {halls.map((hall) => (
              <div
                key={hall.id}
                className="hall-card"
                onClick={() => handleHallSelect(hall.id)}
              >
                <div className="hall-card-thumb">
                  <img src={hall.thumbnail} alt={hall.name} />
                  <div
                    className="hall-card-gradient"
                    style={{
                      background: `linear-gradient(180deg, transparent 0%, ${hall.gradientFrom}99 100%)`
                    }}
                  />
                </div>
                <div className="hall-card-info">
                  <div className="hall-card-name">{hall.name}</div>
                  <div className="hall-card-theme">{hall.theme}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        currentHall && (
          <GalleryRoom
            hall={currentHall}
            transitioning={transitioning}
          />
        )
      )}

      {loading && (
        <div className="loading-container">
          <div className="crystal" />
        </div>
      )}

      {currentHallId && (
        <ChatPanel
          ws={wsRef.current}
          messages={messages}
          userName={userNameRef.current}
          onSendMessage={sendMessage}
        />
      )}
    </div>
  );
}
