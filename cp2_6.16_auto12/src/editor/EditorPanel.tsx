import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasRenderer, EditorEnemy } from './CanvasRenderer';
import { sendLevelData, setPlayableCallback } from '../engine/GameEngine';
import type { EnemyType, BulletPatternType, LevelData, Position, PlayableStatus } from '../types';
import { ENEMY_CONFIGS, BULLET_PATTERN_PRESETS } from '../types';

interface EditorPanelProps {
  onPlay: () => void;
}

interface HistoryState {
  enemies: EditorEnemy[];
  selectedId: string | null;
}

const generateId = () => `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createDefaultPath = (startX: number, startY: number) => ({
  controlPoints: [
    { x: startX, y: startY },
    { x: startX + 100, y: startY },
    { x: startX + 200, y: startY + 50 }
  ] as [Position, Position, Position],
  duration: 3
});

const createDefaultBulletPattern = (type: BulletPatternType) => ({
  type,
  ...BULLET_PATTERN_PRESETS[type]
});

export const EditorPanel: React.FC<EditorPanelProps> = ({ onPlay }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentTimeRef = useRef<number>(0);
  const timelineTimeRef = useRef<number>(0);
  const isPlayingTimelineRef = useRef<boolean>(false);

  const [enemies, setEnemies] = useState<EditorEnemy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [draggedTemplate, setDraggedTemplate] = useState<EnemyType | null>(null);
  const [dragOffset, setDragOffset] = useState<Position | null>(null);
  const [isDraggingEnemy, setIsDraggingEnemy] = useState(false);
  const [isDraggingControl, setIsDraggingControl] = useState<number | null>(null);
  const [engineStatus, setEngineStatus] = useState<PlayableStatus>('ready');
  const [timelineTime, setTimelineTime] = useState<number>(0);

  useEffect(() => {
    setPlayableCallback((status) => {
      setEngineStatus(status);
    });
  }, []);

  const saveHistory = useCallback((newEnemies: EditorEnemy[], newSelectedId: string | null) => {
    const newState: HistoryState = {
      enemies: JSON.parse(JSON.stringify(newEnemies)),
      selectedId: newSelectedId
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    if (newHistory.length > 100) {
      newHistory.shift();
    }
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      const animatingEnemies = enemies.map(enemy => {
        const prevEnemy = prevState.enemies.find(e => e.id === enemy.id);
        if (prevEnemy) {
          return {
            ...enemy,
            isAnimating: true,
            animationProgress: 0,
            animationStartPos: { ...enemy.initialPosition },
            animationEndPos: { ...prevEnemy.initialPosition }
          };
        }
        return enemy;
      });
      setEnemies(animatingEnemies);
      setSelectedId(prevState.selectedId);
      setHistoryIndex(historyIndex - 1);

      const startTime = Date.now();
      const animate = () => {
        const elapsed = (Date.now() - startTime) / 200;
        const progress = Math.min(1, elapsed);
        setEnemies(prev => prev.map(e => ({
          ...e,
          animationProgress: progress,
          ...(progress >= 1 ? { isAnimating: false, animationProgress: 0 } : {})
        })));
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setEnemies(prevState.enemies.map(e => ({ ...e, isSelected: e.id === prevState.selectedId })));
        }
      };
      requestAnimationFrame(animate);
    }
  }, [history, historyIndex, enemies]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      const animatingEnemies = enemies.map(enemy => {
        const nextEnemy = nextState.enemies.find(e => e.id === enemy.id);
        if (nextEnemy) {
          return {
            ...enemy,
            isAnimating: true,
            animationProgress: 0,
            animationStartPos: { ...enemy.initialPosition },
            animationEndPos: { ...nextEnemy.initialPosition }
          };
        }
        return enemy;
      });
      setEnemies(animatingEnemies);
      setSelectedId(nextState.selectedId);
      setHistoryIndex(historyIndex + 1);

      const startTime = Date.now();
      const animate = () => {
        const elapsed = (Date.now() - startTime) / 200;
        const progress = Math.min(1, elapsed);
        setEnemies(prev => prev.map(e => ({
          ...e,
          animationProgress: progress,
          ...(progress >= 1 ? { isAnimating: false, animationProgress: 0 } : {})
        })));
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setEnemies(nextState.enemies.map(e => ({ ...e, isSelected: e.id === nextState.selectedId })));
        }
      };
      requestAnimationFrame(animate);
    }
  }, [history, historyIndex, enemies]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' && selectedId) {
        e.preventDefault();
        const newEnemies = enemies.filter(e => e.id !== selectedId);
        setEnemies(newEnemies);
        saveHistory(newEnemies, null);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedId, enemies, saveHistory]);

  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current);
    }

    const renderLoop = () => {
      if (rendererRef.current) {
        if (isPlayingTimelineRef.current) {
          timelineTimeRef.current += 1 / 60;
          const maxTime = Math.max(...enemies.map(e => e.spawnTime + e.path.duration), 10);
          if (timelineTimeRef.current > maxTime) {
            timelineTimeRef.current = 0;
          }
          setTimelineTime(timelineTimeRef.current);
        }
        rendererRef.current.render(enemies, timelineTimeRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };
    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enemies]);

  const handleDragStart = (e: React.DragEvent, type: EnemyType) => {
    e.dataTransfer.setData('enemyType', type);
    setDraggedTemplate(type);
  };

  const handleDragEnd = () => {
    setDraggedTemplate(null);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedTemplate || !rendererRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const config = ENEMY_CONFIGS[draggedTemplate];
    const newEnemy: EditorEnemy = {
      id: generateId(),
      type: draggedTemplate,
      spawnTime: Math.max(0, timelineTimeRef.current),
      initialPosition: { x, y },
      path: createDefaultPath(x, y),
      bulletPattern: createDefaultBulletPattern('aimed'),
      health: config.health,
      isSelected: true
    };

    const newEnemies = [...enemies.map(e => ({ ...e, isSelected: false })), newEnemy];
    setEnemies(newEnemies);
    saveHistory(newEnemies, newEnemy.id);
    setSelectedId(newEnemy.id);
    setDraggedTemplate(null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;

    const pos = rendererRef.current.getMousePos(e);
    const hitEnemy = rendererRef.current.hitTest(pos, enemies);

    if (hitEnemy) {
      const hitControl = rendererRef.current.hitPathControl(pos, hitEnemy);
      if (hitControl !== null) {
        setIsDraggingControl(hitControl);
      } else {
        setIsDraggingEnemy(true);
        setDragOffset({
          x: pos.x - hitEnemy.initialPosition.x,
          y: pos.y - hitEnemy.initialPosition.y
        });
      }
      const newEnemies = enemies.map(enemy => ({
        ...enemy,
        isSelected: enemy.id === hitEnemy.id
      }));
      setEnemies(newEnemies);
      setSelectedId(hitEnemy.id);
    } else {
      const newEnemies = enemies.map(enemy => ({ ...enemy, isSelected: false }));
      setEnemies(newEnemies);
      setSelectedId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;

    const pos = rendererRef.current.getMousePos(e);

    if (isDraggingEnemy && selectedId && dragOffset) {
      const newPos = {
        x: pos.x - dragOffset.x,
        y: pos.y - dragOffset.y
      };
      const newEnemies = enemies.map(enemy => {
        if (enemy.id === selectedId) {
          return {
            ...enemy,
            initialPosition: newPos,
            path: {
              ...enemy.path,
              controlPoints: [
                newPos,
                { x: enemy.path.controlPoints[1].x + (newPos.x - enemy.initialPosition.x), y: enemy.path.controlPoints[1].y + (newPos.y - enemy.initialPosition.y) },
                { x: enemy.path.controlPoints[2].x + (newPos.x - enemy.initialPosition.x), y: enemy.path.controlPoints[2].y + (newPos.y - enemy.initialPosition.y) }
              ] as [Position, Position, Position]
            }
          };
        }
        return enemy;
      });
      setEnemies(newEnemies);
    }

    if (isDraggingControl !== null && selectedId) {
      const newEnemies = enemies.map(enemy => {
        if (enemy.id === selectedId) {
          const newControlPoints = [...enemy.path.controlPoints] as [Position, Position, Position];
          newControlPoints[isDraggingControl] = pos;
          return {
            ...enemy,
            path: {
              ...enemy.path,
              controlPoints: newControlPoints
            }
          };
        }
        return enemy;
      });
      setEnemies(newEnemies);
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingEnemy || isDraggingControl !== null) {
      saveHistory(enemies, selectedId);
    }
    setIsDraggingEnemy(false);
    setIsDraggingControl(null);
    setDragOffset(null);
  };

  const handleExport = () => {
    const levelData: LevelData = {
      id: generateId(),
      name: 'Custom Level',
      duration: Math.max(...enemies.map(e => e.spawnTime + e.path.duration), 10),
      enemies: enemies.map(({ isSelected, isAnimating, animationProgress, animationStartPos, animationEndPos, ...enemy }) => enemy)
    };

    const dataStr = JSON.stringify(levelData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `level_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePlay = () => {
    const levelData: LevelData = {
      id: generateId(),
      name: 'Custom Level',
      duration: Math.max(...enemies.map(e => e.spawnTime + e.path.duration), 10),
      enemies: enemies.map(({ isSelected, isAnimating, animationProgress, animationStartPos, animationEndPos, ...enemy }) => enemy)
    };
    sendLevelData(levelData);
    onPlay();
  };

  const updateEnemyProperty = (id: string, updates: Partial<EditorEnemy>) => {
    const newEnemies = enemies.map(enemy =>
      enemy.id === id ? { ...enemy, ...updates } : enemy
    );
    setEnemies(newEnemies);
    saveHistory(newEnemies, id);
  };

  const selectedEnemy = enemies.find(e => e.id === selectedId);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const maxTime = Math.max(...enemies.map(e => e.spawnTime + e.path.duration), 10);
    const newTime = (x / rect.width) * maxTime;
    timelineTimeRef.current = newTime;
    setTimelineTime(newTime);
  };

  const toggleTimelinePlay = () => {
    isPlayingTimelineRef.current = !isPlayingTimelineRef.current;
  };

  const enemyTemplates: { type: EnemyType; name: string; desc: string }[] = [
    { type: 'normal', name: '普通敌机', desc: '40x30px 浅蓝方块' },
    { type: 'elite', name: '精英敌机', desc: '50x40px 橙红带盾牌' },
    { type: 'boss', name: 'Boss', desc: '80x60px 深紫带脉冲' }
  ];

  const bulletPatterns: { type: BulletPatternType; name: string }[] = [
    { type: 'aimed', name: '自机狙' },
    { type: 'fan', name: '扇形弹' },
    { type: 'spiral', name: '螺旋弹' }
  ];

  const maxTimelineTime = Math.max(...enemies.map(e => e.spawnTime + e.path.duration), 10);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#1e1e1e', overflow: 'hidden' }}>
      <div style={{
        width: '300px',
        background: '#2d2d2d',
        borderRadius: '8px',
        padding: '14px',
        margin: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        overflowY: 'auto'
      }}>
        <h2 style={{ color: '#fff', fontSize: '18px', margin: 0, marginBottom: '8px' }}>敌人模板库</h2>

        {enemyTemplates.map(template => (
          <div
            key={template.type}
            draggable
            onDragStart={(e) => handleDragStart(e, template.type)}
            onDragEnd={handleDragEnd}
            style={{
              background: '#3d3d3d',
              borderRadius: '6px',
              padding: '12px',
              cursor: 'grab',
              transition: 'transform 0.2s, background 0.2s, opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              opacity: draggedTemplate === template.type ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#4d4d4d';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#3d3d3d';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{
              width: ENEMY_CONFIGS[template.type].width * 0.6,
              height: ENEMY_CONFIGS[template.type].height * 0.6,
              background: ENEMY_CONFIGS[template.type].color,
              borderRadius: '2px',
              flexShrink: 0
            }} />
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{template.name}</div>
              <div style={{ color: '#888', fontSize: '11px' }}>{template.desc}</div>
            </div>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #444', paddingTop: '16px', marginTop: '8px' }}>
          <h3 style={{ color: '#fff', fontSize: '16px', margin: 0, marginBottom: '12px' }}>编辑操作</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#3d3d3d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#4d4d4d'; }}
              onMouseLeave={(e) => e.currentTarget.style.background = '#3d3d3d'}
            >
              撤销 (Ctrl+Z)
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#3d3d3d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#4d4d4d'; }}
              onMouseLeave={(e) => e.currentTarget.style.background = '#3d3d3d'}
            >
              重做 (Ctrl+Shift+Z)
            </button>
          </div>
          <button
            onClick={handleExport}
            style={{
              width: '100%',
              padding: '10px',
              background: '#4caf50',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#45a049'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#4caf50'}
          >
            导出 JSON
          </button>
          <button
            onClick={handlePlay}
            disabled={enemies.length === 0}
            style={{
              width: '100%',
              padding: '10px',
              background: '#2196f3',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#1976d2'; }}
            onMouseLeave={(e) => e.currentTarget.style.background = '#2196f3'}
          >
            ▶ 运行测试
          </button>
        </div>

        {selectedEnemy && (
          <div style={{ borderTop: '1px solid #444', paddingTop: '16px' }}>
            <h3 style={{ color: '#fff', fontSize: '16px', margin: 0, marginBottom: '12px' }}>敌人属性</h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                出现时间 (秒)
              </label>
              <input
                type="number"
                value={selectedEnemy.spawnTime}
                onChange={(e) => updateEnemyProperty(selectedEnemy.id, { spawnTime: Math.max(0, parseFloat(e.target.value) || 0) })}
                step="0.5"
                min="0"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: '#1e1e1e',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                路径时长 (秒)
              </label>
              <input
                type="number"
                value={selectedEnemy.path.duration}
                onChange={(e) => updateEnemyProperty(selectedEnemy.id, {
                  path: { ...selectedEnemy.path, duration: Math.max(1, parseFloat(e.target.value) || 1) }
                })}
                step="0.5"
                min="1"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: '#1e1e1e',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                弹幕模板
              </label>
              <select
                value={selectedEnemy.bulletPattern.type}
                onChange={(e) => updateEnemyProperty(selectedEnemy.id, {
                  bulletPattern: createDefaultBulletPattern(e.target.value as BulletPatternType)
                })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: '#1e1e1e',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                {bulletPatterns.map(p => (
                  <option key={p.type} value={p.type}>{p.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                射速 (发/秒)
              </label>
              <input
                type="number"
                value={selectedEnemy.bulletPattern.fireRate}
                onChange={(e) => updateEnemyProperty(selectedEnemy.id, {
                  bulletPattern: { ...selectedEnemy.bulletPattern, fireRate: Math.max(0.5, parseFloat(e.target.value) || 1) }
                })}
                step="0.5"
                min="0.5"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: '#1e1e1e',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>

            <button
              onClick={() => {
                const newEnemies = enemies.filter(e => e.id !== selectedEnemy.id);
                setEnemies(newEnemies);
                saveHistory(newEnemies, null);
                setSelectedId(null);
              }}
              style={{
                width: '100%',
                padding: '8px',
                background: '#f44336',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#d32f2f'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f44336'}
            >
              删除敌人 (Delete)
            </button>
          </div>
        )}

        <div style={{ borderTop: '1px solid #444', paddingTop: '16px', marginTop: 'auto' }}>
          <div style={{ color: '#666', fontSize: '11px', lineHeight: '1.5' }}>
            <div>• 拖拽敌人到画布放置</div>
            <div>• 点击选中敌人，拖拽控制点调整路径</div>
            <div>• Ctrl+Z 撤销，Ctrl+Shift+Z 重做</div>
            <div>• WASD 移动，空格射击</div>
            <div>• P 暂停，R 重开，ESC 返回</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 10px 10px 0', gap: '10px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <canvas
            ref={canvasRef}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{
              border: '1px solid #444443',
              borderRadius: '4px',
              cursor: isDraggingEnemy || isDraggingControl !== null ? 'grabbing' : 'crosshair'
            }}
          />
        </div>

        <div style={{
          height: '120px',
          background: '#1e1e1e',
          borderRadius: '6px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '12px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            <button
              onClick={toggleTimelinePlay}
              style={{
                padding: '4px 12px',
                background: '#3d3d3d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {isPlayingTimelineRef.current ? '⏸ 暂停' : '▶ 播放'}
            </button>
            <span style={{ color: '#888', fontSize: '12px' }}>
              时间: {timelineTime.toFixed(1)}s
            </span>
          </div>

          <div
            onClick={handleTimelineClick}
            style={{
              position: 'absolute',
              top: '40px',
              left: '12px',
              right: '12px',
              height: '60px',
              background: '#252525',
              borderRadius: '4px',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
          >
            {Array.from({ length: Math.floor(maxTimelineTime * 2) + 1 }).map((_, i) => {
              const time = i * 0.5;
              const x = (time / maxTimelineTime) * 100;
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: 0,
                  bottom: 0,
                  borderLeft: '1px solid rgba(79, 195, 247, 0.2)',
                  fontSize: '10px',
                  color: '#666',
                  paddingLeft: '2px'
                }}>
                  {i % 2 === 0 && time.toFixed(0)}
                </div>
              );
            })}

            {enemies.map(enemy => {
              const startX = (enemy.spawnTime / maxTimelineTime) * 100;
              const width = (enemy.path.duration / maxTimelineTime) * 100;
              const row = enemies.filter(e => e.spawnTime < enemy.spawnTime).length % 3;
              return (
                <div
                  key={enemy.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newEnemies = enemies.map(e => ({ ...e, isSelected: e.id === enemy.id }));
                    setEnemies(newEnemies);
                    setSelectedId(enemy.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${startX}%`,
                    top: `${8 + row * 18}px`,
                    width: `${width}%`,
                    height: '14px',
                    background: ENEMY_CONFIGS[enemy.type].color,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    border: enemy.isSelected ? '2px solid #4fc3f7' : 'none',
                    opacity: 0.8,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                />
              );
            })}

            <div style={{
              position: 'absolute',
              left: `${(timelineTime / maxTimelineTime) * 100}%`,
              top: 0,
              bottom: 0,
              width: '2px',
              background: '#4fc3f7',
              pointerEvents: 'none'
            }} />
          </div>
        </div>
      </div>
    </div>
  );
};
