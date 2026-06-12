import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import type { GameSession, Item, Room, Puzzle, PlayerState } from '../../types';
import PuzzleModal from './PuzzleModal';
import ItemIcon from './ItemIcon';

const CELL_SIZE = 48;

function PlayerView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [activePuzzle, setActivePuzzle] = useState<{ item: Item; puzzle: Puzzle } | null>(null);
  const [puzzleResult, setPuzzleResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [socket, setSocket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorItems, setErrorItems] = useState<Set<string>>(new Set());
  const [successItems, setSuccessItems] = useState<Set<string>>(new Set());
  const [disappearingWalls, setDisappearingWalls] = useState<Set<string>>(new Set());
  const [showVictory, setShowVictory] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<{ id: number; x: number; color: string; delay: number }[]>([]);
  const [stats, setStats] = useState<{
    totalTime: number;
    successRate: number;
    totalPuzzles: number;
    solvedPuzzles: number;
  } | null>(null);

  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const inventoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSession();
    const newSocket = io('http://localhost:3002');
    setSocket(newSocket);

    newSocket.on('puzzle_result', (data: any) => {
      console.log('Puzzle result:', data);
    });

    newSocket.on('session_updated', (data: GameSession) => {
      setSession(data);
      if (player) {
        const updatedPlayer = data.players.find(p => p.id === player.id);
        if (updatedPlayer) {
          setPlayer(updatedPlayer);
          const room = data.escapeRoom.rooms.find(r => r.id === updatedPlayer.currentRoomId);
          if (room) setCurrentRoom(room);
        }
      }
    });

    newSocket.on('game_complete', (data: any) => {
      if (player && data.playerId === player.id) {
        setStats(data.stats);
        triggerVictory();
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (session && player) {
      const room = session.escapeRoom.rooms.find(r => r.id === player.currentRoomId);
      if (room) setCurrentRoom(room);
    }
  }, [session, player]);

  const loadSession = async () => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      
      if (sessionId.includes('-demo')) {
        const roomId = sessionId.replace('-demo', '');
        const roomRes = await axios.get(`/api/rooms/${roomId}`);
        const sessionRes = await axios.post('/api/sessions', {
          escapeRoomId: roomId,
          playerName: '玩家'
        });
        setSession(sessionRes.data);
        setPlayer(sessionRes.data.players[0]);
        const room = sessionRes.data.escapeRoom.rooms.find(
          (r: Room) => r.id === sessionRes.data.players[0].currentRoomId
        );
        if (room) setCurrentRoom(room);
        
        const newSocket = io('http://localhost:3002');
        newSocket.emit('join_session', {
          sessionId: sessionRes.data.id,
          playerId: sessionRes.data.players[0].id
        });
        setSocket(newSocket);
      } else {
        const res = await axios.get(`/api/sessions/${sessionId}`);
        setSession(res.data);
        setPlayer(res.data.players[0]);
        const room = res.data.escapeRoom.rooms.find(
          (r: Room) => r.id === res.data.players[0].currentRoomId
        );
        if (room) setCurrentRoom(room);
      }
    } catch (e) {
      console.error('Failed to load session:', e);
      alert('加载游戏失败');
      navigate('/');
    }
    setLoading(false);
  };

  const triggerVictory = () => {
    const colors = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ec4899', '#8b5cf6'];
    const pieces = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5
    }));
    setConfettiPieces(pieces);
    setShowVictory(true);
    
    setTimeout(() => {
    }, 2000);
  };

  const handleItemClick = (item: Item) => {
    if (item.type === 'door') {
      if (item.doorLocked) {
        triggerError(item.id);
        return;
      }
      if (item.doorTargetRoomId && session) {
        socket?.emit('move_room', {
          sessionId: session.id,
          playerId: player?.id,
          roomId: item.doorTargetRoomId
        });
      }
      return;
    }

    if (item.puzzle && !item.solved) {
      setActivePuzzle({ item, puzzle: item.puzzle });
      setPuzzleResult('idle');
    } else if (item.solved) {
      triggerSuccess(item.id);
    }
  };

  const handlePuzzleSubmit = (answer: string) => {
    if (!activePuzzle || !session || !player) return;

    socket?.emit('solve_puzzle', {
      sessionId: session.id,
      playerId: player.id,
      itemId: activePuzzle.item.id,
      answer
    });

    setTimeout(async () => {
      try {
        const res = await axios.get(`/api/sessions/${session.id}`);
        const updatedSession = res.data;
        const updatedItem = updatedSession.escapeRoom.rooms
          .flatMap((r: Room) => r.items)
          .find((i: Item) => i.id === activePuzzle.item.id);
        
        if (updatedItem?.solved) {
          setPuzzleResult('success');
          triggerSuccess(activePuzzle.item.id);
          
          if (updatedItem.effect?.type === 'remove_wall' && updatedItem.effect.targetId) {
            setDisappearingWalls(prev => new Set(prev).add(updatedItem.effect!.targetId!));
            setTimeout(() => {
              setDisappearingWalls(prev => {
                const next = new Set(prev);
                next.delete(updatedItem.effect!.targetId!);
                return next;
              });
            }, 600);
          }

          setTimeout(() => {
            setActivePuzzle(null);
            setPuzzleResult('idle');
            checkAllSolved(updatedSession);
          }, 1000);
        } else {
          setPuzzleResult('error');
          triggerError(activePuzzle.item.id);
        }
        
        setSession(updatedSession);
        const updatedPlayer = updatedSession.players.find((p: PlayerState) => p.id === player.id);
        if (updatedPlayer) setPlayer(updatedPlayer);
      } catch (e) {
        console.error('Error checking puzzle:', e);
      }
    }, 300);
  };

  const checkAllSolved = (sess: GameSession) => {
    let allDoorsUnlocked = true;
    for (const room of sess.escapeRoom.rooms) {
      for (const item of room.items) {
        if (item.type === 'door' && item.doorLocked) {
          allDoorsUnlocked = false;
          break;
        }
      }
    }
    
    if (allDoorsUnlocked && sess.escapeRoom.rooms.length > 0) {
      let totalTime = 0;
      let totalPuzzles = 0;
      let solvedPuzzles = 0;
      let totalAttempts = 0;
      let successfulAttempts = 0;
      
      if (player) {
        totalTime = Date.now() - player.startTime;
        for (const room of sess.escapeRoom.rooms) {
          totalPuzzles += room.items.filter(i => i.puzzle).length;
        }
        solvedPuzzles = player.solvedPuzzles.length;
        totalAttempts = player.totalAttempts;
        successfulAttempts = player.successfulAttempts;
      }
      
      setStats({
        totalTime,
        successRate: totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0,
        totalPuzzles,
        solvedPuzzles
      });
      triggerVictory();
    }
  };

  const triggerError = (itemId: string) => {
    setErrorItems(prev => new Set(prev).add(itemId));
    setTimeout(() => {
      setErrorItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, 300);
  };

  const triggerSuccess = (itemId: string) => {
    setSuccessItems(prev => new Set(prev).add(itemId));
    setTimeout(() => {
      setSuccessItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }, 500);
  };

  const handleCollectItem = (item: Item) => {
    if (!session || !player || item.type === 'door') return;
    
    socket?.emit('collect_item', {
      sessionId: session.id,
      playerId: player.id,
      itemId: item.id
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    
    if (isDragging && !draggedItem) {
      setViewOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, draggedItem]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedItem(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.5, Math.min(2, prev * delta)));
  };

  const handleInventoryItemDragStart = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    setDraggedItem(item);
    setIsDragging(true);
  };

  const renderWalls = () => {
    if (!currentRoom) return null;
    
    const wallMap = new Map<string, { visible: boolean; disappearing?: boolean }>();
    currentRoom.walls.forEach(w => {
      const key = `${w.x},${w.y}`;
      wallMap.set(key, { 
        visible: w.visible, 
        disappearing: disappearingWalls.has(key)
      });
    });

    const elements: JSX.Element[] = [];
    
    for (let y = 0; y < currentRoom.height; y++) {
      for (let x = 0; x < currentRoom.width; x++) {
        const key = `${x},${y}`;
        const wall = wallMap.get(key);
        
        if (wall?.visible) {
          elements.push(
            <div
              key={key}
              style={{
                position: 'absolute',
                left: x * CELL_SIZE,
                top: y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: '#475569',
                animation: wall.disappearing ? 'shatter 0.6s ease-out forwards' : undefined,
                transformOrigin: 'center'
              }}
            >
              <div style={{
                width: '100%',
                height: '100%',
                background: `
                  repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 8px,
                    rgba(0,0,0,0.15) 8px,
                    rgba(0,0,0,0.15) 10px
                  ),
                  repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 8px,
                    rgba(0,0,0,0.15) 8px,
                    rgba(0,0,0,0.15) 10px
                  )
                `,
                imageRendering: 'pixelated' as const
              }} />
            </div>
          );
        }
      }
    }
    
    return elements;
  };

  const renderItems = () => {
    if (!currentRoom) return null;

    return currentRoom.items
      .filter(item => !item.collected)
      .map(item => {
        const hasError = errorItems.has(item.id);
        const hasSuccess = successItems.has(item.id);
        
        return (
          <div
            key={item.id}
            className={`${hasError ? 'shake' : ''} item-drop`}
            style={{
              position: 'absolute',
              left: item.x * CELL_SIZE + 4,
              top: item.y * CELL_SIZE + 4,
              width: CELL_SIZE - 8,
              height: CELL_SIZE - 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              backgroundColor: hasError 
                ? 'rgba(239, 68, 68, 0.5)' 
                : hasSuccess 
                  ? 'rgba(34, 197, 94, 0.3)'
                  : item.solved 
                    ? 'rgba(34, 197, 94, 0.2)' 
                    : 'rgba(30, 41, 59, 0.7)',
              border: `2px solid ${
                hasError 
                  ? '#ef4444' 
                  : hasSuccess 
                    ? '#22c55e'
                    : item.solved 
                      ? '#22c55e' 
                      : item.type === 'door'
                        ? item.doorLocked ? '#ef4444' : '#22c55e'
                        : '#475569'
              }`,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: hasSuccess ? '0 0 15px rgba(34, 197, 94, 0.6)' : 'none',
              zIndex: hasError || hasSuccess ? 20 : 5
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleItemClick(item);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (item.type !== 'door' && !item.solved) {
                handleCollectItem(item);
              }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.zIndex = '15';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.zIndex = '5';
            }}
          >
            <ItemIcon type={item.type} size={24} />
            {item.type === 'door' && (
              <div style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                fontSize: '12px'
              }}>
                {item.doorLocked ? '🔒' : '🔓'}
              </div>
            )}
            {item.solved && item.type !== 'door' && (
              <div style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                fontSize: '10px'
              }}>
                ✓
              </div>
            )}
          </div>
        );
      });
  };

  const renderInventory = () => {
    if (!player) return null;

    return (
      <div
        ref={inventoryRef}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '10px',
          padding: '12px 16px',
          backgroundColor: 'rgba(30, 41, 59, 0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          border: '1px solid #334155',
          zIndex: 100,
          minWidth: '300px',
          minHeight: '70px',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        {player.inventory.length === 0 ? (
          <div style={{
            color: '#64748b',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%'
          }}>
            物品栏为空（双击道具可拾取）
          </div>
        ) : (
          player.inventory.map((item, index) => (
            <div
              key={item.id}
              style={{
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0f172a',
                borderRadius: '8px',
                border: '1px solid #475569',
                cursor: 'grab',
                animation: `bounceIn 0.4s ease-out ${index * 0.1}s both`
              }}
              onMouseDown={(e) => handleInventoryItemDragStart(e, item)}
              title={item.name}
            >
              <ItemIcon type={item.type} size={28} />
            </div>
          ))
        )}
      </div>
    );
  };

  const renderVictoryModal = () => {
    if (!showVictory) return null;

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        {confettiPieces.map(piece => (
          <div
            key={piece.id}
            className="confetti-piece"
            style={{
              left: `${piece.x}%`,
              top: '-20px',
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}s`,
              borderRadius: '2px'
            }}
          />
        ))}
        
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          padding: '40px 48px',
          textAlign: 'center',
          border: '2px solid #f97316',
          boxShadow: '0 0 40px rgba(249, 115, 22, 0.3)',
          animation: 'scaleIn 0.4s ease-out'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ color: '#f97316', fontSize: '32px', marginBottom: '24px' }}>
            恭喜通关！
          </h2>
          
          {stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '28px'
            }}>
              <div style={{
                padding: '16px',
                backgroundColor: '#0f172a',
                borderRadius: '8px'
              }}>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>总用时</div>
                <div style={{ color: '#f97316', fontSize: '24px', fontWeight: 'bold' }}>
                  {Math.floor(stats.totalTime / 1000)}秒
                </div>
              </div>
              <div style={{
                padding: '16px',
                backgroundColor: '#0f172a',
                borderRadius: '8px'
              }}>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>成功率</div>
                <div style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold' }}>
                  {stats.successRate.toFixed(0)}%
                </div>
              </div>
              <div style={{
                padding: '16px',
                backgroundColor: '#0f172a',
                borderRadius: '8px'
              }}>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>解谜数量</div>
                <div style={{ color: '#f1f5f9', fontSize: '24px', fontWeight: 'bold' }}>
                  {stats.solvedPuzzles}/{stats.totalPuzzles}
                </div>
              </div>
              <div style={{
                padding: '16px',
                backgroundColor: '#0f172a',
                borderRadius: '8px'
              }}>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>评价</div>
                <div style={{ color: '#eab308', fontSize: '24px', fontWeight: 'bold' }}>
                  {stats.successRate >= 80 ? '⭐⭐⭐' : stats.successRate >= 50 ? '⭐⭐' : '⭐'}
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 32px',
              backgroundColor: '#f97316',
              color: 'white',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a'
      }}>
        <div style={{ color: '#94a3b8', fontSize: '18px' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0f172a',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{
          padding: '10px 16px',
          backgroundColor: 'rgba(30, 41, 59, 0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: '8px',
          border: '1px solid #334155',
          color: '#f1f5f9',
          fontSize: '14px'
        }}>
          📍 {currentRoom?.name || '未知房间'}
        </div>
        {player && (
          <div style={{
            padding: '8px 14px',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            backdropFilter: 'blur(8px)',
            borderRadius: '8px',
            border: '1px solid #334155',
            color: '#94a3b8',
            fontSize: '12px'
          }}>
            玩家：{player.name}
          </div>
        )}
      </div>

      <div style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 50
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            backdropFilter: 'blur(8px)',
            borderRadius: '8px',
            border: '1px solid #334155',
            color: '#94a3b8',
            fontSize: '13px'
          }}
        >
          退出游戏
        </button>
      </div>

      <div
        ref={mapContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          width: '100%',
          height: '100%',
          cursor: isDragging ? 'grabbing' : 'grab',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${viewOffset.x}px), calc(-50% + ${viewOffset.y}px)) scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          {currentRoom && (
            <div
              style={{
                position: 'relative',
                width: currentRoom.width * CELL_SIZE,
                height: currentRoom.height * CELL_SIZE,
                backgroundColor: '#0f172a',
                borderRadius: '4px',
                boxShadow: '0 0 60px rgba(249, 115, 22, 0.1)'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `
                    linear-gradient(rgba(71, 85, 105, 0.15) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(71, 85, 105, 0.15) 1px, transparent 1px)
                  `,
                  backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                  pointerEvents: 'none'
                }}
              />
              {renderWalls()}
              {renderItems()}
            </div>
          )}
        </div>
      </div>

      {renderInventory()}

      {draggedItem && (
        <div
          style={{
            position: 'fixed',
            left: mousePos.x - 24,
            top: mousePos.y - 24,
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '8px',
            border: '2px solid #f97316',
            pointerEvents: 'none',
            zIndex: 1000,
            opacity: 0.8
          }}
        >
          <ItemIcon type={draggedItem.type} size={28} />
        </div>
      )}

      {activePuzzle && (
        <PuzzleModal
          puzzle={activePuzzle.puzzle}
          itemName={activePuzzle.item.name}
          isOpen={!!activePuzzle}
          onClose={() => {
            setActivePuzzle(null);
            setPuzzleResult('idle');
          }}
          onSubmit={handlePuzzleSubmit}
          result={puzzleResult}
        />
      )}

      {renderVictoryModal()}

      <div style={{
        position: 'fixed',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#64748b',
        fontSize: '12px',
        zIndex: 50
      }}>
        点击道具交互 | 双击拾取道具 | 拖动平移视角 | 滚轮缩放
      </div>
    </div>
  );
}

export default PlayerView;
