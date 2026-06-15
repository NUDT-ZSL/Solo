import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import type { Player, RoomState, Item, Clue, AreaType } from '../shared/types';
import { AREAS } from '../shared/types';
import Particles from './Particles';
import { playHourglassSound, playCombineSound, playClickSound } from './audio';

interface RoomProps {
  socket: Socket;
  player: Player;
  roomState: RoomState;
  onLeave: () => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const AREA_BACKGROUNDS: Record<AreaType, string> = {
  foyer: `
    radial-gradient(ellipse at 30% 20%, rgba(194, 167, 122, 0.4) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(212, 168, 67, 0.2) 0%, transparent 40%),
    linear-gradient(180deg, #3d3024 0%, #2a1f14 30%, #1a1208 70%, #0d0804 100%),
    repeating-linear-gradient(90deg, rgba(90, 106, 122, 0.08) 0px, rgba(90, 106, 122, 0.08) 2px, transparent 2px, transparent 80px),
    repeating-linear-gradient(0deg, rgba(90, 106, 122, 0.08) 0px, rgba(90, 106, 122, 0.08) 2px, transparent 2px, transparent 60px)
  `,
  tomb: `
    radial-gradient(ellipse at 50% 30%, rgba(139, 0, 0, 0.25) 0%, transparent 50%),
    radial-gradient(ellipse at 20% 70%, rgba(212, 168, 67, 0.15) 0%, transparent 40%),
    linear-gradient(180deg, #1a0a0a 0%, #2a1010 30%, #1a0808 70%, #0d0404 100%),
    repeating-linear-gradient(45deg, rgba(90, 106, 122, 0.05) 0px, rgba(90, 106, 122, 0.05) 4px, transparent 4px, transparent 100px)
  `,
  treasure: `
    radial-gradient(ellipse at 50% 50%, rgba(241, 196, 15, 0.4) 0%, transparent 60%),
    radial-gradient(ellipse at 20% 30%, rgba(212, 168, 67, 0.3) 0%, transparent 40%),
    radial-gradient(ellipse at 80% 70%, rgba(255, 215, 0, 0.25) 0%, transparent 40%),
    linear-gradient(180deg, #3d2e0a 0%, #2a1f05 30%, #1a1203 70%, #0d0801 100%),
    repeating-linear-gradient(135deg, rgba(212, 168, 67, 0.06) 0px, rgba(212, 168, 67, 0.06) 2px, transparent 2px, transparent 60px)
  `
};

const Room: React.FC<RoomProps> = ({ socket, player, roomState, onLeave }) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [particleTrigger, setParticleTrigger] = useState(0);
  const [combineShake, setCombineShake] = useState<string[] | null>(null);
  const [hoverItem, setHoverItem] = useState<Item | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastHourglassMinute = useRef<number>(-1);

  useEffect(() => {
    if (roomState.status !== 'playing') return;
    const currentMinute = Math.floor(roomState.timeLeft / 60);
    if (lastHourglassMinute.current !== currentMinute && lastHourglassMinute.current !== -1) {
      playHourglassSound();
    }
    lastHourglassMinute.current = currentMinute;
  }, [roomState.timeLeft, roomState.status]);

  useEffect(() => {
    const handler = (data: any) => {
      playCombineSound();
      setParticleTrigger((t) => t + 1);
    };
    socket.on('combine-success', handler);
    return () => {
      socket.off('combine-success', handler);
    };
  }, [socket]);

  useEffect(() => {
    const handler = (data: any) => {
      setCombineShake(data.items);
      setTimeout(() => setCombineShake(null), 500);
    };
    socket.on('combine-failed', handler);
    return () => {
      socket.off('combine-failed', handler);
    };
  }, [socket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomState.messages.length]);

  const handleStartGame = () => {
    playClickSound();
    socket.emit('start-game');
  };

  const handleDiscoverClue = (clue: Clue) => {
    playClickSound();
    setSelectedClue(clue);
    if (!clue.discovered) {
      socket.emit('discover-clue', clue.id);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    playClickSound();
    socket.emit('send-message', chatInput.trim());
    setChatInput('');
  };

  const handleSwitchArea = (area: AreaType) => {
    if (!roomState.unlockedAreas.includes(area)) return;
    playClickSound();
    socket.emit('switch-area', area);
  };

  const handleDragStart = (e: React.DragEvent, item: Item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItemId(null);
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem.id !== itemId) {
      setDragOverItemId(itemId);
    }
  };

