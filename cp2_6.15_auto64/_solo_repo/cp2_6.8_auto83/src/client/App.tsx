import React, { useState, useEffect, useRef, useCallback } from 'react';
import Canvas from './Canvas';
import type {
  NodeData, EdgeData, User, RoomState, HistoryRecord, ServerMessage, ClientMessage } from '../shared/types';

interface ChatMessage {
  userName: string;
  message: string;
  timestamp: number;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:3001/ws`;
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => showToast('连接服务器失败');
    setWs(socket);
    return () => socket.close();
  }, [showToast]);

  const sendMessage = useCallback((msg: ClientMessage) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, [ws]);

  useEffect(() => {
    if (!ws) return;
    const onMessage = (ev: MessageEvent) => {
      let data: ServerMessage;
      try { data = JSON.parse(ev.data); } catch { return; }

      switch (data.type) {
        case 'roomCreated':
          setRoomCode(data.roomCode);
          setUserId(data.userId);
          setUsers([{ id: data.userId, name: roomName || '匿名用户' }]);
          break;
        case 'roomJoined':
          setRoomCode(data.state.roomCode);
          setUserId(data.userId);
          setUsers(data.state.users);
          setNodes(data.state.nodes);
          setEdges(data.state.edges);
          setHistory(data.state.history);
          break;
        case 'error':
          showToast(data.message);
          break;
        case 'userJoined':
          setUsers((u) => [...u, data.user]);
          break;
        case 'userLeft':
          setUsers((u) => u.filter((x) => x.id !== data.userId));
          break;
        case 'nodeAdded':
          setNodes((n) => [...n, data.node]);
          setHistory((h) => [data.record, ...h].slice(0, 50));
          break;
        case 'nodeUpdated':
          setNodes((n) => n.map((x) => (x.id === data.node.id ? data.node : x)));
          setHistory((h) => [data.record, ...h].slice(0, 50));
          break;
        case 'nodeDeleted':
          setNodes((n) => n.filter((x) => x.id !== data.nodeId));
          setEdges((e) => e.filter((x) => x.from !== data.nodeId && x.to !== data.nodeId));
          setHistory((h) => [data.record, ...h].slice(0, 50));
          break;
        case 'edgeAdded':
          setEdges((e) => [...e, data.edge]);
          setHistory((h) => [data.record, ...h].slice(0, 50));
          break;
        case 'edgeUpdated':
          setEdges((e) => e.map((x) => x.id === data.edge.id ? data.edge : x));
          setHistory((h) => [data.record, ...h].slice(0, 50));
          break;
        case 'edgeDeleted':
          setEdges((e) => e.filter((x) => x.id !== data.edgeId));
          setHistory((h) => [data.record, ...h].slice(0, 50));
          break;
        case 'chat':
          setChatMessages((m) => [...m, { userName: data.userName, message: data.message, timestamp: data.timestamp }]);
          break;
      }
    };
    ws.addEventListener('message', onMessage);
    return () => ws.removeEventListener('message', onMessage);
  }, [ws, roomName, showToast]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      showToast('请输入昵称');
      return;
    }
    sendMessage({ type: 'createRoom', userName: roomName.trim() || '匿名用户' });
  };

  const handleJoinRoom = () => {
    if (!roomName.trim()) {
      showToast('请输入昵称');
      return;
    }
    if (!joinCode.trim()) {
      showToast('请输入房间码');
      return;
    }
    sendMessage({ type: 'joinRoom', roomCode: joinCode.trim(), userName: roomName.trim() || '匿名用户' });
  };

  const handleAddNode = (node: NodeData) => sendMessage({ type: 'addNode', node });
  const handleUpdateNode = (node: NodeData) => sendMessage({ type: 'updateNode', node });
  const handleDeleteNode = (nodeId: string) => sendMessage({ type: 'deleteNode', nodeId });
  const handleAddEdge = (edge: EdgeData) => sendMessage({ type: 'addEdge', edge });
  const handleUpdateEdge = (edge: EdgeData) => sendMessage({ type: 'updateEdge', edge });
  const handleDeleteEdge = (edgeId: string) => sendMessage({ type: 'deleteEdge', edgeId });

  const handleUndo = (recordId: string) => sendMessage({ type: 'undo', recordId });

  const handleChatSend = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    sendMessage({ type: 'chat', message: msg });
    setChatInput('');
  };

  if (!roomCode) {
    return (
      <div className={`app ${darkMode ? 'dark' : 'light'}`}>
        {toast && <div className="toast">{toast}</div>}
        <div className="login-screen">
          <div className="login-box">
            <h2>协作思维导图</h2>
            <input
              type="text"
              placeholder="输入你的昵称"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={20}
            />
            <button onClick={handleCreateRoom} disabled={!connected}>
              创建房间
            </button>
            {!connected && <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'center' }}>正在连接服务器…</div>}
            <div className="divider">或</div>
            <input
              type="text"
              placeholder="输入6位房间码"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ letterSpacing: 2, textAlign: 'center', fontFamily: 'monospace' }}
            />
            <button onClick={handleJoinRoom} disabled={!connected}>加入房间</button>
            <button
              className="theme-toggle"
              onClick={() => setDarkMode(!darkMode)}
              style={{ position: 'absolute', top: 16, right: 16 }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${darkMode ? 'dark' : 'light'}`}>
      {toast && <div className="toast">{toast}</div>}
      <div className={`main-layout ${panelCollapsed ? 'panel-collapsed' : ''}`}>
        <div className="canvas-area">
          <Canvas
          nodes={nodes}
          edges={edges}
          darkMode={darkMode}
          onAddNode={handleAddNode}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onAddEdge={handleAddEdge}
          onUpdateEdge={handleUpdateEdge}
          onDeleteEdge={handleDeleteEdge}
          onError={showToast}
        />
        </div>
        <div
          className={`right-panel ${panelCollapsed ? 'collapsed' : ''}`}
        >
          <div className="room-header">
            <div>
              <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>房间码</div>
              <div className="code">{roomCode}</div>
            </div>
            <div className="users">{users.length}/8 人在线</div>
          </div>
          <div className="chat-panel">
            <div className="panel-title">💬 聊天</div>
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <div style={{ fontSize: 11, opacity: 0.5, textAlign: 'center', padding: 20 }}>暂无消息</div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className="chat-msg">
                  <span className="name">{m.userName}:</span>
                  <span>{m.message}</span>
                  <span className="time">{formatTime(m.timestamp)}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-input">
              <input
                type="text"
                placeholder="输入消息…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleChatSend(); }}
              />
              <button onClick={handleChatSend}>发送</button>
            </div>
          </div>
          <div className="history-panel">
            <div className="panel-title">📜 操作历史</div>
            <div className="history-list">
              {history.length === 0 && (
                <div style={{ fontSize: 11, opacity: 0.5, textAlign: 'center', padding: 20 }}>暂无记录</div>
              )}
              {history.map((r) => {
                const mine = r.userId === userId;
                return (
                  <div key={r.id} className={`history-item ${mine ? 'mine' : ''}`}>
                    <div style={{ flex: 1 }}>
                      <div className="action-text">{r.action}</div>
                      <div className="time">{formatTime(r.timestamp)}</div>
                    </div>
                    {mine && <button className="undo-btn" onClick={() => handleUndo(r.id)}>回退</button>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <button className="toggle-panel-btn" onClick={() => setPanelCollapsed(!panelCollapsed)} title={panelCollapsed ? '展开面板' : '收起面板'}>
          {panelCollapsed ? '☰' : '✕'}
        </button>
        <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} title="切换主题">
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
}
