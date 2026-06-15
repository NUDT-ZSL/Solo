import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  MindNode,
  Connection,
  MindMapData,
  VersionSnapshot,
  UserCursor,
  HistoryAction,
  NodeAction,
  ConnectionAction,
  RestoreAction,
  WSMessage,
  WSActionMessage,
  WSCursorMessage,
  WSInitMessage,
  WSVersionsMessage,
  WSUsersMessage,
  COLOR_PALETTE,
} from './types';
import {
  render,
  findNodeAt,
  findConnectionAt,
  pointInNode,
  pointNearNodeEdge,
  calculateNodeSize,
  RenderState,
} from './CanvasRenderer';

interface UndoRedoStack {
  undo: HistoryAction[];
  redo: HistoryAction[];
}

interface ToastMessage {
  id: string;
  text: string;
  createdAt: number;
}

const WS_URL = 'ws://localhost:3001/ws';
const MAX_HISTORY_STACK = 50;
const CURSOR_SEND_THROTTLE = 50;
const TOAST_DURATION = 1500;

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function invertAction(action: HistoryAction): HistoryAction | null {
  const now = Date.now();
  switch (action.type) {
    case 'node:create':
      return {
        type: 'node:delete',
        timestamp: now,
        userId: action.userId,
        description: `删除节点：${action.node.title}`,
        node: action.node,
      } as NodeAction;

    case 'node:delete':
      return {
        type: 'node:create',
        timestamp: now,
        userId: action.userId,
        description: `恢复节点：${action.node.title}`,
        node: action.node,
      } as NodeAction;

    case 'node:update':
      if (action.previousNode) {
        return {
          type: 'node:update',
          timestamp: now,
          userId: action.userId,
          description: `恢复编辑：${action.previousNode.title}`,
          node: action.previousNode,
          previousNode: action.node,
        } as NodeAction;
      }
      return null;

    case 'node:move':
      if (action.previousNode) {
        return {
          type: 'node:move',
          timestamp: now,
          userId: action.userId,
          description: `撤销移动：${action.node.title}`,
          node: action.previousNode,
          previousNode: action.node,
        } as NodeAction;
      }
      return null;

    case 'connection:create':
      return {
        type: 'connection:delete',
        timestamp: now,
        userId: action.userId,
        description: '删除连接',
        connection: action.connection,
      } as ConnectionAction;

    case 'connection:delete':
      return {
        type: 'connection:create',
        timestamp: now,
        userId: action.userId,
        description: '恢复连接',
        connection: action.connection,
      } as ConnectionAction;

    default:
      return null;
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cursorSendTimerRef = useRef<number | null>(null);
  const editCursorTimerRef = useRef<number | null>(null);
  const toastCleanupTimerRef = useRef<number | null>(null);

  const lastSendCursorRef = useRef<UserCursor | null>(null);

  const [wsConnected, setWsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [nodes, setNodes] = useState<MindNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  const [users, setUsers] = useState<UserCursor[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [editCursorVisible, setEditCursorVisible] = useState(true);
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

  const historyStackRef = useRef<UndoRedoStack>({ undo: [], redo: [] });

  const uiStateRef = useRef({
    hoveredNodeId: null as string | null,
    hoveredConnectionId: null as string | null,
    draggingNodeId: null as string | null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    connectingFromId: null as string | null,
    mouseX: 0,
    mouseY: 0,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const [, forceUpdate] = useState(0);

  const showToast = useCallback((text: string) => {
    const toast: ToastMessage = {
      id: uuidv4(),
      text,
      createdAt: Date.now(),
    };
    setToasts((prev) => [...prev, toast]);
  }, []);

  useEffect(() => {
    if (toastCleanupTimerRef.current) {
      window.clearInterval(toastCleanupTimerRef.current);
    }
    toastCleanupTimerRef.current = window.setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((t) => now - t.createdAt < TOAST_DURATION));
    }, 200);
    return () => {
      if (toastCleanupTimerRef.current) {
        window.clearInterval(toastCleanupTimerRef.current);
      }
    };
  }, []);

  const nodesRef = useRef<MindNode[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const usersRef = useRef<UserCursor[]>([]);
  const selectedNodeIdRef = useRef<string | null>(null);
  const editingNodeIdRef = useRef<string | null>(null);
  const connectingFromIdRef = useRef<string | null>(null);
  const previewVersionDataRef = useRef<MindMapData | null>(null);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { selectedNodeIdRef.current = selectedNodeId; }, [selectedNodeId]);
  useEffect(() => { editingNodeIdRef.current = editingNodeId; }, [editingNodeId]);
  useEffect(() => { connectingFromIdRef.current = uiStateRef.current.connectingFromId; });

  useEffect(() => {
    if (previewVersionId) {
      const ver = versions.find((v) => v.id === previewVersionId);
      previewVersionDataRef.current = ver ? ver.data : null;
    } else {
      previewVersionDataRef.current = null;
    }
  }, [previewVersionId, versions]);

  useEffect(() => {
    if (editingNodeId) {
      setEditCursorVisible(true);
      if (editCursorTimerRef.current) {
        window.clearInterval(editCursorTimerRef.current);
      }
      editCursorTimerRef.current = window.setInterval(() => {
        setEditCursorVisible((v) => !v);
      }, 500);
    } else {
      if (editCursorTimerRef.current) {
        window.clearInterval(editCursorTimerRef.current);
        editCursorTimerRef.current = null;
      }
    }
    return () => {
      if (editCursorTimerRef.current) {
        window.clearInterval(editCursorTimerRef.current);
      }
    };
  }, [editingNodeId]);

  const applyLocalAction = useCallback((action: HistoryAction, pushUndo: boolean = true) => {
    if (pushUndo) {
      historyStackRef.current.undo.push(action);
      if (historyStackRef.current.undo.length > MAX_HISTORY_STACK) {
        historyStackRef.current.undo.shift();
      }
      historyStackRef.current.redo = [];
    }

    switch (action.type) {
      case 'node:create':
        setNodes((prev) => [...prev, action.node]);
        break;
      case 'node:update':
      case 'node:move':
        setNodes((prev) =>
          prev.map((n) => (n.id === action.node.id ? action.node : n))
        );
        break;
      case 'node:delete':
        setNodes((prev) => prev.filter((n) => n.id !== action.node.id));
        setConnections((prev) =>
          prev.filter((c) => c.from !== action.node.id && c.to !== action.node.id)
        );
        setNodes((prev) =>
          prev.map((n) => (n.parentId === action.node.id ? { ...n, parentId: null } : n))
        );
        break;
      case 'connection:create':
        setConnections((prev) => [...prev, action.connection]);
        setNodes((prev) =>
          prev.map((n) =>
            n.id === action.connection.to ? { ...n, parentId: action.connection.from } : n
          )
        );
        break;
      case 'connection:delete':
        setConnections((prev) => prev.filter((c) => c.id !== action.connection.id));
        setNodes((prev) =>
          prev.map((n) =>
            n.id === action.connection.to && n.parentId === action.connection.from
              ? { ...n, parentId: null }
              : n
          )
        );
        break;
      case 'version:restore':
        setNodes(action.data.nodes);
        setConnections(action.data.connections);
        break;
    }
  }, []);

  const sendAction = useCallback((action: HistoryAction) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg: WSActionMessage = { type: 'action', action };
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const executeAction = useCallback(
    (action: HistoryAction, pushUndo: boolean = true) => {
      applyLocalAction(action, pushUndo);
      sendAction(action);
      showToast(action.description);
    },
    [applyLocalAction, sendAction, showToast]
  );

  const doUndo = useCallback(() => {
    const stack = historyStackRef.current;
    const action = stack.undo.pop();
    if (!action) return;

    const inverse = invertAction(action);
    if (!inverse) return;

    stack.redo.push(action);
    applyLocalAction(inverse, false);
    sendAction(inverse);
    showToast('撤销：' + action.description.replace(/^(新增|删除|编辑|移动|创建|恢复)/, '').trim());
  }, [applyLocalAction, sendAction, showToast]);

  const doRedo = useCallback(() => {
    const stack = historyStackRef.current;
    const action = stack.redo.pop();
    if (!action) return;

    stack.undo.push(action);
    applyLocalAction(action, false);
    sendAction(action);
    showToast('重做：' + action.description);
  }, [applyLocalAction, sendAction, showToast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          doRedo();
        } else {
          doUndo();
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!editingNodeIdRef.current && selectedNodeIdRef.current) {
          e.preventDefault();
          const node = nodesRef.current.find((n) => n.id === selectedNodeIdRef.current);
          if (node) {
            const action: NodeAction = {
              type: 'node:delete',
              timestamp: Date.now(),
              userId: currentUserId,
              description: `删除节点：${node.title}`,
              node,
            };
            executeAction(action);
            setSelectedNodeId(null);
          }
        }
      }
      if (e.key === 'Escape') {
        setEditingNodeId(null);
        uiStateRef.current.connectingFromId = null;
        setPreviewVersionId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doUndo, doRedo, executeAction, currentUserId]);

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          console.log('[WS] Connected');
        };

        ws.onmessage = (evt) => {
          try {
            const msg: WSMessage = JSON.parse(evt.data);
            handleWSMessage(msg);
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          console.log('[WS] Disconnected, retrying in 3s...');
          setTimeout(connect, 3000);
        };

        ws.onerror = (e) => {
          console.error('[WS] Error:', e);
        };
      } catch (e) {
        console.error('[WS] Connect failed:', e);
        setTimeout(connect, 3000);
      }
    };

    const handleWSMessage = (msg: WSMessage) => {
      switch (msg.type) {
        case 'init': {
          const initMsg = msg as WSInitMessage;
          setCurrentUserId(initMsg.userId);
          setNodes(initMsg.data.nodes);
          setConnections(initMsg.data.connections);
          setVersions(initMsg.versions);
          setUsers(initMsg.users);
          historyStackRef.current = { undo: [], redo: [] };
          break;
        }
        case 'action': {
          const actionMsg = msg as WSActionMessage;
          applyLocalAction(actionMsg.action, false);
          break;
        }
        case 'versions': {
          const vMsg = msg as WSVersionsMessage;
          setVersions(vMsg.versions);
          break;
        }
        case 'users': {
          const uMsg = msg as WSUsersMessage;
          setUsers(uMsg.users);
          break;
        }
      }
    };

    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [applyLocalAction]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      forceUpdate((n) => n + 1);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = (time: number) => {
      const state = uiStateRef.current;
      const renderNodes = previewVersionDataRef.current
        ? previewVersionDataRef.current.nodes
        : nodesRef.current;
      const renderConnections = previewVersionDataRef.current
        ? previewVersionDataRef.current.connections
        : connectionsRef.current;

      const renderState: RenderState = {
        nodes: renderNodes,
        connections: renderConnections,
        users: usersRef.current,
        selectedNodeId: selectedNodeIdRef.current,
        editingNodeId: editingNodeIdRef.current,
        hoveredNodeId: state.hoveredNodeId,
        hoveredConnectionId: state.hoveredConnectionId,
        draggingNodeId: state.draggingNodeId,
        connectingFromId: state.connectingFromId,
        mouseX: state.mouseX,
        mouseY: state.mouseY,
        scale: state.scale,
        offsetX: state.offsetX,
        offsetY: state.offsetY,
        editCursorVisible,
        editCursorPos: 0,
      };

      render(
        ctx,
        renderState,
        currentUserId,
        window.innerWidth,
        window.innerHeight,
        time
      );
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentUserId, editCursorVisible]);

  const sendCursor = useCallback(
    (x: number, y: number) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      if (!currentUserId) return;

      if (cursorSendTimerRef.current) return;

      cursorSendTimerRef.current = window.setTimeout(() => {
        cursorSendTimerRef.current = null;
        const cursor: UserCursor = {
          userId: currentUserId,
          userName: '',
          x: uiStateRef.current.mouseX,
          y: uiStateRef.current.mouseY,
          color: '',
        };
        const msg: WSCursorMessage = { type: 'cursor', cursor };
        try {
          wsRef.current?.send(JSON.stringify(msg));
        } catch {}
      }, CURSOR_SEND_THROTTLE);
    },
    [currentUserId]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      uiStateRef.current.mouseX = x;
      uiStateRef.current.mouseY = y;

      sendCursor(x, y);

      if (uiStateRef.current.draggingNodeId) {
        const nodeId = uiStateRef.current.draggingNodeId;
        const oldNode = nodesRef.current.find((n) => n.id === nodeId);
        if (oldNode) {
          const newX = Math.max(0, x - uiStateRef.current.dragOffsetX);
          const newY = Math.max(0, y - uiStateRef.current.dragOffsetY);

          if (Math.abs(newX - oldNode.x) > 0.5 || Math.abs(newY - oldNode.y) > 0.5) {
            const newNode: MindNode = { ...oldNode, x: newX, y: newY, updatedAt: Date.now() };
            setNodes((prev) => prev.map((n) => (n.id === nodeId ? newNode : n)));
          }
        }
        return;
      }

      const hoveredNode = findNodeAt(nodesRef.current, x, y);
      uiStateRef.current.hoveredNodeId = hoveredNode ? hoveredNode.id : null;

      if (!hoveredNode) {
        const hoveredConn = findConnectionAt(connectionsRef.current, nodesRef.current, x, y);
        uiStateRef.current.hoveredConnectionId = hoveredConn ? hoveredConn.id : null;
      } else {
        uiStateRef.current.hoveredConnectionId = null;
      }
    },
    [sendCursor]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (editingNodeIdRef.current) {
        setEditingNodeId(null);
      }
      setColorPickerOpen(null);

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (e.button === 2) return;

      const node = findNodeAt(nodesRef.current, x, y);
      if (node) {
        if (uiStateRef.current.connectingFromId && uiStateRef.current.connectingFromId !== node.id) {
          const fromId = uiStateRef.current.connectingFromId;
          const toId = node.id;
          const exists = connectionsRef.current.some(
            (c) =>
              (c.from === fromId && c.to === toId) ||
              (c.from === toId && c.to === fromId)
          );
          if (!exists) {
            const connection: Connection = { id: uuidv4(), from: fromId, to: toId };
            const action: ConnectionAction = {
              type: 'connection:create',
              timestamp: Date.now(),
              userId: currentUserId,
              description: '创建连接',
              connection,
            };
            executeAction(action);
          }
          uiStateRef.current.connectingFromId = null;
          return;
        }

        const nearEdge = pointNearNodeEdge(x, y, node, 10);
        if (nearEdge && !editingNodeIdRef.current) {
          uiStateRef.current.connectingFromId = node.id;
          setSelectedNodeId(node.id);
          return;
        }

        uiStateRef.current.draggingNodeId = node.id;
        uiStateRef.current.dragOffsetX = x - node.x;
        uiStateRef.current.dragOffsetY = y - node.y;
        setSelectedNodeId(node.id);
        return;
      }

      setSelectedNodeId(null);
    },
    [executeAction, currentUserId]
  );

  const handleMouseUp = useCallback(() => {
    if (uiStateRef.current.draggingNodeId) {
      const nodeId = uiStateRef.current.draggingNodeId;
      const currentNode = nodesRef.current.find((n) => n.id === nodeId);
      uiStateRef.current.draggingNodeId = null;

      const startX = uiStateRef.current.dragOffsetX;
      if (currentNode && (startX !== 0 || uiStateRef.current.dragOffsetY !== 0)) {
        const fromNode = historyStackRef.current.undo[historyStackRef.current.undo.length - 1];
        const prev = fromNode && 'previousNode' in fromNode ? fromNode.previousNode : undefined;
        const originalNode = prev || { ...currentNode };

        const moved = currentNode;
        if (Math.abs(moved.x - originalNode.x) > 1 || Math.abs(moved.y - originalNode.y) > 1) {
          const action: NodeAction = {
            type: 'node:move',
            timestamp: Date.now(),
            userId: currentUserId,
            description: `移动节点：${moved.title}`,
            node: moved,
            previousNode: originalNode,
          };
          executeAction(action);
        }
      }
      uiStateRef.current.dragOffsetX = 0;
      uiStateRef.current.dragOffsetY = 0;
    }
  }, [executeAction, currentUserId]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const node = findNodeAt(nodesRef.current, x, y);
      if (node && !uiStateRef.current.connectingFromId) {
        if (!editingNodeIdRef.current) {
          setTimeout(() => {
            if (selectedNodeIdRef.current === node.id && !editingNodeIdRef.current) {
              setEditingNodeId(node.id);
              setEditText(node.title);
            }
          }, 200);
        }
      }
    },
    []
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const existingNode = findNodeAt(nodesRef.current, x, y);
      if (existingNode) {
        setEditingNodeId(existingNode.id);
        setEditText(existingNode.title);
        setSelectedNodeId(existingNode.id);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
      const tempTitle = '新节点';
      const size = calculateNodeSize(ctx, tempTitle);

      const newNode: MindNode = {
        id: uuidv4(),
        title: tempTitle,
        x: x - size.width / 2,
        y: y - size.height / 2,
        width: size.width,
        height: size.height,
        color,
        parentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const action: NodeAction = {
        type: 'node:create',
        timestamp: Date.now(),
        userId: currentUserId,
        description: `新增节点：${tempTitle}`,
        node: newNode,
      };
      executeAction(action);
      setSelectedNodeId(newNode.id);
      setEditingNodeId(newNode.id);
      setEditText(tempTitle);
    },
    [executeAction, currentUserId]
  );

  const finishEditing = useCallback(() => {
    const nodeId = editingNodeIdRef.current;
    if (!nodeId) return;

    const oldNode = nodesRef.current.find((n) => n.id === nodeId);
    if (!oldNode) {
      setEditingNodeId(null);
      return;
    }

    const newTitle = editText.trim() || '未命名节点';
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const size = ctx ? calculateNodeSize(ctx, newTitle) : { width: oldNode.width, height: oldNode.height };

    const newNode: MindNode = {
      ...oldNode,
      title: newTitle,
      width: size.width,
      height: size.height,
      updatedAt: Date.now(),
    };

    if (oldNode.title !== newTitle || oldNode.width !== newNode.width || oldNode.height !== newNode.height) {
      const action: NodeAction = {
        type: 'node:update',
        timestamp: Date.now(),
        userId: currentUserId,
        description: `编辑节点：${newTitle}`,
        node: newNode,
        previousNode: oldNode,
      };
      executeAction(action);
    }
    setEditingNodeId(null);
    setEditText('');
  }, [editText, executeAction, currentUserId]);

  const handleEditingKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishEditing();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditingNodeId(null);
        setEditText('');
      }
    },
    [finishEditing]
  );

  const handleColorSelect = useCallback(
    (color: string) => {
      const nodeId = selectedNodeIdRef.current;
      if (!nodeId) return;
      const oldNode = nodesRef.current.find((n) => n.id === nodeId);
      if (!oldNode) return;

      const newNode: MindNode = { ...oldNode, color, updatedAt: Date.now() };
      const action: NodeAction = {
        type: 'node:update',
        timestamp: Date.now(),
        userId: currentUserId,
        description: `修改颜色：${newNode.title}`,
        node: newNode,
        previousNode: oldNode,
      };
      executeAction(action);
      setColorPickerOpen(null);
    },
    [executeAction, currentUserId]
  );

  const restoreVersion = useCallback(
    (version: VersionSnapshot) => {
      const action: RestoreAction = {
        type: 'version:restore',
        timestamp: Date.now(),
        userId: currentUserId,
        description: `恢复到版本：${formatTimestamp(version.timestamp)}`,
        versionId: version.id,
        data: JSON.parse(JSON.stringify(version.data)),
      };
      executeAction(action);
      historyStackRef.current = { undo: [], redo: [] };
      setPreviewVersionId(null);
      setVersionPanelOpen(false);
    },
    [executeAction, currentUserId]
  );

  const onlineCount = users.length + (wsConnected ? 1 : 0);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: uiStateRef.current.connectingFromId ? 'crosshair' : 'default' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          gap: 8,
          zIndex: 10,
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            background: 'rgba(22, 33, 62, 0.95)',
            borderRadius: 12,
            padding: 6,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            gap: 4,
          }}
        >
          <button
            onClick={doUndo}
            title="撤销 (Ctrl+Z)"
            style={{
              width: 40,
              height: 40,
              background: 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#fff',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(78, 204, 163, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ↩
          </button>
          <button
            onClick={doRedo}
            title="重做 (Ctrl+Shift+Z)"
            style={{
              width: 40,
              height: 40,
              background: 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#fff',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(78, 204, 163, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ↪
          </button>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '6px 4px' }} />
          <button
            onClick={() => setVersionPanelOpen((v) => !v)}
            title="版本历史"
            style={{
              width: 40,
              height: 40,
              background: versionPanelOpen ? 'rgba(78, 204, 163, 0.3)' : 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#fff',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(78, 204, 163, 0.2)')}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = versionPanelOpen ? 'rgba(78, 204, 163, 0.3)' : 'transparent')
            }
          >
            📜
          </button>
        </div>

        {selectedNodeId && !editingNodeId && (
          <div
            style={{
              display: 'flex',
              background: 'rgba(22, 33, 62, 0.95)',
              borderRadius: 12,
              padding: 6,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              gap: 4,
              position: 'relative',
            }}
          >
            <button
              onClick={() => {
                const n = nodes.find((nd) => nd.id === selectedNodeId);
                if (n) {
                  setEditingNodeId(n.id);
                  setEditText(n.title);
                }
              }}
              title="编辑节点"
              style={{
                width: 40,
                height: 40,
                background: 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: '#fff',
                fontSize: 16,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(78, 204, 163, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              ✏️
            </button>
            <button
              onClick={() => setColorPickerOpen(colorPickerOpen ? null : selectedNodeId)}
              title="修改颜色"
              style={{
                width: 40,
                height: 40,
                background: colorPickerOpen ? 'rgba(78, 204, 163, 0.3)' : 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: nodes.find((n) => n.id === selectedNodeId)?.color || '#fff',
                fontSize: 16,
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(78, 204, 163, 0.2)')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = colorPickerOpen ? 'rgba(78, 204, 163, 0.3)' : 'transparent')
              }
            >
              ●
            </button>
            <button
              onClick={() => {
                const n = nodes.find((nd) => nd.id === selectedNodeId);
                if (n) {
                  uiStateRef.current.connectingFromId = n.id;
                  showToast('从节点边缘拖到目标节点建立连接');
                }
              }}
              title="创建连接"
              style={{
                width: 40,
                height: 40,
                background: uiStateRef.current.connectingFromId ? 'rgba(78, 204, 163, 0.3)' : 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: '#fff',
                fontSize: 16,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(78, 204, 163, 0.2)')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = uiStateRef.current.connectingFromId
                  ? 'rgba(78, 204, 163, 0.3)'
                  : 'transparent')
              }
            >
              🔗
            </button>
            <button
              onClick={() => {
                const n = nodes.find((nd) => nd.id === selectedNodeId);
                if (n) {
                  const action: NodeAction = {
                    type: 'node:delete',
                    timestamp: Date.now(),
                    userId: currentUserId,
                    description: `删除节点：${n.title}`,
                    node: n,
                  };
                  executeAction(action);
                  setSelectedNodeId(null);
                }
              }}
              title="删除节点 (Delete)"
              style={{
                width: 40,
                height: 40,
                background: 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: '#ff6b6b',
                fontSize: 16,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              🗑️
            </button>

            {colorPickerOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 48,
                  background: 'rgba(22, 33, 62, 0.98)',
                  borderRadius: 12,
                  padding: 10,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  width: 140,
                }}
              >
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleColorSelect(c)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: c,
                      border: nodes.find((n) => n.id === selectedNodeId)?.color === c ? '2px solid #fff' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      transform: 'scale(1)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(22, 33, 62, 0.95)',
            borderRadius: 12,
            padding: '8px 14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: onlineCount >= 2 ? '#4ecca3' : wsConnected ? '#f39c12' : '#e74c3c',
              boxShadow: `0 0 ${onlineCount >= 2 ? 8 : 4}px ${onlineCount >= 2 ? '#4ecca3' : wsConnected ? '#f39c12' : '#e74c3c'}`,
              animation: wsConnected ? 'pulse 2s infinite' : 'none',
            }}
          />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
            在线 {onlineCount} 人
          </span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 20,
          zIndex: 5,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const age = Date.now() - t.createdAt;
          const opacity = age < TOAST_DURATION - 300 ? 1 : Math.max(0, (TOAST_DURATION - age) / 300);
          const translateY = Math.max(0, (TOAST_DURATION - age) / TOAST_DURATION * 10 - 10);
          return (
            <div
              key={t.id}
              style={{
                background: 'rgba(15, 52, 96, 0.95)',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: 8,
                marginTop: 8,
                fontSize: 13,
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                opacity,
                transform: `translateY(${translateY}px)`,
                transition: 'all 0.3s ease',
                borderLeft: '3px solid #4ecca3',
              }}
            >
              {t.text}
            </div>
          );
        })}
      </div>

      {versionPanelOpen && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              zIndex: 20,
              backdropFilter: 'blur(2px)',
            }}
            onClick={() => {
              setVersionPanelOpen(false);
              setPreviewVersionId(null);
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 320,
              height: '100%',
              background: '#0f3460',
              zIndex: 30,
              boxShadow: '-8px 0 30px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideIn 0.3s ease',
            }}
          >
            <div
              style={{
                padding: '20px 20px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: 0 }}>版本历史</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '4px 0 0' }}>
                  共 {versions.length} 个版本
                </p>
              </div>
              <button
                onClick={() => {
                  setVersionPanelOpen(false);
                  setPreviewVersionId(null);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 16,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 12,
              }}
            >
              {versions.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: 40 }}>
                  暂无版本记录
                </div>
              ) : (
                [...versions].reverse().map((ver, idx) => {
                  const isLatest = idx === 0;
                  const isPreview = previewVersionId === ver.id;
                  return (
                    <div
                      key={ver.id}
                      style={{
                        background: isPreview ? 'rgba(78, 204, 163, 0.15)' : 'rgba(255,255,255,0.04)',
                        borderRadius: 10,
                        padding: 14,
                        marginBottom: 10,
                        border: `1px solid ${isPreview ? 'rgba(78, 204, 163, 0.5)' : 'rgba(255,255,255,0.08)'}`,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isPreview) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isPreview) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 8,
                        }}
                      >
                        <div>
                          <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
                            {formatTimestamp(ver.timestamp)}
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>
                            {ver.description}
                          </div>
                        </div>
                        {isLatest && (
                          <span
                            style={{
                              background: 'rgba(78, 204, 163, 0.2)',
                              color: '#4ecca3',
                              fontSize: 10,
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontWeight: 600,
                            }}
                          >
                            最新
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: 11,
                          marginBottom: 10,
                        }}
                      >
                        {ver.data.nodes.length} 个节点 · {ver.data.connections.length} 条连接
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() =>
                            setPreviewVersionId(previewVersionId === ver.id ? null : ver.id)
                          }
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: 6,
                            background: isPreview
                              ? 'rgba(78, 204, 163, 0.4)'
                              : 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: '#fff',
                            fontSize: 12,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontWeight: 500,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = isPreview
                              ? 'rgba(78, 204, 163, 0.5)'
                              : 'rgba(255,255,255,0.18)')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = isPreview
                              ? 'rgba(78, 204, 163, 0.4)'
                              : 'rgba(255,255,255,0.1)')
                          }
                        >
                          {isPreview ? '取消预览' : '预览'}
                        </button>
                        <button
                          onClick={() => restoreVersion(ver)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: 6,
                            background: '#4ecca3',
                            border: 'none',
                            color: '#0f3460',
                            fontSize: 12,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontWeight: 600,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = '#5edbb3')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = '#4ecca3')
                          }
                        >
                          恢复
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {editingNodeId && (() => {
        const node = nodes.find((n) => n.id === editingNodeId);
        if (!node) return null;
        return (
          <input
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value.slice(0, 50))}
            onKeyDown={handleEditingKeyDown}
            onBlur={finishEditing}
            maxLength={50}
            style={{
              position: 'absolute',
              left: node.x + 8,
              top: node.y + 8,
              width: node.width - 16,
              height: node.height - 16,
              background: 'transparent',
              border: `2px solid ${node.color}`,
              borderRadius: 6,
              color: '#fff',
              fontSize: 14,
              textAlign: 'center',
              padding: '0 8px',
              outline: 'none',
              zIndex: 100,
              caretColor: '#fff',
              fontFamily: 'inherit',
              boxShadow: '0 0 4px #4ecca3',
            }}
            ref={(input) => {
              if (input) {
                input.focus();
                input.setSelectionRange(0, input.value.length);
              }
            }}
          />
        );
      })()}

      {previewVersionId && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(243, 156, 18, 0.95)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 8px 30px rgba(243, 156, 18, 0.4)',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span>👁️ 正在预览版本：{formatTimestamp(versions.find((v) => v.id === previewVersionId)?.timestamp || 0)}</span>
          <button
            onClick={() => setPreviewVersionId(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            退出预览
          </button>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          color: 'rgba(255,255,255,0.4)',
          fontSize: 11,
          zIndex: 5,
          lineHeight: 1.6,
        }}
      >
        <div>💡 双击空白创建节点 · 单击编辑 · 从节点边缘拖出连线</div>
        <div>⌨️ Ctrl+Z 撤销 · Ctrl+Shift+Z 重做 · Delete 删除节点</div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        *::selection { background: rgba(78, 204, 163, 0.3); }
      `}</style>
    </div>
  );
}
