import React, { useState, useEffect, useRef, useCallback } from 'react';
import TreeCanvas from './TreeCanvas';
import { StoryNodeData, UserData } from './types';

const WS_URL = () => {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
};

const App: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [joined, setJoined] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [userColor, setUserColor] = useState('');
  const [users, setUsers] = useState<UserData[]>([]);
  const [nodes, setNodes] = useState<StoryNodeData[]>([]);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState('');

  const nodesMapRef = useRef<Map<string, StoryNodeData>>(new Map());
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastSentContentRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const nodesMap = new Map<string, StoryNodeData>();
    nodes.forEach(n => nodesMap.set(n.id, n));
    nodesMapRef.current = nodesMap;
  }, [nodes]);

  const connect = useCallback(() => {
    const socket = new WebSocket(WS_URL());
    wsRef.current = socket;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'error') {
        setError(data.message);
        return;
      }
      if (data.type === 'room_joined') {
        setRoomCode(data.code);
        setUserId(data.userId);
        setUserColor(data.color);
        setJoined(true);
        setError('');
        return;
      }
      if (data.type === 'room_state') {
        setUsers(data.users);
        setNodes(data.nodes);
        return;
      }
      if (data.type === 'node_updated') {
        setNodes(prev => prev.map(n =>
          n.id === data.nodeId ? { ...n, content: data.content } : n
        ));
        return;
      }
    };

    socket.onerror = () => {
      setError('连接失败，请稍后重试');
    };

    socket.onclose = () => {
      if (joined) {
        setTimeout(connect, 2000);
      }
    };

    setWs(socket);
  }, [joined]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMsg = (msg: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const handleCreateRoom = () => {
    if (!userName.trim()) {
      setError('请输入用户名');
      return;
    }
    sendMsg({ type: 'create_room', name: userName.trim() });
  };

  const handleJoinRoom = () => {
    if (!userName.trim()) {
      setError('请输入用户名');
      return;
    }
    if (!/^\d{6}$/.test(inputCode)) {
      setError('请输入6位数字房间码');
      return;
    }
    sendMsg({ type: 'join_room', name: userName.trim(), code: inputCode });
  };

  const handleAddNode = (parentId: string) => {
    sendMsg({ type: 'add_node', parentId });
  };

  const handleStartEditing = (nodeId: string) => {
    const node = nodesMapRef.current.get(nodeId);
    if (!node || node.saved) return;
    setEditingNode(nodeId);
    setEditContent(node.content);
    sendMsg({ type: 'start_editing', nodeId });
  };

  const handleContentChange = (content: string) => {
    setEditContent(content);
    if (!editingNode) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const lastSent = lastSentContentRef.current.get(editingNode) || '';
    if (content !== lastSent) {
      sendMsg({ type: 'update_node', nodeId: editingNode, content });
      lastSentContentRef.current.set(editingNode, content);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      if (editingNode && content.trim()) {
        sendMsg({ type: 'save_node', nodeId: editingNode, content });
        lastSentContentRef.current.delete(editingNode);
        setEditingNode(null);
      }
    }, 1000);
  };

  const handleCloseEditor = () => {
    if (!editingNode) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    if (editContent.trim()) {
      sendMsg({ type: 'save_node', nodeId: editingNode, content: editContent });
    } else {
      sendMsg({ type: 'stop_editing', nodeId: editingNode });
    }
    lastSentContentRef.current.delete(editingNode);
    setEditingNode(null);
  };

  const handleExport = () => {
    const exportData = nodes.map(n => ({
      id: n.id,
      content: n.content,
      parentId: n.parentId,
      children: n.children,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `story_${roomCode}_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!joined) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1A1A2E',
      }}>
        <div style={{
          background: '#16213E',
          padding: '40px',
          borderRadius: '12px',
          width: '400px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <h1 style={{ marginBottom: '8px', fontSize: '24px', color: '#E2E8F0' }}>
            协作式分支叙事编辑器
          </h1>
          <p style={{ marginBottom: '24px', color: '#94a3b8', fontSize: '14px' }}>
            与朋友一起创作分支故事
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#cbd5e1' }}>
              用户名
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="输入你的名字"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#E2E8F0',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={handleCreateRoom}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            创建新房间
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}>
            <div style={{ flex: 1, height: '1px', background: '#334155' }} />
            <span style={{ color: '#64748b', fontSize: '12px' }}>或加入已有房间</span>
            <div style={{ flex: 1, height: '1px', background: '#334155' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6位房间码"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#E2E8F0',
                fontSize: '14px',
                outline: 'none',
                letterSpacing: '4px',
                textAlign: 'center',
              }}
            />
            <button
              onClick={handleJoinRoom}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #475569',
                background: '#334155',
                color: '#E2E8F0',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              加入
            </button>
          </div>

          {error && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#fca5a5',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      background: '#1A1A2E',
      color: '#E2E8F0',
    }}>
      <div style={{
        width: '240px',
        background: '#16213E',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #334155',
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>房间码</div>
          <div style={{
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '4px',
            color: '#E2E8F0',
            background: '#0f172a',
            padding: '8px 12px',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            {roomCode}
          </div>
        </div>

        <div style={{ marginBottom: '12px', fontSize: '13px', color: '#94a3b8' }}>
          房间成员 ({users.length}/6)
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {users.map(u => (
            <div
              key={u.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                borderRadius: '8px',
                background: u.id === userId ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                marginBottom: '4px',
              }}
            >
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#22c55e',
                flexShrink: 0,
              }} />
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: u.color,
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '14px',
                color: '#E2E8F0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {u.name}{u.id === userId ? ' (我)' : ''}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={handleExport}
          style={{
            marginTop: '16px',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #475569',
            background: '#334155',
            color: '#E2E8F0',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          导出故事 (JSON)
        </button>
      </div>

      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <TreeCanvas
          nodes={nodes}
          users={users}
          userId={userId}
          userColor={userColor}
          onAddNode={handleAddNode}
          onStartEditing={handleStartEditing}
        />
      </div>

      {editingNode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#00000060',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            animation: 'fadeIn 0.3s ease',
          }}
          onClick={handleCloseEditor}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
          <div
            style={{
              width: '400px',
              background: '#16213E',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              border: `2px solid ${userColor}`,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              autoFocus
              value={editContent}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="输入叙事内容..."
              style={{
                width: '100%',
                height: '150px',
                background: '#0f172a',
                color: '#E2E8F0',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              marginTop: '12px',
            }}>
              <div style={{ flex: 1, fontSize: '12px', color: '#94a3b8', alignSelf: 'center' }}>
                1秒后自动保存
              </div>
              <button
                onClick={handleCloseEditor}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
