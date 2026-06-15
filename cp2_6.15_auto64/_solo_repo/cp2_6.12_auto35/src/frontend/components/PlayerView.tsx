import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import type { GameSession, Item, Room, Puzzle, PlayerState } from '../../types';
import PuzzleModal from './PuzzleModal';
import ItemIcon from './ItemIcon';

const CELL_SIZE = 48;
const BACKEND_URL = 'http://localhost:3002';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  opacity: number;
}

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
  const [errorItems, setErrorItems] = useState<Map<string, number>>(new Map());
  const [successItems, setSuccessItems] = useState<Map<string, number>>(new Map());
  const [disappearingWalls, setDisappearingWalls] = useState<Set<string>>(new Set());
  const [showVictory, setShowVictory] = useState(false);
  const [newInventoryItems, setNewInventoryItems] = useState<Map<string, number>>(new Map());
  const [prevInventoryIds, setPrevInventoryIds] = useState<Set<string>>(new Set());
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

  const [canvasParticles, setCanvasParticles] = useState<ConfettiParticle[]>([]);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const inventoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSession();
    const newSocket = io(BACKEND_URL);
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (session && player) {
      const room = session.escapeRoom.rooms.find(r => r.id === player.currentRoomId);
      if (room) setCurrentRoom(room);
    }
  }, [session, player]);

  useEffect(() => {
    if (player) {
      const currentIds = new Set(player.inventory.map(i => i.id));
      const now = Date.now();
      const newItems = new Map(newInventoryItems);
      
      for (const id of currentIds) {
        if (!prevInventoryIds.has(id)) {
          newItems.set(id, now);
          setTimeout(() => {
            setNewInventoryItems(prev => {
              const next = new Map(prev);
              const t = next.get(id);
              if (t === now) {
                next.delete(id);
              }
              return next;
            });
          }, 500);
        }
      }
      
      setNewInventoryItems(newItems);
      setPrevInventoryIds(currentIds);
    }
  }, [player?.inventory.map(i => i.id).join(',')]);

  const initCanvasConfetti = () => {
    const colors = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ec4899', '#8b5cf6', '#f43f5e', '#14b8a6'];
    const particles: ConfettiParticle[] = [];
    
    for (let i = 0; i < 150; i++) {
      particles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 200,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 8,
        speedX: (Math.random() - 0.5) * 6,
        speedY: 2 + Math.random() * 6,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        gravity: 0.12 + Math.random() * 0.08,
        opacity: 1
      });
    }
    
    setCanvasParticles(particles);
  };

  useEffect(() => {
    if (!showVictory || canvasParticles.length === 0) return;

    const animate = () => {
      setCanvasParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.speedX,
          y: p.y + p.speedY,
          speedY: p.speedY + p.gravity,
          rotation: p.rotation + p.rotationSpeed,
          opacity: p.y > window.innerHeight - 100 ? p.opacity - 0.02 : p.opacity
        })).filter(p => p.opacity > 0 && p.y < window.innerHeight + 50);
        return updated;
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [showVictory, canvasParticles.length > 0]);

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
        
        const newSocket = io(BACKEND_URL);
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
    initCanvasConfetti();
    setShowVictory(true);
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
    const timestamp = Date.now();
    setErrorItems(prev => new Map(prev).set(itemId, timestamp));
    setTimeout(() => {
      setErrorItems(prev => {
        const next = new Map(prev);
        const t = next.get(itemId);
        if (t === timestamp) {
          next.delete(itemId);
        }
        return next;
      });
    }, 320);
  };

  const triggerSuccess = (itemId: string) => {
    const timestamp = Date.now();
    setSuccessItems(prev => new Map(prev).set(itemId, timestamp));
    setTimeout(() => {
      setSuccessItems(prev => {
        const next = new Map(prev);
        const t = next.get(itemId);
        if (t === timestamp) {
          next.delete(itemId);
        }
        return next;
      });
    }, 520);
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
    const now = Date.now();
    
    for (let y = 0; y < currentRoom.height; y++) {
      for (let x = 0; x < currentRoom.width; x++) {
        const key = `${x},${y}`;
        const wall = wallMap.get(key);
        
        if (wall?.visible) {
          const isDisappearing = wall.disappearing;
          elements.push(
            <div
              key={key}
              style={{
                position: 'absolute',
                left: x * CELL_SIZE,
                top: y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: isDisappearing ? 'transparent' : '#475569',
                zIndex: 2
              }}
            >
              {isDisappearing ? (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'visible'
                }}>
                  {Array.from({ length: 9 }).map((_, i) => {
                    const pieceX = (i % 3) * (CELL_SIZE / 3);
                    const pieceY = Math.floor(i / 3) * (CELL_SIZE / 3);
                    const angle = Math.atan2(
                      (pieceY + CELL_SIZE / 6) - CELL_SIZE / 2,
                      (pieceX + CELL_SIZE / 6) - CELL_SIZE / 2
                    ) * 180 / Math.PI;
                    const dist = 80 + Math.random() * 60;
                    return (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          left: pieceX,
                          top: pieceY,
                          width: CELL_SIZE / 3 - 1,
                          height: CELL_SIZE / 3 - 1,
                          backgroundColor: '#475569',
                          animation: 'none',
                          transform: `translate(0, 0) scale(1)`,
                          animationName: isDisappearing ? 'none' : undefined,
                          opacity: 1,
                          transformOrigin: 'center center',
                          willChange: 'transform, opacity',
                          transition: `transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.55s ease-out`
                        }}
                        ref={(el) => {
                          if (el && isDisappearing) {
                            requestAnimationFrame(() => {
                              requestAnimationFrame(() => {
                                el.style.transform = `translate(${Math.cos(angle * Math.PI / 180) * dist}px, ${Math.sin(angle * Math.PI / 180) * dist + 30}px) scale(0.3) rotate(${angle + Math.random() * 180 - 90}deg)`;
                                el.style.opacity = '0';
                              });
                            });
                          }
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
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
              )}
            </div>
          );
        }
      }
    }
    
    return elements;
  };

  const renderItems = () => {
    if (!currentRoom) return null;

    const now = Date.now();

    return currentRoom.items
      .filter(item => !item.collected)
      .map(item => {
        const hasErrorMap = errorItems.has(item.id);
        const errorTime = errorItems.get(item.id);
        const isErrorActive = hasErrorMap && errorTime && (now - errorTime) < 320;
        
        const hasSuccessMap = successItems.has(item.id);
        const successTime = successItems.get(item.id);
        const isSuccessActive = hasSuccessMap && successTime && (now - successTime) < 520;
        
        return (
          <div
            key={item.id}
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
              backgroundColor: isErrorActive 
                ? 'rgba(239, 68, 68, 0.55)' 
                : isSuccessActive 
                  ? 'rgba(34, 197, 94, 0.35)'
                  : item.solved 
                    ? 'rgba(34, 197, 94, 0.2)' 
                    : 'rgba(30, 41, 59, 0.7)',
              border: `2px solid ${
                isErrorActive 
                  ? '#ef4444' 
                  : isSuccessActive 
                    ? '#22c55e'
                    : item.solved 
                      ? '#22c55e' 
                      : item.type === 'door'
                        ? item.doorLocked ? '#ef4444' : '#22c55e'
                        : '#475569'
              }`,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: isSuccessActive 
                ? '0 0 18px rgba(34, 197, 94, 0.7)' 
                : isErrorActive
                  ? '0 0 12px rgba(239, 68, 68, 0.5)'
                  : 'none',
              zIndex: isErrorActive || isSuccessActive ? 20 : 5,
              animation: isErrorActive 
                ? 'errorShake 0.32s cubic-bezier(.36,.07,.19,.97) both' 
                : isSuccessActive
                  ? 'successPulse 0.52s ease-out both'
                  : 'itemDrop 0.45s ease-out both',
              transformOrigin: 'center center',
              willChange: isErrorActive || isSuccessActive ? 'transform, box-shadow' : 'auto'
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
              if (!isErrorActive && !isSuccessActive) {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.zIndex = '15';
              }
            }}
            onMouseLeave={(e) => {
              if (!isErrorActive && !isSuccessActive) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.zIndex = '5';
              }
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

    const now = Date.now();

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
          backgroundColor: 'rgba(30, 41, 59, 0.92)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid #334155',
          zIndex: 100,
          minWidth: '300px',
          minHeight: '70px',
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.35)'
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
          player.inventory.map((item, index) => {
            const addedTime = newInventoryItems.get(item.id);
            const isNew = addedTime && (now - addedTime) < 500;
            
            return (
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
                  border: isNew ? '2px solid #f97316' : '1px solid #475569',
                  cursor: 'grab',
                  animation: isNew 
                    ? 'inventoryScaleIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) both' 
                    : 'none',
                  boxShadow: isNew ? '0 0 12px rgba(249, 115, 22, 0.5)' : 'none',
                  transition: 'all 0.2s',
                  transformOrigin: 'center bottom',
                  animationDelay: isNew ? '0s' : `${index * 0.03}s`
                }}
                onMouseDown={(e) => handleInventoryItemDragStart(e, item)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                  e.currentTarget.style.borderColor = '#f97316';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.borderColor = isNew ? '#f97316' : '#475569';
                }}
                title={item.name}
              >
                <ItemIcon type={item.type} size={28} />
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderVictoryModal = () => {
    if (!showVictory) return null;

    return (
      <>
        <canvas
          ref={canvasRef}
          width={window.innerWidth}
          height={window.innerHeight}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1999,
            pointerEvents: 'none'
          }}
        />
        {canvasParticles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'fixed',
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              transform: `rotate(${p.rotation}deg)`,
              borderRadius: p.id % 3 === 0 ? '50%' : p.id % 3 === 1 ? '2px' : '1px',
              opacity: p.opacity,
              zIndex: 2001,
              pointerEvents: 'none',
              willChange: 'transform, opacity'
            }}
          />
        ))}
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(5px)',
          animation: 'fadeIn 0.35s ease-out'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '20px',
            padding: '48px 56px',
            textAlign: 'center',
            border: '2px solid #f97316',
            boxShadow: '0 0 60px rgba(249, 115, 22, 0.35), inset 0 0 40px rgba(249, 115, 22, 0.08)',
            animation: 'victoryPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
          }}>
            <div style={{ 
              fontSize: '72px', 
              marginBottom: '16px',
              animation: 'bounce 1s ease-in-out infinite'
            }}>🎉</div>
            <h2 style={{ 
              color: '#f97316', 
              fontSize: '36px', 
              marginBottom: '8px',
              fontWeight: 'bold',
              textShadow: '0 0 20px rgba(249, 115, 22, 0.4)'
            }}>
              恭喜通关！
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '28px' }}>
              你成功逃出了所有密室
            </p>
            
            {stats && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '18px',
                marginBottom: '32px'
              }}>
                <div style={{
                  padding: '18px 20px',
                  backgroundColor: '#0f172a',
                  borderRadius: '10px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>总用时</div>
                  <div style={{ color: '#f97316', fontSize: '26px', fontWeight: 'bold' }}>
                    {Math.floor(stats.totalTime / 1000)}秒
                  </div>
                </div>
                <div style={{
                  padding: '18px 20px',
                  backgroundColor: '#0f172a',
                  borderRadius: '10px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>成功率</div>
                  <div style={{ color: '#22c55e', fontSize: '26px', fontWeight: 'bold' }}>
                    {stats.successRate.toFixed(0)}%
                  </div>
                </div>
                <div style={{
                  padding: '18px 20px',
                  backgroundColor: '#0f172a',
                  borderRadius: '10px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>解谜数量</div>
                  <div style={{ color: '#f1f5f9', fontSize: '26px', fontWeight: 'bold' }}>
                    {stats.solvedPuzzles}/{stats.totalPuzzles}
                  </div>
                </div>
                <div style={{
                  padding: '18px 20px',
                  backgroundColor: '#0f172a',
                  borderRadius: '10px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>评价</div>
                  <div style={{ color: '#eab308', fontSize: '26px', fontWeight: 'bold', letterSpacing: '4px' }}>
                    {stats.successRate >= 80 ? '⭐⭐⭐' : stats.successRate >= 50 ? '⭐⭐' : '⭐'}
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '14px 48px',
                backgroundColor: '#f97316',
                color: 'white',
                borderRadius: '10px',
                fontSize: '17px',
                fontWeight: 'bold',
                boxShadow: '0 4px 20px rgba(249, 115, 22, 0.4)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fb923c';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(249, 115, 22, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f97316';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(249, 115, 22, 0.4)';
              }}
            >
              🏠 返回首页
            </button>
          </div>
        </div>
      </>
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
          backgroundColor: 'rgba(30, 41, 59, 0.92)',
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
            backgroundColor: 'rgba(30, 41, 59, 0.92)',
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
            backgroundColor: 'rgba(30, 41, 59, 0.92)',
            backdropFilter: 'blur(8px)',
            borderRadius: '8px',
            border: '1px solid #334155',
            color: '#94a3b8',
            fontSize: '13px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ef4444';
            e.currentTarget.style.color = '#fca5a5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#334155';
            e.currentTarget.style.color = '#94a3b8';
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
          cursor: isDragging && !draggedItem ? 'grabbing' : 'grab',
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
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.08s ease-out'
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
            backgroundColor: 'rgba(30, 41, 59, 0.85)',
            borderRadius: '8px',
            border: '2px solid #f97316',
            pointerEvents: 'none',
            zIndex: 1000,
            opacity: 0.9,
            boxShadow: '0 4px 20px rgba(249, 115, 22, 0.4)',
            transform: 'rotate(5deg) scale(1.1)'
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
