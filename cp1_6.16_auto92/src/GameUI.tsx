import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  GameState,
  Node,
  ToolType,
  AIAgent,
  createInitialState,
  processPlayerMove,
  processToolUse,
  updateGameState,
  activateStealth,
  PathChecker,
  AIPatrolPlanner
} from './GameEngine';

const NODE_COLORS: Record<string, string> = {
  terminal: '#00FF88',
  firewall: '#FF4444',
  target: '#FFD700',
  encrypted: '#4488FF',
  exit: '#9B59B6'
};

const TOOL_ICONS: Record<ToolType, string> = {
  virus: '🦠',
  scanner: '🔍',
  cloner: '📋'
};

interface GameUIProps {
  onGameOver?: (score: number) => void;
  onWin?: (score: number, nextRound: number) => void;
}

const GameUI: React.FC<GameUIProps> = ({ onGameOver, onWin }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(1));
  const [message, setMessage] = useState<string>('');
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);
  const [spacePressStart, setSpacePressStart] = useState<number | null>(null);
  const [showSpaceHold, setShowSpaceHold] = useState(false);
  
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const animationTimeRef = useRef<number>(0);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  }, []);

  const getAlertColor = (alertLevel: number): string => {
    if (alertLevel < 30) return '#00FF88';
    if (alertLevel < 70) return '#FFD700';
    return '#FF4444';
  };

  const getNodePosition = useCallback((node: Node, canvasWidth: number, canvasHeight: number) => {
    const scaleX = (canvasWidth - 100) / 700;
    const scaleY = (canvasHeight - 150) / 500;
    return {
      x: 50 + node.x * scaleX,
      y: 80 + node.y * scaleY
    };
  }, []);

  const drawConnections = useCallback((
    ctx: CanvasRenderingContext2D,
    nodes: Node[],
    canvasWidth: number,
    canvasHeight: number,
    playerNodeId: number,
    pathChecker: PathChecker
  ) => {
    const neighbors = pathChecker.getNeighbors(playerNodeId);
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const pos1 = getNodePosition(node, canvasWidth, canvasHeight);
      
      for (const targetId of node.connections) {
        if (targetId > node.id) {
          const targetNode = nodes.find(n => n.id === targetId);
          if (!targetNode) continue;
          
          const pos2 = getNodePosition(targetNode, canvasWidth, canvasHeight);
          
          const isHighlighted = 
            (node.id === playerNodeId && neighbors.includes(targetId)) ||
            (targetId === playerNodeId && neighbors.includes(node.id));
          
          ctx.beginPath();
          ctx.moveTo(pos1.x, pos1.y);
          ctx.lineTo(pos2.x, pos2.y);
          
          if (isHighlighted) {
            ctx.strokeStyle = '#00DCFF';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00DCFF';
          } else {
            ctx.strokeStyle = '#333355';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 0;
          }
          
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    }
  }, [getNodePosition]);

  const drawNode = useCallback((
    ctx: CanvasRenderingContext2D,
    node: Node,
    canvasWidth: number,
    canvasHeight: number,
    isPlayer: boolean,
    isHovered: boolean,
    pulsePhase: number,
    illegalFlash: boolean
  ) => {
    const pos = getNodePosition(node, canvasWidth, canvasHeight);
    const baseRadius = 20;
    const pulseScale = isPlayer ? 1 + Math.sin(pulsePhase) * 0.15 : 1;
    const radius = baseRadius * pulseScale;

    if (illegalFlash && isHovered) {
      ctx.fillStyle = '#FF0000';
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (!node.isHacked && node.type === 'firewall') {
      ctx.strokeStyle = NODE_COLORS[node.type];
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 1.5);
    gradient.addColorStop(0, NODE_COLORS[node.type] + '80');
    gradient.addColorStop(1, NODE_COLORS[node.type] + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0A0A1A';
    ctx.strokeStyle = NODE_COLORS[node.type];
    ctx.lineWidth = 2;
    ctx.shadowBlur = isHovered || isPlayer ? 15 : 5;
    ctx.shadowColor = NODE_COLORS[node.type];
    
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = NODE_COLORS[node.type];
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let label = '';
    switch (node.type) {
      case 'terminal': label = 'T'; break;
      case 'firewall': label = node.isHacked ? 'F' : '🔒'; break;
      case 'target': label = '🎯'; break;
      case 'encrypted': label = '🔐'; break;
      case 'exit': label = '🚪'; break;
    }
    ctx.fillText(label, pos.x, pos.y);

    if (isPlayer) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px sans-serif';
      ctx.fillText('👤', pos.x, pos.y - radius - 12);
    }

    if (node.securityLevel > 1) {
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.fillText(`Lv.${node.securityLevel}`, pos.x, pos.y + radius + 12);
    }
  }, [getNodePosition]);

  const drawAIAgents = useCallback((
    ctx: CanvasRenderingContext2D,
    agents: AIAgent[],
    nodes: Node[],
    canvasWidth: number,
    canvasHeight: number,
    scannerActive: boolean,
    hiddenNodes: Set<number>,
    pulsePhase: number,
    isStealthActive: boolean
  ) => {
    const planner = new AIPatrolPlanner(nodes);
    const perceptionRange = isStealthActive ? 1 : 3;

    for (const agent of agents) {
      const node = nodes.find(n => n.id === agent.currentNodeId);
      if (!node) continue;

      const pos = getNodePosition(node, canvasWidth, canvasHeight);
      const nodesInRange = planner.getNodesInScanRange(agent.currentNodeId, perceptionRange);
      
      for (const nodeId of nodesInRange) {
        const rangeNode = nodes.find(n => n.id === nodeId);
        if (rangeNode) {
          const rangePos = getNodePosition(rangeNode, canvasWidth, canvasHeight);
          const dist = Math.sqrt(
            Math.pow(pos.x - rangePos.x, 2) + Math.pow(pos.y - rangePos.y, 2)
          );
          const pulseRadius = dist * (1 + Math.sin(pulsePhase * 2) * 0.1);
          
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 200, 0, ${0.1 + Math.sin(pulsePhase * 2) * 0.05})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      const scanProgress = 1 - agent.scanCooldown / 5000;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 30, -Math.PI / 2, -Math.PI / 2 + scanProgress * Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();

      if (scannerActive || hiddenNodes.has(agent.currentNodeId)) {
        ctx.fillStyle = '#FFC800';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFC800';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#0A0A1A';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🤖', pos.x, pos.y);
      } else {
        ctx.fillStyle = 'rgba(255, 200, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [getNodePosition]);

  const render = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const pulsePhase = time / 500;
    const pathChecker = new PathChecker(gameState.nodes);

    drawConnections(ctx, gameState.nodes, width, height, gameState.playerNodeId, pathChecker);

    for (const node of gameState.nodes) {
      const isPlayer = node.id === gameState.playerNodeId;
      const isHovered = hoveredNode === node.id;
      
      drawNode(
        ctx,
        node,
        width,
        height,
        isPlayer,
        isHovered,
        pulsePhase,
        gameState.illegalPathFlash
      );
    }

    drawAIAgents(
      ctx,
      gameState.aiAgents,
      gameState.nodes,
      width,
      height,
      gameState.scannerActive,
      gameState.hiddenNodes,
      pulsePhase,
      gameState.isStealthActive
    );
  }, [gameState, hoveredNode, drawConnections, drawNode, drawAIAgents]);

  useEffect(() => {
    if (gameState.isGameOver) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      onGameOver?.(gameState.score);
      return;
    }

    if (gameState.isWin) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      onWin?.(gameState.score, gameState.round + 1);
      return;
    }

    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      animationTimeRef.current = currentTime;

      setGameState(prev => updateGameState(prev, deltaTime, currentTime));
      render(currentTime);

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.isGameOver, gameState.isWin, render, onGameOver, onWin]);

  const handleNodeClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;

    for (const node of gameState.nodes) {
      const pos = getNodePosition(node, width, height);
      const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));

      if (dist <= 25) {
        if (selectedTool && node.id === gameState.playerNodeId) {
          const result = processToolUse(gameState, selectedTool, performance.now());
          setGameState(result.state);
          showMessage(result.result.message);
          setSelectedTool(null);
        } else if (node.id !== gameState.playerNodeId) {
          const result = processPlayerMove(gameState, node.id, performance.now());
          setGameState(result.state);
          if (!result.result.success) {
            showMessage(result.result.message);
          }
        }
        break;
      }
    }
  }, [gameState, selectedTool, getNodePosition, showMessage]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;

    let foundNode: number | null = null;
    for (const node of gameState.nodes) {
      const pos = getNodePosition(node, width, height);
      const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));

      if (dist <= 25) {
        foundNode = node.id;
        break;
      }
    }
    setHoveredNode(foundNode);
  }, [gameState.nodes, getNodePosition]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && !e.repeat) {
      if (gameState.stealthCooldown === 0 && !gameState.isStealthActive) {
        setSpacePressStart(performance.now());
        setShowSpaceHold(true);
      }
    }
  }, [gameState.stealthCooldown, gameState.isStealthActive]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setShowSpaceHold(false);
      if (spacePressStart) {
        const holdDuration = performance.now() - spacePressStart;
        if (holdDuration >= 500) {
          setGameState(prev => activateStealth(prev, performance.now()));
          showMessage('潜伏模式激活！');
        }
        setSpacePressStart(null);
      }
    }
  }, [spacePressStart, showMessage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const handleToolClick = useCallback((toolType: ToolType) => {
    const tool = gameState.tools.find(t => t.type === toolType);
    if (tool && tool.cooldown > 0) {
      showMessage(`冷却中: ${(tool.cooldown / 1000).toFixed(1)}s`);
      return;
    }

    if (selectedTool === toolType) {
      setSelectedTool(null);
    } else {
      setSelectedTool(toolType);
      
      if (toolType === 'scanner') {
        const result = processToolUse(gameState, toolType, performance.now());
        setGameState(result.state);
        showMessage(result.result.message);
        setSelectedTool(null);
      }
    }
  }, [gameState, selectedTool, showMessage]);

  const handleRestart = useCallback(() => {
    setGameState(createInitialState(1));
    setMessage('');
    setSelectedTool(null);
    lastTimeRef.current = performance.now();
  }, []);

  const handleNextRound = useCallback(() => {
    const newState = createInitialState(gameState.round + 1);
    newState.score = gameState.score;
    setGameState(newState);
    setMessage('');
    setSelectedTool(null);
    lastTimeRef.current = performance.now();
  }, [gameState.round, gameState.score]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const gameContainer = canvas.parentElement;
        if (gameContainer) {
          canvas.width = Math.max(1024, gameContainer.clientWidth - 250);
          canvas.height = Math.max(768, gameContainer.clientHeight - 100);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={styles.gameContainer}>
      <div style={styles.topBar}>
        <div style={styles.alertContainer}>
          <span style={styles.alertLabel}>警报</span>
          <div style={styles.alertBar}>
            <div
              style={{
                ...styles.alertFill,
                width: `${gameState.alertLevel}%`,
                backgroundColor: getAlertColor(gameState.alertLevel),
                boxShadow: `0 0 10px ${getAlertColor(gameState.alertLevel)}`
              }}
            />
            <span style={styles.alertText}>{gameState.alertLevel}/100</span>
          </div>
        </div>
        <div style={styles.scoreContainer}>
          <span style={styles.scoreLabel}>得分</span>
          <span style={styles.scoreValue}>{gameState.score}</span>
        </div>
        <div style={styles.roundContainer}>
          <span style={styles.roundLabel}>第</span>
          <span style={styles.roundValue}>{gameState.round}</span>
          <span style={styles.roundLabel}>轮</span>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.leftPanel}>
          <div style={styles.panelTitle}>工具冷却</div>
          {gameState.tools.map(tool => {
            const cooldownPercent = tool.cooldown / tool.maxCooldown;
            const isReady = cooldownPercent === 0;
            return (
              <div key={tool.type} style={styles.toolCooldownItem}>
                <div style={styles.toolCooldownLabel}>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>{TOOL_ICONS[tool.type]}</span>
                  <span style={{ color: isReady ? '#00FF88' : '#888' }}>{tool.name}</span>
                </div>
                <div style={styles.cooldownArcContainer}>
                  <svg width="50" height="50" viewBox="0 0 50 50">
                    <circle
                      cx="25"
                      cy="25"
                      r="20"
                      fill="none"
                      stroke="#333"
                      strokeWidth="4"
                    />
                    <circle
                      cx="25"
                      cy="25"
                      r="20"
                      fill="none"
                      stroke={isReady ? '#00FF88' : '#555'}
                      strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * cooldownPercent}`}
                      strokeLinecap="round"
                      transform="rotate(-90 25 25)"
                      style={{ transition: 'stroke 0.2s' }}
                    />
                    <text
                      x="25"
                      y="28"
                      textAnchor="middle"
                      fill={isReady ? '#00FF88' : '#888'}
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {isReady ? 'OK' : `${cooldownPercent * 5 | 0}.${((cooldownPercent * 50) % 10) | 0}`}
                    </text>
                  </svg>
                </div>
              </div>
            );
          })}
          
          <div style={{ ...styles.panelTitle, marginTop: '20px' }}>潜伏模式</div>
          <div style={styles.stealthStatus}>
            <div style={{
              ...styles.stealthIndicator,
              backgroundColor: gameState.isStealthActive ? '#00DCFF' : gameState.stealthCooldown > 0 ? '#555' : '#00FF88',
              boxShadow: gameState.isStealthActive ? '0 0 15px #00DCFF' : 'none'
            }} />
            <span style={{ color: gameState.isStealthActive ? '#00DCFF' : gameState.stealthCooldown > 0 ? '#888' : '#00FF88' }}>
              {gameState.isStealthActive ? '激活中' : gameState.stealthCooldown > 0 ? `冷却 ${(gameState.stealthCooldown / 1000).toFixed(1)}s` : '就绪'}
            </span>
          </div>
          <div style={styles.stealthHint}>
            长按空格 0.5s 激活
            <br />
            持续 3s，冷却 15s
          </div>
        </div>

        <div style={styles.canvasContainer}>
          <canvas
            ref={canvasRef}
            style={styles.canvas}
            onClick={handleNodeClick}
            onMouseMove={handleMouseMove}
          />
          
          {message && (
            <div style={styles.messageOverlay}>
              {message}
            </div>
          )}

          {showSpaceHold && (
            <div style={styles.spaceHoldOverlay}>
              <div style={styles.spaceHoldProgress}>
                <div style={styles.spaceHoldText}>按住空格激活潜伏</div>
              </div>
            </div>
          )}

          {gameState.isEscapeMode && !gameState.isGameOver && !gameState.isWin && (
            <div style={styles.escapeOverlay}>
              <div
                style={{
                  ...styles.escapeTimer,
                  animation: 'pulse 0.5s ease-in-out infinite alternate'
                }}
              >
                {Math.ceil(gameState.escapeTimeLeft / 1000)}
              </div>
              <div style={styles.escapeHint}>快逃到紫色出口节点！</div>
            </div>
          )}

          {gameState.isGameOver && (
            <div style={styles.gameOverOverlay}>
              <div style={styles.gameOverTitle}>游戏结束</div>
              <div style={styles.gameOverScore}>最终得分: {gameState.score}</div>
              <button style={styles.restartButton} onClick={handleRestart}>
                重新开始
              </button>
            </div>
          )}

          {gameState.isWin && (
            <div style={styles.winOverlay}>
              <div style={styles.winTitle}>逃离成功！</div>
              <div style={styles.winScore}>当前得分: {gameState.score}</div>
              <button style={styles.nextRoundButton} onClick={handleNextRound}>
                下一轮
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.panelTitle}>工具选择</div>
        <div style={styles.toolsContainer}>
          {gameState.tools.map(tool => {
            const isSelected = selectedTool === tool.type;
            const isReady = tool.cooldown === 0;
            return (
              <div
                key={tool.type}
                style={{
                  ...styles.toolButton,
                  borderColor: isSelected ? '#00DCFF' : NODE_COLORS[tool.type === 'virus' ? 'firewall' : tool.type === 'scanner' ? 'terminal' : 'target'],
                  boxShadow: isSelected 
                    ? `0 0 20px ${NODE_COLORS[tool.type === 'virus' ? 'firewall' : tool.type === 'scanner' ? 'terminal' : 'target']}, inset 0 0 10px ${NODE_COLORS[tool.type === 'virus' ? 'firewall' : tool.type === 'scanner' ? 'terminal' : 'target']}40`
                    : 'none',
                  opacity: isReady ? 1 : 0.5,
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  animation: isSelected ? 'glow 0.3s ease-in-out' : 'none'
                }}
                onClick={() => handleToolClick(tool.type)}
              >
                <span style={styles.toolIcon}>{TOOL_ICONS[tool.type]}</span>
                <span style={styles.toolName}>{tool.name}</span>
              </div>
            );
          })}
        </div>

        <div style={styles.panelTitle}>当前节点</div>
        <div style={styles.nodeInfo}>
          {(() => {
            const currentNode = gameState.nodes.find(n => n.id === gameState.playerNodeId);
            if (!currentNode) return null;
            return (
              <>
                <div style={{ color: NODE_COLORS[currentNode.type] }}>
                  类型: {currentNode.type === 'terminal' ? '终端' : 
                        currentNode.type === 'firewall' ? '防火墙' :
                        currentNode.type === 'target' ? '目标' :
                        currentNode.type === 'encrypted' ? '加密' : '出口'}
                </div>
                <div>安全等级: {currentNode.securityLevel}</div>
                <div>已破解: {currentNode.isHacked ? '是' : '否'}</div>
                <div>连接数: {currentNode.connections.length}</div>
              </>
            );
          })()}
        </div>

        {gameState.clonerProgress > 0 && (
          <div style={styles.clonerProgress}>
            <div style={styles.panelTitle}>数据克隆</div>
            <div style={styles.clonerBars}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    ...styles.clonerBar,
                    backgroundColor: i < gameState.clonerProgress ? '#FFD700' : '#333',
                    boxShadow: i < gameState.clonerProgress ? '0 0 10px #FFD700' : 'none'
                  }}
                />
              ))}
            </div>
            <div style={styles.clonerHint}>间隔1秒内连续点击3次</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          from { transform: scale(1); }
          to { transform: scale(1.1); }
        }
        @keyframes glow {
          from { filter: brightness(1); }
          to { filter: brightness(1.5); }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  gameContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent',
    position: 'relative',
    zIndex: 1,
    fontFamily: '"Courier New", monospace',
    minWidth: '1024px',
    minHeight: '768px'
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px 30px',
    backgroundColor: 'rgba(10, 10, 26, 0.9)',
    borderBottom: '1px solid #00DCFF',
    gap: '40px'
  },
  alertContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flex: 1
  },
  alertLabel: {
    color: '#00DCFF',
    fontSize: '14px',
    fontWeight: 'bold',
    minWidth: '40px'
  },
  alertBar: {
    flex: 1,
    height: '20px',
    backgroundColor: '#1a1a2e',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #333'
  },
  alertFill: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease',
    borderRadius: '10px'
  },
  alertText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    textShadow: '0 0 5px #000'
  },
  scoreContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  scoreLabel: {
    color: '#888',
    fontSize: '14px'
  },
  scoreValue: {
    color: '#FFD700',
    fontSize: '24px',
    fontWeight: 'bold',
    textShadow: '0 0 10px #FFD700'
  },
  roundContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  roundLabel: {
    color: '#888',
    fontSize: '14px'
  },
  roundValue: {
    color: '#00DCFF',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  leftPanel: {
    width: '180px',
    backgroundColor: 'rgba(10, 10, 26, 0.9)',
    borderRight: '1px solid #333',
    padding: '20px 15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  panelTitle: {
    color: '#00DCFF',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid #333',
    paddingBottom: '8px',
    marginBottom: '5px'
  },
  toolCooldownItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px'
  },
  toolCooldownLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    flex: 1
  },
  cooldownArcContainer: {
    width: '50px',
    height: '50px'
  },
  stealthStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '12px'
  },
  stealthIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    transition: 'background-color 0.3s, box-shadow 0.3s'
  },
  stealthHint: {
    fontSize: '10px',
    color: '#666',
    lineHeight: '1.5'
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  canvas: {
    cursor: 'crosshair',
    transition: 'all 0.2s ease'
  },
  rightPanel: {
    width: '200px',
    backgroundColor: 'rgba(10, 10, 26, 0.9)',
    borderLeft: '1px solid #333',
    padding: '20px 15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  toolsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  toolButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '80px',
    borderRadius: '12px',
    border: '2px solid',
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    gap: '5px'
  },
  toolIcon: {
    fontSize: '28px'
  },
  toolName: {
    fontSize: '11px',
    color: '#ccc'
  },
  nodeInfo: {
    fontSize: '12px',
    color: '#aaa',
    lineHeight: '1.8',
    backgroundColor: 'rgba(26, 26, 46, 0.5)',
    padding: '10px',
    borderRadius: '8px'
  },
  clonerProgress: {
    marginTop: '10px'
  },
  clonerBars: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px'
  },
  clonerBar: {
    flex: 1,
    height: '15px',
    borderRadius: '3px',
    transition: 'all 0.2s ease'
  },
  clonerHint: {
    fontSize: '10px',
    color: '#666',
    textAlign: 'center'
  },
  messageOverlay: {
    position: 'absolute',
    top: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 220, 255, 0.9)',
    color: '#000',
    padding: '12px 30px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 'bold',
    animation: 'fadeIn 0.2s ease',
    zIndex: 10
  },
  spaceHoldOverlay: {
    position: 'absolute',
    bottom: '100px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10
  },
  spaceHoldProgress: {
    backgroundColor: 'rgba(0, 220, 255, 0.9)',
    color: '#000',
    padding: '10px 25px',
    borderRadius: '15px',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  spaceHoldText: {
    whiteSpace: 'nowrap'
  },
  escapeOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    zIndex: 10,
    pointerEvents: 'none'
  },
  escapeTimer: {
    fontSize: '72px',
    fontWeight: 'bold',
    color: '#FF4444',
    textShadow: '0 0 30px #FF4444, 0 0 60px #FF0000',
    marginBottom: '10px'
  },
  escapeHint: {
    fontSize: '18px',
    color: '#FF4444',
    textShadow: '0 0 10px #FF4444'
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 26, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20
  },
  gameOverTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#FF4444',
    textShadow: '0 0 30px #FF4444',
    marginBottom: '20px'
  },
  gameOverScore: {
    fontSize: '24px',
    color: '#FFD700',
    marginBottom: '40px'
  },
  restartButton: {
    padding: '15px 50px',
    fontSize: '18px',
    fontWeight: 'bold',
    backgroundColor: 'transparent',
    color: '#00DCFF',
    border: '2px solid #00DCFF',
    borderRadius: '25px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  winOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 26, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20
  },
  winTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#00FF88',
    textShadow: '0 0 30px #00FF88',
    marginBottom: '20px'
  },
  winScore: {
    fontSize: '24px',
    color: '#FFD700',
    marginBottom: '40px'
  },
  nextRoundButton: {
    padding: '15px 50px',
    fontSize: '18px',
    fontWeight: 'bold',
    backgroundColor: 'transparent',
    color: '#00FF88',
    border: '2px solid #00FF88',
    borderRadius: '25px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};

export default GameUI;