  const handleDragLeave = () => {
    setDragOverItemId(null);
  };

  const handleDrop = (e: React.DragEvent, targetItem: Item) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;
    setDragOverItemId(null);
    setDraggedItem(null);
    socket.emit('combine-items', [draggedItem.id, targetItem.id]);
  };

  const currentAreaInfo = AREAS.find((a) => a.id === roomState.currentArea)!;
  const areaClues = roomState.clues.filter((c) => c.area === roomState.currentArea);
  const timeLeft = roomState.timeLeft;
  const isUrgent = timeLeft <= 600 && roomState.status === 'playing';
  const progressPercent = (roomState.progress / roomState.totalProgress) * 100;

  const progressColor = `linear-gradient(90deg, #E74C3C ${Math.max(0, 100 - progressPercent * 1.5)}%, #F1C40F ${progressPercent}%)`;

  if (roomState.status === 'won') {
    const totalTime = roomState.startedAt ? Math.floor((Date.now() - roomState.startedAt) / 1000) : 0;
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: `radial-gradient(ellipse at center, rgba(241, 196, 15, 0.3) 0%, #1a0f08 70%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px'
        }}
      >
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>🏆</div>
        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            color: '#F1C40F',
            letterSpacing: '8px',
            textShadow: '0 0 30px rgba(241, 196, 15, 0.6)',
            marginBottom: '16px'
          }}
        >
          胜 利 逃 脱
        </h1>
        <p style={{ color: '#C2A77A', fontSize: '20px', marginBottom: '12px', letterSpacing: '2px' }}>
          你们成功破解了所有谜题，走出了沙影谜城！
        </p>
        <p style={{ color: '#D4A843', fontSize: '24px', marginBottom: '32px', letterSpacing: '3px' }}>
          总用时：{formatTime(3600 - timeLeft)}
        </p>
        <button
          onClick={onLeave}
          style={{
            padding: '14px 40px',
            background: 'linear-gradient(180deg, #D4A843 0%, #A8802A 100%)',
            border: '1px solid #8B6914',
            borderRadius: '6px',
            color: '#1a0f08',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            letterSpacing: '4px'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          返回大厅
        </button>
      </div>
    );
  }

  if (roomState.status === 'lost') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: `radial-gradient(ellipse at center, rgba(139, 0, 0, 0.4) 0%, #0a0503 70%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px'
        }}
      >
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>💀</div>
        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            color: '#8B0000',
            letterSpacing: '8px',
            textShadow: '0 0 30px rgba(139, 0, 0, 0.6)',
            marginBottom: '16px'
          }}
        >
          时 间 耗 尽
        </h1>
        <p style={{ color: '#C2A77A', fontSize: '20px', marginBottom: '32px', letterSpacing: '2px' }}>
          沙漏流尽，你们永远留在了这片沙影之中...
        </p>
        <button
          onClick={onLeave}
          style={{
            padding: '14px 40px',
            background: 'rgba(139, 0, 0, 0.3)',
            border: '1px solid rgba(139, 0, 0, 0.6)',
            borderRadius: '6px',
            color: '#E74C3C',
            fontSize: '18px',
            fontWeight: 'bold',
            cursor: 'pointer',
            letterSpacing: '4px'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          返回大厅
        </button>
      </div>
    );
  }

  if (roomState.status === 'waiting') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(ellipse at top, #3a2a1a 0%, #1a0f08 50%, #0a0503 100%)
          `,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px'
        }}
      >
        <div
          style={{
            background: 'rgba(30, 20, 10, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(212, 168, 67, 0.4)',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '520px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>𓊽</div>
          <h2 style={{ color: '#D4A843', letterSpacing: '6px', marginBottom: '8px', fontSize: '28px' }}>
            房间已创建
          </h2>
          <p style={{ color: '#C2A77A', fontSize: '14px', letterSpacing: '2px', marginBottom: '24px' }}>
            房间号（分享给队友）
          </p>
          <div
            style={{
              fontSize: '42px',
              fontFamily: 'monospace',
              letterSpacing: '16px',
              color: '#F1C40F',
              background: 'rgba(0,0,0,0.4)',
              padding: '16px 24px',
              borderRadius: '8px',
              marginBottom: '28px',
              border: '1px solid rgba(212, 168, 67, 0.3)',
              textShadow: '0 0 15px rgba(241, 196, 15, 0.4)'
            }}
          >
            {roomState.roomId}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                color: '#C2A77A',
                fontSize: '14px',
                letterSpacing: '2px',
                marginBottom: '12px',
                textAlign: 'left'
              }}
            >
              玩家列表（{roomState.players.length}/4）
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px'
              }}
            >
              {roomState.players.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: '10px 14px',
                    background: p.id === player.id ? 'rgba(212, 168, 67, 0.15)' : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${p.id === player.id ? 'rgba(212, 168, 67, 0.5)' : 'rgba(212, 168, 67, 0.15)'}`,
                    borderRadius: '6px',
                    color: '#D4A843',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{p.isAdmin ? '👑' : '🧑'}</span>
                  <span style={{ flex: 1 }}>{p.nickname}</span>
                  {p.id === player.id && (
                    <span style={{ fontSize: '11px', color: '#F1C40F' }}>(你)</span>
                  )}
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - roomState.players.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px dashed rgba(90, 106, 122, 0.4)',
                    borderRadius: '6px',
                    color: '#5A6A7A',
                    fontSize: '13px',
                    textAlign: 'center'
                  }}
                >
                  等待玩家...
                </div>
              ))}
            </div>
          </div>

          {player.isAdmin ? (
            <button
              onClick={handleStartGame}
              disabled={roomState.players.length < 2}
              style={{
                width: '100%',
                padding: '14px',
                background:
                  roomState.players.length >= 2
                    ? 'linear-gradient(180deg, #D4A843 0%, #A8802A 100%)'
                    : 'rgba(90, 106, 122, 0.3)',
                border: `1px solid ${roomState.players.length >= 2 ? '#8B6914' : 'rgba(90, 106, 122, 0.4)'}`,
                borderRadius: '6px',
                color: roomState.players.length >= 2 ? '#1a0f08' : '#5A6A7A',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: roomState.players.length >= 2 ? 'pointer' : 'not-allowed',
                letterSpacing: '4px',
                transition: 'transform 0.15s'
              }}
              onMouseDown={(e) => roomState.players.length >= 2 && (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {roomState.players.length < 2 ? `至少需要${2 - roomState.players.length}名玩家` : '🎮 开始冒险'}
            </button>
          ) : (
            <div
              style={{
                padding: '14px',
                color: '#5A6A7A',
                fontSize: '14px',
                letterSpacing: '2px'
              }}
            >
              等待房主开始游戏...
            </div>
          )}

          <button
            onClick={onLeave}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '10px',
              background: 'transparent',
              border: '1px solid rgba(139, 0, 0, 0.4)',
              borderRadius: '6px',
              color: '#8B0000',
              fontSize: '14px',
              cursor: 'pointer',
              letterSpacing: '2px'
            }}
          >
            离开房间
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0503',
        overflow: 'hidden'
      }}
    >
      {/* 顶部状态栏 */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 20px',
          background: 'rgba(20, 12, 6, 0.9)',
          borderBottom: '1px solid rgba(212, 168, 67, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          zIndex: 10
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#D4A843',
            fontSize: '14px',
            letterSpacing: '2px'
          }}
        >
          <span>𓂀</span>
          <span style={{ fontFamily: 'monospace' }}>#{roomState.roomId}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '150px', maxWidth: '350px' }}>
          <span style={{ color: '#C2A77A', fontSize: '12px', letterSpacing: '1px' }}>进度</span>
          <div
            style={{
              flex: 1,
              height: '10px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '5px',
              overflow: 'hidden',
              border: '1px solid rgba(212, 168, 67, 0.2)'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: progressColor,
                transition: 'width 0.5s ease-out',
                boxShadow: '0 0 10px rgba(241, 196, 15, 0.4)'
              }}
            />
          </div>
          <span style={{ color: '#D4A843', fontSize: '12px', fontFamily: 'monospace', minWidth: '36px', textAlign: 'right' }}>
            {roomState.progress}/{roomState.totalProgress}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: isUrgent ? '#E74C3C' : '#D4A843',
            fontSize: '20px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            letterSpacing: '2px',
            textShadow: isUrgent ? '0 0 10px rgba(231, 76, 60, 0.6)' : '0 0 10px rgba(212, 168, 67, 0.3)',
            animation: isUrgent ? 'urgent-blink 0.3s infinite' : 'none'
          }}
        >
          <span>⏳</span>
          <span>{formatTime(timeLeft)}</span>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {roomState.players.map((p) => (
            <div
              key={p.id}
              title={p.nickname}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: p.id === player.id ? 'rgba(212, 168, 67, 0.3)' : 'rgba(90, 106, 122, 0.3)',
                border: `1px solid ${p.id === player.id ? '#D4A843' : '#5A6A7A'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}
            >
              {p.isAdmin ? '👑' : '🧑'}
            </div>
          ))}
        </div>

        <button
          onClick={() => setChatOpen(!chatOpen)}
          style={{
            padding: '6px 12px',
            background: chatOpen ? 'rgba(212, 168, 67, 0.2)' : 'transparent',
            border: `1px solid ${chatOpen ? 'rgba(212, 168, 67, 0.5)' : 'rgba(212, 168, 67, 0.2)'}`,
            borderRadius: '4px',
            color: '#D4A843',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          💬 {roomState.messages.length > 0 && (
            <span
              style={{
                background: '#8B0000',
                color: 'white',
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '8px',
                minWidth: '16px',
                textAlign: 'center'
              }}
            >
              {roomState.messages.length > 99 ? '99+' : roomState.messages.length}
            </span>
          )}
        </button>

        <button
          onClick={onLeave}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid rgba(139, 0, 0, 0.4)',
            borderRadius: '4px',
            color: '#8B0000',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          退出
        </button>
      </div>

      {/* 主内容区 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          minHeight: 0
        }}
      >
        {/* 左侧：场景描述 */}
        <div
          className="scene-desc-panel"
          style={{
            width: '30%',
            minWidth: '240px',
            flexShrink: 0,
            background: 'rgba(20, 12, 6, 0.65)',
            backdropFilter: 'blur(8px)',
            borderRight: '1px solid rgba(212, 168, 67, 0.15)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflow: 'auto',
            boxSizing: 'border-box'
          }}
        >
          <div>
            <div
              style={{
                color: '#C2A77A',
                fontSize: '12px',
                letterSpacing: '3px',
                marginBottom: '6px',
                opacity: 0.8
              }}
            >
              当 前 区 域
            </div>
            <h2
              style={{
                color: '#D4A843',
                fontSize: '28px',
                letterSpacing: '6px',
                textShadow: '0 0 15px rgba(212, 168, 67, 0.3)',
                marginBottom: '12px'
              }}
            >
              {currentAreaInfo.name}
            </h2>
            <p
              style={{
                color: '#C2A77A',
                fontSize: '14px',
                lineHeight: '1.8',
                letterSpacing: '1px'
              }}
            >
              {currentAreaInfo.description}
            </p>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(212, 168, 67, 0.15)',
              paddingTop: '16px'
            }}
          >
            <div
              style={{
                color: '#C2A77A',
                fontSize: '12px',
                letterSpacing: '3px',
                marginBottom: '12px',
                opacity: 0.8
              }}
            >
              区 域 导 航
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {AREAS.map((area) => {
                const unlocked = roomState.unlockedAreas.includes(area.id);
                const active = roomState.currentArea === area.id;
                return (
                  <button
                    key={area.id}
                    onClick={() => handleSwitchArea(area.id)}
                    disabled={!unlocked}
                    style={{
                      padding: '10px 14px',
                      background: active
                        ? 'rgba(212, 168, 67, 0.2)'
                        : unlocked
                        ? 'rgba(0,0,0,0.3)'
                        : 'rgba(0,0,0,0.15)',
                      border: `1px solid ${
                        active
                          ? 'rgba(212, 168, 67, 0.6)'
                          : unlocked
                          ? 'rgba(212, 168, 67, 0.2)'
                          : 'rgba(90, 106, 122, 0.2)'
                      }`,
                      borderRadius: '6px',
                      color: unlocked ? (active ? '#F1C40F' : '#D4A843') : '#5A6A7A',
                      fontSize: '14px',
                      cursor: unlocked ? 'pointer' : 'not-allowed',
                      letterSpacing: '2px',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseDown={(e) => unlocked && (e.currentTarget.style.transform = 'scale(0.97)')}
                    onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <span>{unlocked ? (active ? '📍' : '➤') : '🔒'}</span>
                    <span>{area.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(212, 168, 67, 0.15)',
              paddingTop: '16px'
            }}
          >
            <div
              style={{
                color: '#C2A77A',
                fontSize: '12px',
                letterSpacing: '3px',
                marginBottom: '12px',
                opacity: 0.8
              }}
            >
              线 索 提 示
            </div>
            <div style={{ color: '#8E9A8B', fontSize: '13px', lineHeight: '1.7' }}>
              {areaClues.filter((c) => c.discovered).length === 0 ? (
                <p style={{ opacity: 0.6, fontStyle: 'italic' }}>
                  场景中似乎隐藏着线索... 点击场景中闪烁的光点来探索。
                </p>
              ) : (
                areaClues
                  .filter((c) => c.discovered)
                  .map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: '8px 10px',
                        background: 'rgba(212, 168, 67, 0.08)',
                        borderRadius: '4px',
                        marginBottom: '6px',
                        borderLeft: '2px solid #D4A843'
                      }}
                    >
                      <div style={{ color: '#D4A843', fontSize: '13px', marginBottom: '3px' }}>
                        ✦ {c.title}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* 中间：主场景 */}
        <div
          className="scene-area"
          style={{
            flex: 1,
            position: 'relative',
            background: AREA_BACKGROUNDS[roomState.currentArea],
            overflow: 'hidden',
            minWidth: 0
          }}
        >
          <Particles trigger={particleTrigger} />

          {/* 装饰性象形文字 */}
          <div
            style={{
              position: 'absolute',
              top: '5%',
              left: '5%',
              fontSize: 'clamp(30px, 5vw, 60px)',
              opacity: 0.12,
              color: '#D4A843',
              letterSpacing: '10px',
              pointerEvents: 'none'
            }}
          >
            𓂀 𓆣 𓋹
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '15%',
              right: '5%',
              fontSize: 'clamp(30px, 5vw, 60px)',
              opacity: 0.12,
              color: '#D4A843',
              letterSpacing: '10px',
              pointerEvents: 'none'
            }}
          >
            𓊽 𓁹 𓃭
          </div>

          {/* 线索点 */}
          {areaClues.map((clue) => (
            <div
              key={clue.id}
              onClick={() => handleDiscoverClue(clue)}
              title={clue.discovered ? clue.title : '神秘线索'}
              style={{
                position: 'absolute',
                left: `${clue.position.x}%`,
                top: `${clue.position.y}%`,
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                zIndex: 5
              }}
              onMouseDown={(e) => {
                const el = e.currentTarget;
                el.style.transform = 'translate(-50%, -50%) scale(0.95)';
                setTimeout(() => (el.style.transform = 'translate(-50%, -50%) scale(1)'), 150);
              }}
            >
              <div
                style={{
                  width: 'clamp(28px, 4vw, 44px)',
                  height: 'clamp(28px, 4vw, 44px)',
                  borderRadius: '50%',
                  background: clue.discovered
                    ? 'rgba(212, 168, 67, 0.3)'
                    : 'rgba(241, 196, 15, 0.6)',
                  border: `2px solid ${clue.discovered ? 'rgba(212, 168, 67, 0.5)' : '#F1C40F'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'clamp(14px, 2vw, 20px)',
                  boxShadow: clue.discovered
                    ? 'none'
                    : '0 0 20px rgba(241, 196, 15, 0.7), 0 0 40px rgba(241, 196, 15, 0.3)',
                  animation: clue.discovered ? 'none' : 'clue-pulse 1.5s infinite',
                  transition: 'all 0.2s'
                }}
              >
                {clue.discovered ? '✓' : '?'}
              </div>
            </div>
          ))}

          {/* 线索详情弹窗 */}
          {selectedClue && (
            <div
              onClick={() => setSelectedClue(null)}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
                backdropFilter: 'blur(4px)'
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'linear-gradient(180deg, rgba(40, 28, 14, 0.95) 0%, rgba(26, 18, 8, 0.95) 100%)',
                  border: '2px solid rgba(212, 168, 67, 0.5)',
                  borderRadius: '10px',
                  padding: '28px 32px',
                  maxWidth: '500px',
                  width: '90%',
                  boxShadow: '0 0 40px rgba(212, 168, 67, 0.2)',
                  position: 'relative'
                }}
              >
                <button
                  onClick={() => setSelectedClue(null)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '14px',
                    background: 'none',
                    border: 'none',
                    color: '#5A6A7A',
                    fontSize: '22px',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
                <div
                  style={{
                    fontSize: '32px',
                    textAlign: 'center',
                    marginBottom: '12px'
                  }}
                >
                  {selectedClue.mediaType === 'text' ? '📜' : selectedClue.mediaType === 'image' ? '🖼️' : '🔊'}
                </div>
                <h3
                  style={{
                    color: '#F1C40F',
                    fontSize: '22px',
                    letterSpacing: '4px',
                    textAlign: 'center',
                    marginBottom: '16px',
                    textShadow: '0 0 15px rgba(241, 196, 15, 0.4)'
                  }}
                >
                  {selectedClue.title}
                </h3>
                {selectedClue.mediaType === 'image' && selectedClue.mediaData && (
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(212, 168, 67, 0.2)',
                      borderRadius: '6px',
                      padding: '20px',
                      textAlign: 'center',
                      marginBottom: '16px',
                      fontSize: '48px'
                    }}
                  >
                    {selectedClue.mediaType === 'image' && selectedClue.id.includes('foyer-3') && '🪶'}
                    {selectedClue.mediaType === 'image' && selectedClue.id.includes('tomb-3') && '🔱'}
                    {selectedClue.mediaType === 'image' && selectedClue.id.includes('treasure-1') && '☥'}
                    <div style={{ fontSize: '13px', color: '#8E9A8B', marginTop: '8px' }}>
                      [{selectedClue.mediaData}]
                    </div>
                  </div>
                )}
                <p
                  style={{
                    color: '#C2A77A',
                    fontSize: '15px',
                    lineHeight: '1.9',
                    letterSpacing: '1px'
                  }}
                >
                  {selectedClue.content}
                </p>
                {selectedClue.linkedItemId && selectedClue.discovered && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '10px 14px',
                      background: 'rgba(46, 204, 113, 0.12)',
                      border: '1px solid rgba(46, 204, 113, 0.3)',
                      borderRadius: '6px',
                      color: '#2ECC71',
                      fontSize: '13px',
                      textAlign: 'center',
                      letterSpacing: '1px'
                    }}
                  >
                    ✦ 获得物品，已放入道具栏
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧：聊天面板 */}
        {chatOpen && (
          <div
            className="chat-panel"
            style={{
              width: '300px',
              minWidth: '260px',
              flexShrink: 0,
              background: 'rgba(20, 12, 6, 0.85)',
              borderLeft: '1px solid rgba(212, 168, 67, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              backdropFilter: 'blur(8px)'
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(212, 168, 67, 0.15)',
                color: '#D4A843',
                fontSize: '14px',
                letterSpacing: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              💬 小队通讯
            </div>
            <div
              style={{
                flex: 1,
                padding: '12px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {roomState.messages.length === 0 ? (
                <div
                  style={{
                    color: '#5A6A7A',
                    fontSize: '12px',
                    textAlign: 'center',
                    marginTop: '20px',
                    fontStyle: 'italic',
                    opacity: 0.7
                  }}
                >
                  暂无消息，开始和队友交流吧...
                </div>
              ) : (
                roomState.messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      alignSelf: msg.playerId === player.id ? 'flex-end' : 'flex-start',
                      maxWidth: '85%'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: msg.playerId === player.id ? '#F1C40F' : '#8E9A8B',
                        letterSpacing: '1px'
                      }}
                    >
                      {msg.nickname}
                    </div>
                    <div
                      style={{
                        padding: '8px 12px',
                        background:
                          msg.playerId === player.id
                            ? 'rgba(212, 168, 67, 0.18)'
                            : 'rgba(90, 106, 122, 0.2)',
                        border: `1px solid ${
                          msg.playerId === player.id
                            ? 'rgba(212, 168, 67, 0.35)'
                            : 'rgba(90, 106, 122, 0.3)'
                        }`,
                        borderRadius: msg.playerId === player.id ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                        color: '#C2A77A',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        wordBreak: 'break-word'
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '10px 12px',
                borderTop: '1px solid rgba(212, 168, 67, 0.15)',
                display: 'flex',
                gap: '8px'
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="发送消息..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(212, 168, 67, 0.2)',
                  borderRadius: '4px',
                  color: '#D4A843',
                  fontSize: '13px',
                  outline: 'none',
                  minWidth: 0
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '6px 14px',
                  background: 'rgba(212, 168, 67, 0.2)',
                  border: '1px solid rgba(212, 168, 67, 0.4)',
                  borderRadius: '4px',
                  color: '#D4A843',
                  fontSize: '13px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                发送
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 底部：道具栏 */}
      <div
        style={{
          flexShrink: 0,
          height: '120px',
          background: 'linear-gradient(180deg, rgba(20, 12, 6, 0.9) 0%, rgba(15, 8, 4, 0.95) 100%)',
          borderTop: '1px solid rgba(212, 168, 67, 0.2)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxSizing: 'border-box',
          zIndex: 10,
          position: 'relative'
        }}
      >
        <div
          style={{
            color: '#C2A77A',
            fontSize: '12px',
            letterSpacing: '3px',
            writingMode: 'vertical-rl',
            opacity: 0.7
          }}
        >
          道 具 栏
        </div>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flex: 1,
            overflowX: 'auto'
          }}
        >
          {Array.from({ length: 10 }).map((_, idx) => {
            const item = roomState.items[idx];
            const isDragging = draggedItem?.id === item?.id;
            const isDragOver = dragOverItemId === item?.id && draggedItem && draggedItem.id !== item?.id;
            const isShaking = combineShake?.includes(item?.id || '');
            return (
              <div
                key={idx}
                draggable={!!item}
                onDragStart={(e) => item && handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => item && handleDragOver(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => item && handleDrop(e, item)}
                onMouseEnter={() => item && setHoverItem(item)}
                onMouseLeave={() => setHoverItem(null)}
                style={{
                  width: '88px',
                  height: '88px',
                  flexShrink: 0,
                  background: item
                    ? isDragOver
                      ? 'rgba(241, 196, 15, 0.25)'
                      : 'rgba(212, 168, 67, 0.08)'
                    : 'rgba(0,0,0,0.3)',
                  border: `2px solid ${
                    item
                      ? isDragOver
                        ? '#F1C40F'
                        : 'rgba(212, 168, 67, 0.35)'
                      : 'rgba(90, 106, 122, 0.25)'
                  }`,
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: item ? 'grab' : 'default',
                  opacity: isDragging ? 0.4 : 1,
                  transform: item ? 'scale(1)' : 'scale(1)',
                  transition: 'transform 0.2s ease-out, border-color 0.2s, box-shadow 0.2s',
                  animation: isShaking ? 'shake 0.5s' : 'none',
                  position: 'relative',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                  if (item) {
                    e.currentTarget.style.transform = 'scale(1.15)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 168, 67, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {item ? (
                  <>
                    <span style={{ fontSize: '36px', lineHeight: 1 }}>{item.icon}</span>
                    <span
                      style={{
                        fontSize: '10px',
                        color: '#D4A843',
                        letterSpacing: '1px',
                        textAlign: 'center',
                        maxWidth: '80px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.name}
                    </span>
                  </>
                ) : (
                  <span style={{ color: '#5A6A7A', fontSize: '24px', opacity: 0.4 }}>·</span>
                )}
              </div>
            );
          })}
        </div>

        {/* 道具提示 */}
        {hoverItem && (
          <div
            style={{
              position: 'absolute',
              bottom: '100px',
              right: '20px',
              background: 'rgba(26, 18, 8, 0.95)',
              border: '1px solid rgba(212, 168, 67, 0.4)',
              borderRadius: '6px',
              padding: '10px 14px',
              maxWidth: '260px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
              zIndex: 20
            }}
          >
            <div style={{ color: '#F1C40F', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
              {hoverItem.icon} {hoverItem.name}
            </div>
            <div style={{ color: '#C2A77A', fontSize: '12px', lineHeight: '1.6' }}>
              {hoverItem.description}
            </div>
            <div style={{ color: '#5A6A7A', fontSize: '11px', marginTop: '6px', letterSpacing: '1px' }}>
              拖拽到其他道具上进行组合
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes clue-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 20px rgba(241, 196, 15, 0.7), 0 0 40px rgba(241, 196, 15, 0.3); }
          50% { transform: translate(-50%, -50%) scale(1.15); box-shadow: 0 0 30px rgba(241, 196, 15, 0.9), 0 0 60px rgba(241, 196, 15, 0.5); }
        }
        @keyframes urgent-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @media (max-width: 1024px) {
          .chat-panel { width: 60px !important; min-width: 60px !important; }
          .chat-panel > div:not(:first-child) { display: none; }
        }
        @media (max-width: 768px) {
          .scene-desc-panel { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Room;
