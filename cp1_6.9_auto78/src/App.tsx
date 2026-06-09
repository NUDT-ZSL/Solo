import React, { useState, useEffect, useRef, useCallback } from 'react';
import Toolbar, { ToolbarProps } from './components/Toolbar';
import MindMapCanvas, { MindMapCanvasHandle } from './components/MindMapCanvas';
import socketManager, { MindMapNode, MindMapEdge, MindMapState, DraggingUser, UserInfo } from './socket';
import apiClient, { VersionInfo } from './api';

type AppScreen = 'login' | 'roomSelect' | 'editor';

const SOFT_COLORS = ['#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
function randomSoftColor(): string {
  return SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)];
}

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [nickname, setNickname] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomId, setRoomId] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');

  const [state, setState] = useState<MindMapState>({ nodes: [], edges: [] });
  const [remoteDraggingUsers, setRemoteDraggingUsers] = useState<Map<string, DraggingUser>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<UserInfo[]>([]);

  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  const canvasRef = useRef<MindMapCanvasHandle>(null);
  const pendingTempNodeIdsRef = useRef<Map<string, string>>(new Map());

  const initSocket = useCallback(() => {
    socketManager.connect();

    socketManager.on('connected', (id?: string) => {
      if (id) setUserId(id);
      setConnectionStatus('connected');
    });

    socketManager.on('disconnected', () => {
      setConnectionStatus('disconnected');
    });

    socketManager.on('room:joined', (data: { state: MindMapState; roomId: string; users: UserInfo[] }) => {
      setState(data.state);
      setOnlineUsers(data.users);
      setScreen('editor');
    });

    socketManager.on('user:joined', () => {
      refreshOnlineUsers();
    });

    socketManager.on('user:left', () => {
      refreshOnlineUsers();
    });

    socketManager.on('node:created', (data: { node: MindMapNode; initiatorId: string }) => {
      if (data.initiatorId === userId) return;
      setState(prev => {
        if (prev.nodes.some(n => n.id === data.node.id)) return prev;
        return { ...prev, nodes: [...prev.nodes, data.node] };
      });
    });

    socketManager.on('node:created:ack', (data: { node: MindMapNode; clientId: string }) => {
      const tempId = data.clientId;
      if (tempId) {
        pendingTempNodeIdsRef.current.set(tempId, data.node.id);
      }
      setState(prev => {
        const nodes = prev.nodes.map(n =>
          n.id === tempId ? { ...data.node } : n
        );
        return { ...prev, nodes };
      });
    });

    socketManager.on('node:moved', (data: { nodeId: string; x: number; y: number; initiatorId: string }) => {
      if (data.initiatorId === userId) return;
      setState(prev => ({
        ...prev,
        nodes: prev.nodes.map(n =>
          n.id === data.nodeId ? { ...n, x: data.x, y: data.y } : n
        )
      }));
    });

    socketManager.on('node:text:updated', (data: { nodeId: string; text: string; initiatorId: string }) => {
      if (data.initiatorId === userId) return;
      setState(prev => ({
        ...prev,
        nodes: prev.nodes.map(n =>
          n.id === data.nodeId ? { ...n, text: data.text } : n
        )
      }));
    });

    socketManager.on('node:deleted', (data: { nodeId: string; initiatorId: string }) => {
      if (data.initiatorId === userId) return;
      setState(prev => ({
        nodes: prev.nodes.filter(n => n.id !== data.nodeId),
        edges: prev.edges.filter(e => e.from !== data.nodeId && e.to !== data.nodeId)
      }));
    });

    socketManager.on('edge:created', (data: { edge: MindMapEdge; initiatorId: string }) => {
      if (data.initiatorId === userId) return;
      setState(prev => {
        if (prev.edges.some(e => e.id === data.edge.id)) return prev;
        return { ...prev, edges: [...prev.edges, data.edge] };
      });
    });

    socketManager.on('edge:created:ack', (data: { edge: MindMapEdge }) => {
    });

    socketManager.on('edge:deleted', (data: { edgeId: string; initiatorId: string }) => {
      if (data.initiatorId === userId) return;
      setState(prev => ({
        ...prev,
        edges: prev.edges.filter(e => e.id !== data.edgeId)
      }));
    });

    socketManager.on('user:dragging', (data: DraggingUser) => {
      setRemoteDraggingUsers(prev => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
    });

    socketManager.on('user:drag:end', (data: { userId: string; nodeId: string }) => {
      setRemoteDraggingUsers(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    socketManager.on('state:update', (data: { state: MindMapState; initiatorId: string }) => {
      setState(data.state);
      if (canvasRef.current && data.initiatorId !== userId) {
        canvasRef.current.setStateFromOutside(data.state);
      }
      loadVersions();
    });

    socketManager.on('version:created', () => {
      loadVersions();
    });

    setConnectionStatus(socketManager.isConnected() ? 'connected' : 'connecting');
  }, [userId]);

  useEffect(() => {
    initSocket();
    return () => {
      socketManager.removeAllListeners();
      socketManager.disconnect();
    };
  }, [initSocket]);

  const refreshOnlineUsers = useCallback(() => {
  }, []);

  const loadVersions = useCallback(async () => {
    if (!roomId) return;
    setVersionsLoading(true);
    try {
      const vs = await apiClient.getVersions(roomId);
      setVersions(vs);
    } catch (e) {
      console.error('Failed to load versions', e);
    } finally {
      setVersionsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (versionPanelOpen && roomId) {
      loadVersions();
    }
  }, [versionPanelOpen, roomId, loadVersions]);

  const handleLogin = () => {
    if (nickname.trim()) {
      setUserName(nickname.trim());
      setScreen('roomSelect');
    }
  };

  const handleJoinRoom = () => {
    if (roomIdInput.trim()) {
      const rid = roomIdInput.trim().toUpperCase();
      setRoomId(rid);
      socketManager.joinRoom(rid, userName);
    }
  };

  const handleCreateRoom = () => {
    const rid = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(rid);
    setRoomIdInput(rid);
    socketManager.joinRoom(rid, userName);
  };

  const handleCreateNode = (node: Omit<MindMapNode, 'id' | 'createdAt'> & { id?: string }): string => {
    const tempId = node.id || ('local_' + Date.now());
    socketManager.createNode(roomId, node);
    return tempId;
  };

  const handleMoveNode = (nodeId: string, x: number, y: number) => {
    socketManager.moveNode(roomId, nodeId, x, y);
  };

  const handleUpdateNodeText = (nodeId: string, text: string) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.map(n =>
        n.id === nodeId ? { ...n, text: text.substring(0, 50) } : n
      )
    }));
    socketManager.updateNodeText(roomId, nodeId, text);
  };

  const handleDeleteNode = (nodeId: string) => {
    setState(prev => ({
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.from !== nodeId && e.to !== nodeId)
    }));
    socketManager.deleteNode(roomId, nodeId);
  };

  const handleCreateEdge = (from: string, to: string) => {
    const tempEdge: MindMapEdge = {
      id: 'e_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      from,
      to
    };
    setState(prev => {
      const exists = prev.edges.some(e =>
        (e.from === from && e.to === to) || (e.from === to && e.to === from)
      );
      if (exists || from === to) return prev;
      return { ...prev, edges: [...prev.edges, tempEdge] };
    });
    socketManager.createEdge(roomId, from, to);
  };

  const handleDeleteEdge = (edgeId: string) => {
    setState(prev => ({
      ...prev,
      edges: prev.edges.filter(e => e.id !== edgeId)
    }));
    socketManager.deleteEdge(roomId, edgeId);
  };

  const handleDragStart = (nodeId: string) => {
    socketManager.dragStart(roomId, nodeId);
  };

  const handleDragEnd = (nodeId: string) => {
    socketManager.dragEnd(roomId, nodeId);
  };

  const handleTakeSnapshot = () => {
    socketManager.takeSnapshot(roomId, userId, userName);
  };

  const handleRollback = async (versionId: string) => {
    if (!confirm('确定要回滚到此版本吗？当前未保存的修改将丢失。')) return;
    try {
      const newState = await apiClient.rollback(roomId, versionId, userId);
      setState(newState);
      if (canvasRef.current) {
        canvasRef.current.setStateFromOutside(newState);
      }
      loadVersions();
    } catch (e) {
      console.error('Rollback failed', e);
      alert('回滚失败');
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const canUndo = canvasRef.current?.canUndo || false;
  const canRedo = canvasRef.current?.canRedo || false;

  if (screen === 'login') {
    return (
      <div style={loginContainerStyle}>
        <div style={loginCardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🧠</div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #10B981, #3B82F6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '8px'
            }}>
              智联图谱
            </h1>
            <p style={{ color: 'rgba(245,245,245,0.6)', fontSize: '14px' }}>
              协作脑图 · 实时同步 · 知识共建
            </p>
          </div>

          <label style={inputLabelStyle}>请输入您的昵称</label>
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            maxLength={20}
            placeholder="例如：小明老师"
            style={inputStyle}
            autoFocus
          />

          <button
            onClick={handleLogin}
            disabled={!nickname.trim()}
            style={{
              ...primaryBtnStyle,
              opacity: nickname.trim() ? 1 : 0.5,
              cursor: nickname.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            进入系统
          </button>

          <div style={{
            marginTop: '32px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.04)',
            fontSize: '12px',
            color: 'rgba(245,245,245,0.5)',
            lineHeight: 1.8
          }}>
            <div style={{ fontWeight: 600, color: 'rgba(245,245,245,0.7)', marginBottom: '8px' }}>✨ 使用提示</div>
            · 双击画布空白处创建新节点<br />
            · 双击节点编辑文本内容<br />
            · 按住 Shift 从节点拖拽创建连线<br />
            · 右键点击节点或连线可删除
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'roomSelect') {
    return (
      <div style={loginContainerStyle}>
        <div style={{ ...loginCardStyle, maxWidth: '440px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.15)',
              fontSize: '13px',
              color: '#60A5FA',
              marginBottom: '16px'
            }}>
              <span>👤</span>
              <span>{userName}</span>
            </div>
            <h2 style={{
              fontSize: '26px',
              fontWeight: 700,
              color: '#F5F5F5',
              marginBottom: '6px'
            }}>
              选择协作房间
            </h2>
            <p style={{ color: 'rgba(245,245,245,0.55)', fontSize: '13px' }}>
              加入现有房间或创建新的协作空间
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={inputLabelStyle}>房间号</label>
            <input
              type="text"
              value={roomIdInput}
              onChange={e => setRoomIdInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
              maxLength={8}
              placeholder="输入 6 位房间号"
              style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '3px', textAlign: 'center', fontSize: '18px' }}
            />
          </div>

          <button
            onClick={handleJoinRoom}
            disabled={!roomIdInput.trim()}
            style={{
              ...primaryBtnStyle,
              opacity: roomIdInput.trim() ? 1 : 0.5,
              cursor: roomIdInput.trim() ? 'pointer' : 'not-allowed',
              marginBottom: '14px'
            }}
          >
            加入房间
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '18px 0'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ color: 'rgba(245,245,245,0.4)', fontSize: '12px' }}>或</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <button
            onClick={handleCreateRoom}
            style={{
              ...primaryBtnStyle,
              background: 'linear-gradient(135deg, #10B981, #059669)'
            }}
          >
            ➕ 创建新房间
          </button>

          <div style={{
            marginTop: '24px',
            textAlign: 'center'
          }}>
            <button
              onClick={() => setScreen('login')}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(245,245,245,0.5)',
                cursor: 'pointer',
                fontSize: '13px',
                textDecoration: 'underline'
              }}
            >
              ← 更换昵称
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#1A1A2E', position: 'relative' }}>
      <Toolbar
        onAddRootNode={() => canvasRef.current?.addRootNode()}
        onAddChildNode={() => canvasRef.current?.addChildNode()}
        onDeleteSelected={() => canvasRef.current?.deleteSelected()}
        onUndo={() => canvasRef.current?.undo()}
        onRedo={() => canvasRef.current?.redo()}
        onZoomIn={() => canvasRef.current?.zoomIn()}
        onZoomOut={() => canvasRef.current?.zoomOut()}
        onResetView={() => canvasRef.current?.resetView()}
        onToggleVersionPanel={() => {
          setVersionPanelOpen(v => !v);
        }}
        onTakeSnapshot={handleTakeSnapshot}
        canUndo={canUndo}
        canRedo={canRedo}
        versionPanelOpen={versionPanelOpen}
        roomId={roomId}
        userName={userName}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <MindMapCanvas
          ref={canvasRef}
          roomId={roomId}
          userId={userId}
          userName={userName}
          state={state}
          onStateChange={setState}
          onCreateNode={handleCreateNode}
          onMoveNode={handleMoveNode}
          onUpdateNodeText={handleUpdateNodeText}
          onDeleteNode={handleDeleteNode}
          onCreateEdge={handleCreateEdge}
          onDeleteEdge={handleDeleteEdge}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          remoteDraggingUsers={remoteDraggingUsers}
        />

        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
            fontSize: '12px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connectionStatus === 'connected' ? '#10B981' : connectionStatus === 'connecting' ? '#F59E0B' : '#EF4444',
              display: 'inline-block',
              boxShadow: connectionStatus === 'connected' ? '0 0 8px #10B981' : 'none'
            }} />
            <span style={{ color: 'rgba(245,245,245,0.7)' }}>
              {connectionStatus === 'connected' ? '已连接' : connectionStatus === 'connecting' ? '连接中' : '已断开'}
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
            fontSize: '12px',
            color: 'rgba(245,245,245,0.7)'
          }}>
            <span>👥</span>
            <span>{onlineUsers.length} 在线</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '300px',
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            transform: versionPanelOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 90,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F5F5F5', margin: 0 }}>
                📜 版本历史
              </h3>
              <p style={{ fontSize: '11px', color: 'rgba(245,245,245,0.45)', margin: '4px 0 0' }}>
                每 5 分钟自动保存
              </p>
            </div>
            <button
              onClick={() => setVersionPanelOpen(false)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#F5F5F5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={handleTakeSnapshot}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #3B82F6, #2563EB)'
              }}
            >
              💾 立即保存版本
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {versionsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(245,245,245,0.5)' }}>
                加载中...
              </div>
            ) : versions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'rgba(245,245,245,0.45)',
                fontSize: '13px',
                lineHeight: 1.8
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                <div>暂无历史版本</div>
                <div style={{ marginTop: '6px', fontSize: '12px' }}>
                  点击上方按钮手动保存，<br />或等待 5 分钟自动保存
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {versions.map((v, idx) => (
                  <div
                    key={v.id}
                    onClick={() => handleRollback(v.id)}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      background: idx === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${idx === 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.background = 'rgba(59, 130, 246, 0.15)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(59, 130, 246, 0.4)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background = idx === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.04)';
                      (e.currentTarget as HTMLDivElement).style.borderColor = idx === 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.06)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: idx === 0 ? '#10B981' : '#F5F5F5'
                      }}>
                        {idx === 0 ? '🟢 最新版本' : `版本 #${versions.length - idx}`}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#F5F5F5',
                      fontFamily: 'monospace',
                      marginBottom: '6px'
                    }}>
                      {formatTime(v.timestamp)}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(245,245,245,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>👤</span>
                      <span>{v.creatorName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {versionPanelOpen && (
          <div
            onClick={() => setVersionPanelOpen(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 80
            }}
          />
        )}
      </div>
    </div>
  );
};

const loginContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
  position: 'relative',
  overflow: 'hidden',
  padding: '20px'
};

const loginCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '400px',
  padding: '40px 36px',
  borderRadius: '20px',
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
  position: 'relative',
  zIndex: 1
};

const inputLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: 'rgba(245,245,245,0.8)',
  marginBottom: '8px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: '#F5F5F5',
  fontSize: '15px',
  outline: 'none',
  transition: 'all 0.2s ease',
  marginBottom: '20px'
};

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  borderRadius: '12px',
  border: 'none',
  cursor: 'pointer',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 600,
  background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
  transition: 'all 0.2s ease'
};

export default App;
