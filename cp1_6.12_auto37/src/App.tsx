import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import NoteNode from './components/NoteNode';
import { socketService, User, CursorMoveData } from './utils/socket';
import { v4 as uuidv4 } from 'uuid';

const nodeTypes = {
  noteNode: NoteNode,
};

interface CursorState {
  [userId: string]: {
    x: number;
    y: number;
    user: User;
  };
}

const Whiteboard: React.FC<{
  roomId: string;
  currentUser: User | null;
  users: User[];
}> = ({ roomId, currentUser, users }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition, fitView, project } = useReactFlow();
  const [cursors, setCursors] = useState<CursorState>({});
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [edgeLabel, setEdgeLabel] = useState('');
  const isRemoteUpdateRef = useRef(false);
  const lastCursorUpdateRef = useRef(0);
  const hasRoomStateRef = useRef(false);
  const lastClickTimeRef = useRef(0);

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      const now = Date.now();
      if (now - lastClickTimeRef.current < 300) {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNode: Node = {
          id: uuidv4(),
          type: 'noteNode',
          position,
          data: { text: '', image: undefined },
        };

        setNodes((nds) => [...nds, newNode]);
      }
      lastClickTimeRef.current = now;
    },
    [screenToFlowPosition, setNodes]
  );

  useEffect(() => {
    const handleRoomState = (state: { nodes: Node[]; edges: Edge[] }) => {
      isRemoteUpdateRef.current = true;
      hasRoomStateRef.current = true;
      setNodes(state.nodes || []);
      setEdges(state.edges || []);
      setTimeout(() => {
        isRemoteUpdateRef.current = false;
      }, 50);
    };

    const handleNodesUpdate = (newNodes: Node[]) => {
      isRemoteUpdateRef.current = true;
      setNodes(newNodes);
      setTimeout(() => {
        isRemoteUpdateRef.current = false;
      }, 50);
    };

    const handleEdgesUpdate = (newEdges: Edge[]) => {
      isRemoteUpdateRef.current = true;
      setEdges(newEdges);
      setTimeout(() => {
        isRemoteUpdateRef.current = false;
      }, 50);
    };

    const handleCursorMove = (data: CursorMoveData) => {
      setCursors((prev) => {
        const user = users.find((u) => u.id === data.userId);
        if (!user) return prev;
        return {
          ...prev,
          [data.userId]: {
            x: data.position.x,
            y: data.position.y,
            user,
          },
        };
      });
    };

    const handleUserLeave = (userId: string) => {
      setCursors((prev) => {
        const newCursors = { ...prev };
        delete newCursors[userId];
        return newCursors;
      });
    };

    socketService.on('room-state', handleRoomState);
    socketService.on('nodes-update', handleNodesUpdate);
    socketService.on('edges-update', handleEdgesUpdate);
    socketService.on('cursor-move', handleCursorMove);
    socketService.on('user-leave', handleUserLeave);

    return () => {
      socketService.off('room-state', handleRoomState);
      socketService.off('nodes-update', handleNodesUpdate);
      socketService.off('edges-update', handleEdgesUpdate);
      socketService.off('cursor-move', handleCursorMove);
      socketService.off('user-leave', handleUserLeave);
    };
  }, [setNodes, setEdges, users]);

  useEffect(() => {
    if (isRemoteUpdateRef.current) return;
    if (!hasRoomStateRef.current) return;
    const timeout = setTimeout(() => {
      socketService.sendNodesUpdate(nodes);
    }, 30);
    return () => clearTimeout(timeout);
  }, [nodes]);

  useEffect(() => {
    if (isRemoteUpdateRef.current) return;
    if (!hasRoomStateRef.current) return;
    const timeout = setTimeout(() => {
      socketService.sendEdgesUpdate(edges);
    }, 30);
    return () => clearTimeout(timeout);
  }, [edges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            style: { stroke: '#90CAF9', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#90CAF9' },
            label: '',
            labelStyle: { fill: '#666', fontSize: 12 },
            labelBgStyle: { fill: '#fff', fillOpacity: 0.8 },
            labelShowBg: true,
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const now = Date.now();
      if (now - lastCursorUpdateRef.current < 50) return;
      lastCursorUpdateRef.current = now;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      socketService.sendCursorMove(position);
    },
    [screenToFlowPosition]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge.id);
      setEdgeLabel((edge.label as string) || '');
    },
    []
  );

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEdgeLabel(e.target.value);
      if (selectedEdge) {
        setEdges((eds) =>
          eds.map((ed) =>
            ed.id === selectedEdge ? { ...ed, label: e.target.value } : ed
          )
        );
      }
    },
    [selectedEdge, setEdges]
  );

  const handleLabelBlur = useCallback(() => {
    setSelectedEdge(null);
  }, []);

  const handleResetZoom = useCallback(() => {
    fitView({ padding: 0.2 });
  }, [fitView]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handlePaneContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const cursorElements = useMemo(() => {
    return Object.entries(cursors).map(([userId, cursorData]) => {
      if (userId === currentUser?.id) return null;
      return (
        <div
          key={userId}
          style={{
            position: 'absolute',
            left: cursorData.x,
            top: cursorData.y,
            pointerEvents: 'none',
            zIndex: 1000,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: cursorData.user.color,
              opacity: 0.7,
              boxShadow: `0 0 6px ${cursorData.user.color}`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              fontSize: '11px',
              backgroundColor: cursorData.user.color,
              color: '#fff',
              padding: '2px 6px',
              borderRadius: '4px',
              opacity: 0.8,
            }}
          >
            {cursorData.user.nickname}
          </div>
        </div>
      );
    });
  }, [cursors, currentUser]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={handleEdgeClick}
        onClick={handlePaneClick}
        onMouseMove={handleMouseMove}
        onPaneContextMenu={handlePaneContextMenu}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={3}
        panOnDrag={false}
        selectionOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#E0E0E0"
        />
        <Controls
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
          }}
        />
      </ReactFlow>

      {cursorElements}

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '10px',
          backgroundColor: '#fff',
          padding: '8px 16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 100,
        }}
      >
        <button
          onClick={handleResetZoom}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#4ECDC4',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          重置视图
        </button>
        <button
          onClick={handleFullscreen}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#45B7D1',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          全屏
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          backgroundColor: '#fff',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 100,
          minWidth: '140px',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>
          在线用户 ({users.length})
        </div>
        {users.map((user) => (
          <div
            key={user.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#666',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: user.color,
              }}
            />
            {user.nickname}
            {user.id === currentUser?.id && ' (我)'}
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#888',
          zIndex: 100,
        }}
      >
        双击添加便签 · 拖拽连接点连线 · 滚轮缩放
      </div>

      {selectedEdge && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#fff',
            padding: '8px 16px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 100,
          }}
        >
          <input
            type="text"
            value={edgeLabel}
            onChange={handleLabelChange}
            onBlur={handleLabelBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLabelBlur();
              }
            }}
            placeholder="输入连线标注..."
            style={{
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px',
              outline: 'none',
              width: '160px',
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [nickname, setNickname] = useState('');
  const [joined, setJoined] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    socketService.connect();

    const handleUserInfo = (user: User) => {
      setCurrentUser(user);
    };

    const handleUsersUpdate = (userList: User[]) => {
      setUsers(userList);
    };

    socketService.on('user-info', handleUserInfo);
    socketService.on('users-update', handleUsersUpdate);

    return () => {
      socketService.off('user-info', handleUserInfo);
      socketService.off('users-update', handleUsersUpdate);
    };
  }, []);

  const handleJoin = () => {
    if (!roomId.trim() || !nickname.trim()) return;
    socketService.joinRoom(roomId.trim(), nickname.trim());
    setJoined(true);
  };

  const handleGenerateRoomId = () => {
    setRoomId(uuidv4().slice(0, 8));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  if (!joined) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F5F5F5',
        }}
      >
        <div
          style={{
            backgroundColor: '#fff',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            width: '400px',
          }}
        >
          <h1
            style={{
              textAlign: 'center',
              color: '#333',
              marginBottom: '8px',
              fontSize: '28px',
            }}
          >
            IdeaLoom
          </h1>
          <p
            style={{
              textAlign: 'center',
              color: '#999',
              marginBottom: '30px',
              fontSize: '14px',
            }}
          >
            创意协作白板
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                color: '#666',
              }}
            >
              房间ID
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入房间ID"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleGenerateRoomId}
                style={{
                  padding: '10px 14px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#eee',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                }}
              >
                生成
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                color: '#666',
              }}
            >
              昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的昵称"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={!roomId.trim() || !nickname.trim()}
            style={{
              width: '100%',
              padding: '12px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#4ECDC4',
              color: '#fff',
              fontSize: '16px',
              cursor: roomId.trim() && nickname.trim() ? 'pointer' : 'not-allowed',
              opacity: roomId.trim() && nickname.trim() ? 1 : 0.5,
            }}
          >
            加入白板
          </button>

          <p
            style={{
              fontSize: '12px',
              color: '#999',
              textAlign: 'center',
              marginTop: '20px',
            }}
          >
            双击画布添加便签 · 拖拽连接点连线 · Ctrl+V粘贴图片
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#F5F5F5' }}>
      <ReactFlowProvider>
        <Whiteboard roomId={roomId} currentUser={currentUser} users={users} />
      </ReactFlowProvider>
    </div>
  );
};

export default App;
