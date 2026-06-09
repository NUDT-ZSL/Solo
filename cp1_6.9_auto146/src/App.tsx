import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import MainCanvas from './MainCanvas';
import SidebarLeft from './SidebarLeft';
import SidebarRight from './SidebarRight';
import type { MindMapNode, Connection, Snapshot, User, CursorInfo } from './types';

const App = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [inputNickname, setInputNickname] = useState('');
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorInfo & { timestamp: number }>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [joinAttempted, setJoinAttempted] = useState(false);
  const lastEmitTime = useRef(0);

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));

    newSocket.on('error', (msg: string) => {
      setErrorMessage(msg);
    });

    newSocket.on('room:full', () => {
      setErrorMessage('房间已满（最多10人），请稍后再试或使用其他房间号');
    });

    newSocket.on('room:joined', (data: {
      roomId: string;
      userId: string;
      users: User[];
      nodes: MindMapNode[];
      connections: Connection[];
      snapshots: Snapshot[];
    }) => {
      setRoomId(data.roomId);
      setUserId(data.userId);
      setUsers(data.users);
      setNodes(data.nodes);
      setConnections(data.connections);
      setSnapshots(data.snapshots);
      setJoinAttempted(true);
    });

    newSocket.on('user:joined', (user: User) => {
      setUsers((prev) => [...prev, user]);
    });

    newSocket.on('user:left', ({ userId: leftId }: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.userId !== leftId));
      setCursors((prev) => {
        const next = { ...prev };
        delete next[leftId];
        return next;
      });
    });

    newSocket.on('cursor:update', (info: CursorInfo) => {
      setCursors((prev) => ({
        ...prev,
        [info.userId]: { ...info, timestamp: Date.now() },
      }));
    });

    newSocket.on('node:created', (node: MindMapNode) => {
      setNodes((prev) => [...prev, node]);
    });

    newSocket.on('node:updated', ({ node, conflict }: { node: MindMapNode; conflict: boolean }) => {
      setNodes((prev) => prev.map((n) => (n.id === node.id ? node : n)));
      if (conflict) {
        const flashEl = document.getElementById(`node-${node.id}`);
        if (flashEl) {
          flashEl.classList.add('conflict-flash');
          setTimeout(() => flashEl.classList.remove('conflict-flash'), 300);
        }
      }
    });

    newSocket.on('node:deleted', ({ nodeId, connectionIds }: { nodeId: string; connectionIds: string[] }) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setConnections((prev) => prev.filter((c) => !connectionIds.includes(c.id)));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    });

    newSocket.on('connection:created', (conn: Connection) => {
      setConnections((prev) => [...prev, conn]);
    });

    newSocket.on('connection:updated', (conn: Connection) => {
      setConnections((prev) => prev.map((c) => (c.id === conn.id ? conn : c)));
    });

    newSocket.on('connection:deleted', ({ connectionId }: { connectionId: string }) => {
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    });

    newSocket.on('snapshots:update', (list: Snapshot[]) => {
      setSnapshots(list);
    });

    newSocket.on('snapshot:rolledback', (data: { nodes: MindMapNode[]; connections: Connection[] }) => {
      setNodes(data.nodes);
      setConnections(data.connections);
      setSelectedNodeId(null);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleJoin = useCallback(() => {
    if (!inputNickname.trim()) {
      setErrorMessage('请输入昵称');
      return;
    }
    setErrorMessage('');
    if (socket && connected) {
      socket.emit('room:join', { roomId: inputRoomId.trim(), nickname: inputNickname.trim() });
      setNickname(inputNickname.trim());
    }
  }, [socket, connected, inputRoomId, inputNickname]);

  const emitCursorMove = useCallback((x: number, y: number) => {
    if (!socket || !connected) return;
    const now = Date.now();
    if (now - lastEmitTime.current < 30) return;
    lastEmitTime.current = now;
    socket.emit('cursor:move', { x, y });
  }, [socket, connected]);

  const createNode = useCallback((data: { x: number; y: number; content?: string; color?: string; borderWidth?: number; fontSize?: number }) => {
    if (!socket) return;
    socket.emit('node:create', {
      x: data.x,
      y: data.y,
      content: data.content || '新想法',
      color: data.color || '#4ECDC4',
      borderWidth: data.borderWidth ?? 2,
      fontSize: data.fontSize ?? 16,
    });
  }, [socket]);

  const updateNode = useCallback((data: Partial<MindMapNode> & { id: string }) => {
    if (!socket) return;
    socket.emit('node:update', data);
  }, [socket]);

  const deleteNode = useCallback((nodeId: string) => {
    if (!socket) return;
    socket.emit('node:delete', { nodeId });
  }, [socket]);

  const createConnection = useCallback((data: Omit<Connection, 'id'>) => {
    if (!socket) return;
    socket.emit('connection:create', data);
  }, [socket]);

  const updateConnection = useCallback((data: Partial<Connection> & { id: string }) => {
    if (!socket) return;
    socket.emit('connection:update', data);
  }, [socket]);

  const deleteConnection = useCallback((connectionId: string) => {
    if (!socket) return;
    socket.emit('connection:delete', { connectionId });
  }, [socket]);

  const saveSnapshot = useCallback(() => {
    if (!socket) return;
    socket.emit('snapshot:save');
  }, [socket]);

  const rollbackSnapshot = useCallback((snapshotId: string) => {
    if (!socket) return;
    socket.emit('snapshot:rollback', { snapshotId });
  }, [socket]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        for (const [id, cur] of Object.entries(prev)) {
          if (now - cur.timestamp < 10000) next[id] = cur;
        }
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  if (!joinAttempted) {
    return (
      <div className="join-screen">
        <div className="join-card">
          <h1>✨ 灵感火花</h1>
          <p className="join-subtitle">实时思维导图协作工具</p>
          <div className="join-field">
            <label>昵称</label>
            <input
              type="text"
              value={inputNickname}
              onChange={(e) => setInputNickname(e.target.value)}
              placeholder="请输入您的昵称"
              maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>
          <div className="join-field">
            <label>房间号（可选，留空自动生成）</label>
            <input
              type="text"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
              placeholder="例如：ABC123"
              maxLength={10}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>
          {errorMessage && <div className="error-msg">{errorMessage}</div>}
          <div className="join-status">
            {connected ? <span className="status-online">● 已连接</span> : <span className="status-offline">● 连接中...</span>}
          </div>
          <button className="join-btn" onClick={handleJoin} disabled={!connected}>
            进入房间
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="top-bar">
        <div className="top-bar-left">
          <button className="icon-btn mobile-only" onClick={() => setLeftOpen((v) => !v)}>
            ☰
          </button>
          <div className="brand">
            <span className="brand-icon">✨</span>
            <span className="brand-text">灵感火花</span>
          </div>
          <div className="room-info">
            <span className="room-label">房间：</span>
            <span className="room-id">{roomId}</span>
            <button
              className="copy-btn"
              onClick={() => {
                navigator.clipboard?.writeText(roomId);
              }}
              title="复制房间号"
            >
              📋
            </button>
          </div>
          <div className="users-pill">
            <span>👥 {users.length}/10</span>
            <div className="users-tooltip">
              {users.map((u) => (
                <div key={u.userId} className="tooltip-user">
                  <span
                    className="user-color-dot"
                    style={{ background: nicknameToColor(u.nickname) }}
                  />
                  {u.nickname}
                  {u.userId === userId && <span className="self-tag">（我）</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="top-bar-right">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索节点内容..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>
          <button className="save-snapshot-btn" onClick={saveSnapshot}>
            💾 保存快照
          </button>
          <button className="icon-btn mobile-only" onClick={() => setRightOpen((v) => !v)}>
            ⚙️
          </button>
        </div>
      </div>

      <div className="main-body">
        <SidebarLeft
          snapshots={snapshots}
          onRollback={rollbackSnapshot}
          isOpen={leftOpen}
          onClose={() => setLeftOpen(false)}
        />

        <MainCanvas
          nodes={nodes}
          connections={connections}
          cursors={cursors}
          currentUserId={userId}
          currentNickname={nickname}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onCreateNode={createNode}
          onUpdateNode={updateNode}
          onDeleteNode={deleteNode}
          onCreateConnection={createConnection}
          onUpdateConnection={updateConnection}
          onDeleteConnection={deleteConnection}
          onCursorMove={emitCursorMove}
          searchKeyword={searchKeyword}
        />

        <SidebarRight
          selectedNode={selectedNode}
          onUpdateNode={updateNode}
          onDeleteNode={deleteNode}
          isOpen={rightOpen}
          onClose={() => setRightOpen(false)}
        />
      </div>
    </div>
  );
};

function nicknameToColor(nickname: string): string {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 75%, 60%)`;
}

export default App;
