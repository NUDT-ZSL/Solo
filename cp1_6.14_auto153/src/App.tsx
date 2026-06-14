import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  CanvasEngine,
  CanvasElement,
  BrushElement,
  RectangleElement,
  CircleElement,
  TextElement,
  StickyNoteElement,
  ToolType,
  Point,
  generateId
} from './canvas-engine';
import { Toolbar } from './toolbar';

interface RemoteUser {
  userId: string;
  userName: string;
  color: string;
  cursor: { x: number; y: number };
  lastSeen: number;
}

const USER_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function generateUserName(): string {
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
  return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100);
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(new CanvasEngine());
  const socketRef = useRef<Socket | null>(null);
  const rafRef = useRef<number | null>(null);
  const cursorRafRef = useRef<number | null>(null);

  const [currentTool, setCurrentTool] = useState<ToolType>('brush');
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushWidth, setBrushWidth] = useState(4);
  const [shapeFillOpacity, setShapeFillOpacity] = useState(30);
  const [fontSize, setFontSize] = useState(16);

  const [viewTransform, setViewTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const targetTransformRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const transformAnimatingRef = useRef(false);

  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [notes, setNotes] = useState<StickyNoteElement[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const currentDrawingRef = useRef<CanvasElement | null>(null);
  const drawStartPointRef = useRef<Point | null>(null);
  const panStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const [connected, setConnected] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<Map<string, RemoteUser>>(new Map());
  const [userId] = useState(() => generateUserId());
  const [userName] = useState(() => generateUserName());
  const [userColor] = useState(() => getUserColor(userId));
  const roomIdRef = useRef('default-room');

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const noteDragStateRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    noteStartX: number;
    noteStartY: number;
  } | null>(null);
  const noteResizeStateRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const noteRotateStateRef = useRef<{
    id: string;
    startAngle: number;
    startRotation: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const [, forceUpdate] = useState(0);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    const canvasElements = elements.filter(el => el.type !== 'sticky-note') as Exclude<CanvasElement, StickyNoteElement>[];
    engineRef.current.render(ctx, canvasElements, viewTransform, width, height);
  }, [elements, viewTransform]);

  const animateTransform = useCallback(() => {
    const target = targetTransformRef.current;
    let changed = false;

    setViewTransform(prev => {
      const dx = target.offsetX - prev.offsetX;
      const dy = target.offsetY - prev.offsetY;
      const ds = target.scale - prev.scale;

      const threshold = 0.01;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold && Math.abs(ds) < threshold) {
        transformAnimatingRef.current = false;
        return target;
      }

      changed = true;
      const easing = 1 - Math.pow(0.001, 1 / 60);
      return {
        offsetX: prev.offsetX + dx * easing,
        offsetY: prev.offsetY + dy * easing,
        scale: prev.scale + ds * easing
      };
    });

    if (changed) {
      rafRef.current = requestAnimationFrame(animateTransform);
    }
  }, []);

  const setTargetTransform = useCallback((transform: { scale: number; offsetX: number; offsetY: number }) => {
    targetTransformRef.current = transform;
    if (!transformAnimatingRef.current) {
      transformAnimatingRef.current = true;
      rafRef.current = requestAnimationFrame(animateTransform);
    }
  }, [animateTransform]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    if (viewTransform.offsetX === 0 && viewTransform.offsetY === 0 && viewTransform.scale === 1) {
      const centerX = width / 2;
      const centerY = height / 2;
      setViewTransform({ scale: 1, offsetX: centerX, offsetY: centerY });
      targetTransformRef.current = { scale: 1, offsetX: centerX, offsetY: centerY };
    }
  }, [viewTransform]);

  useEffect(() => {
    const unsubscribe = engineRef.current.subscribe(() => {
      setElements(engineRef.current.getElements());
      setNotes(engineRef.current.getElements().filter(el => el.type === 'sticky-note') as StickyNoteElement[]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const socket = io('/', {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', { roomId: roomIdRef.current, userId, userName });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('room-state', (data: { elements: CanvasElement[] }) => {
      if (data.elements && data.elements.length > 0) {
        engineRef.current.setElements(data.elements);
      }
    });

    socket.on('draw', (data: { elementId: string; element: CanvasElement; userId: string }) => {
      if (data.userId !== userId) {
        const el = { ...data.element, fadeIn: true };
        engineRef.current.addElement(el, false);
        setTimeout(() => {
          engineRef.current.updateElement(data.elementId, { fadeIn: false });
        }, 300);
      }
    });

    socket.on('move-element', (data: { elementId: string; x: number; y: number; rotation?: number; userId: string }) => {
      if (data.userId !== userId) {
        const updates: Partial<CanvasElement> = { x: data.x, y: data.y };
        if (data.rotation !== undefined) updates.rotation = data.rotation;
        const elements = engineRef.current.getElements();
        const idx = elements.findIndex(e => e.id === data.elementId);
        if (idx !== -1) {
          const newElements = [...elements];
          newElements[idx] = { ...newElements[idx], ...updates } as CanvasElement;
          setElements(newElements);
          setNotes(newElements.filter(el => el.type === 'sticky-note') as StickyNoteElement[]);
        }
      }
    });

    socket.on('update-note', (data: { elementId: string; text?: string; width?: number; height?: number; x?: number; y?: number; rotation?: number; userId: string }) => {
      if (data.userId !== userId) {
        const elements = engineRef.current.getElements();
        const idx = elements.findIndex(e => e.id === data.elementId);
        if (idx !== -1) {
          const newElements = [...elements];
          const updates: Partial<StickyNoteElement> = {};
          if (data.text !== undefined) updates.text = data.text;
          if (data.width !== undefined) updates.width = data.width;
          if (data.height !== undefined) updates.height = data.height;
          if (data.x !== undefined) updates.x = data.x;
          if (data.y !== undefined) updates.y = data.y;
          if (data.rotation !== undefined) updates.rotation = data.rotation;
          newElements[idx] = { ...newElements[idx], ...updates } as StickyNoteElement;
          setElements(newElements);
          setNotes(newElements.filter(el => el.type === 'sticky-note') as StickyNoteElement[]);
        }
      }
    });

    socket.on('delete-element', (data: { elementId: string; userId: string }) => {
      if (data.userId !== userId) {
        engineRef.current.removeElement(data.elementId);
      }
    });

    socket.on('user-joined', (data: { userId: string; userName: string }) => {
      if (data.userId !== userId) {
        setRemoteUsers(prev => {
          const next = new Map(prev);
          next.set(data.userId, {
            userId: data.userId,
            userName: data.userName,
            color: getUserColor(data.userId),
            cursor: { x: 0, y: 0 },
            lastSeen: Date.now()
          });
          return next;
        });
      }
    });

    socket.on('user-left', (data: { userId: string }) => {
      setRemoteUsers(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

    socket.on('cursor-move', (data: { userId: string; x: number; y: number; color: string }) => {
      if (data.userId !== userId) {
        setRemoteUsers(prev => {
          const user = prev.get(data.userId);
          if (user) {
            const next = new Map(prev);
            next.set(data.userId, { ...user, cursor: { x: data.x, y: data.y }, lastSeen: Date.now() });
            return next;
          }
          return prev;
        });
      }
    });

    return () => {
      socket.emit('leave-room', { roomId: roomIdRef.current, userId });
      socket.disconnect();
    };
  }, [userId, userName]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemoteUsers(prev => {
        const now = Date.now();
        let changed = false;
        const next = new Map(prev);
        for (const [id, user] of next) {
          if (now - user.lastSeen > 10000) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    return engineRef.current.screenToWorld(screenX, screenY, viewTransform);
  }, [viewTransform]);

  const getCanvasPosition = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
  }, [screenToWorld]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldBefore = engineRef.current.screenToWorld(mouseX, mouseY, viewTransform);

    const delta = -e.deltaY * 0.001;
    const newScale = Math.max(0.1, Math.min(5, viewTransform.scale * (1 + delta)));

    const newTransform = { ...targetTransformRef.current, scale: newScale };
    const worldAfter = engineRef.current.screenToWorld(mouseX, mouseY, newTransform);

    newTransform.offsetX += (worldAfter.x - worldBefore.x) * newScale;
    newTransform.offsetY += (worldAfter.y - worldBefore.y) * newScale;

    setTargetTransform(newTransform);
  }, [viewTransform, setTargetTransform]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: targetTransformRef.current.offsetX,
        offsetY: targetTransformRef.current.offsetY
      };
      return;
    }

    if (e.button !== 0) return;
    if (currentTool === 'select') return;

    const pos = getCanvasPosition(e);

    if (currentTool === 'sticky-note') {
      const note: StickyNoteElement = {
        id: generateId(),
        type: 'sticky-note',
        x: pos.x,
        y: pos.y,
        rotation: 0,
        width: 200,
        height: 150,
        text: '',
        backgroundColor: '#fff3cd',
        userId,
        timestamp: Date.now(),
        fadeIn: true
      };
      engineRef.current.addElement(note);
      socketRef.current?.emit('draw', {
        roomId: roomIdRef.current,
        elementId: note.id,
        element: note,
        userId,
        timestamp: Date.now()
      });
      setSelectedNoteId(note.id);
      setTimeout(() => {
        const el = engineRef.current.getElements().find(x => x.id === note.id);
        if (el && (el as StickyNoteElement).fadeIn) {
          engineRef.current.updateElement(note.id, { fadeIn: false });
        }
      }, 300);
      return;
    }

    if (currentTool === 'text') {
      const text = prompt('请输入文字:');
      if (text) {
        const textEl: TextElement = {
          id: generateId(),
          type: 'text',
          x: pos.x,
          y: pos.y,
          rotation: 0,
          text,
          fontSize,
          color: brushColor,
          userId,
          timestamp: Date.now()
        };
        engineRef.current.addElement(textEl);
        socketRef.current?.emit('draw', {
          roomId: roomIdRef.current,
          elementId: textEl.id,
          element: textEl,
          userId,
          timestamp: Date.now()
        });
      }
      return;
    }

    setIsDrawing(true);
    drawStartPointRef.current = pos;

    if (currentTool === 'brush') {
      const brush: BrushElement = {
        id: generateId(),
        type: 'brush',
        x: pos.x,
        y: pos.y,
        rotation: 0,
        points: [pos],
        color: brushColor,
        width: brushWidth,
        userId,
        timestamp: Date.now()
      };
      currentDrawingRef.current = brush;
      engineRef.current.addElement(brush, false);
    } else if (currentTool === 'rectangle') {
      const rect: RectangleElement = {
        id: generateId(),
        type: 'rectangle',
        x: pos.x,
        y: pos.y,
        rotation: 0,
        width: 0,
        height: 0,
        borderColor: brushColor,
        borderWidth: 2,
        fillColor: brushColor,
        fillOpacity: shapeFillOpacity,
        userId,
        timestamp: Date.now()
      };
      currentDrawingRef.current = rect;
      engineRef.current.addElement(rect, false);
    } else if (currentTool === 'circle') {
      const circle: CircleElement = {
        id: generateId(),
        type: 'circle',
        x: pos.x,
        y: pos.y,
        rotation: 0,
        radiusX: 0,
        radiusY: 0,
        borderColor: brushColor,
        borderWidth: 2,
        fillColor: brushColor,
        fillOpacity: shapeFillOpacity,
        userId,
        timestamp: Date.now()
      };
      currentDrawingRef.current = circle;
      engineRef.current.addElement(circle, false);
    } else if (currentTool === 'eraser') {
      currentDrawingRef.current = {
        id: generateId(),
        type: 'brush',
        x: pos.x,
        y: pos.y,
        rotation: 0,
        points: [pos],
        color: '#f8fafc',
        width: brushWidth * 3,
        userId,
        timestamp: Date.now()
      } as BrushElement;
      engineRef.current.addElement(currentDrawingRef.current, false);
    }
  }, [currentTool, brushColor, brushWidth, shapeFillOpacity, fontSize, userId, getCanvasPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setTargetTransform({
        ...targetTransformRef.current,
        offsetX: panStartRef.current.offsetX + dx,
        offsetY: panStartRef.current.offsetY + dy
      });
    }

    if (isDrawing && currentDrawingRef.current) {
      const pos = getCanvasPosition(e);
      const el = currentDrawingRef.current;

      if (el.type === 'brush') {
        const brush = el as BrushElement;
        brush.points.push(pos);
        brush.x = brush.points[0].x;
        brush.y = brush.points[0].y;
        const newElements = engineRef.current.getElements().map(e =>
          e.id === brush.id ? { ...brush, points: [...brush.points] } as CanvasElement : e
        );
        setElements(newElements);
        setNotes(newElements.filter(x => x.type === 'sticky-note') as StickyNoteElement[]);
      } else if (el.type === 'rectangle') {
        const start = drawStartPointRef.current!;
        const rect = el as RectangleElement;
        rect.x = Math.min(pos.x, start.x);
        rect.y = Math.min(pos.y, start.y);
        rect.width = Math.abs(pos.x - start.x);
        rect.height = Math.abs(pos.y - start.y);
        const newElements = engineRef.current.getElements().map(e =>
          e.id === rect.id ? { ...rect } as CanvasElement : e
        );
        setElements(newElements);
        setNotes(newElements.filter(x => x.type === 'sticky-note') as StickyNoteElement[]);
      } else if (el.type === 'circle') {
        const start = drawStartPointRef.current!;
        const circle = el as CircleElement;
        const centerX = (pos.x + start.x) / 2;
        const centerY = (pos.y + start.y) / 2;
        circle.x = centerX;
        circle.y = centerY;
        circle.radiusX = Math.abs(pos.x - start.x) / 2;
        circle.radiusY = Math.abs(pos.y - start.y) / 2;
        const newElements = engineRef.current.getElements().map(e =>
          e.id === circle.id ? { ...circle } as CanvasElement : e
        );
        setElements(newElements);
        setNotes(newElements.filter(x => x.type === 'sticky-note') as StickyNoteElement[]);
      }
    }

    if (socketRef.current && (isDrawing || isPanning || true)) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        socketRef.current.emit('cursor-move', {
          roomId: roomIdRef.current,
          userId,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          color: userColor
        });
      }
    }

    if (noteDragStateRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const state = noteDragStateRef.current;
      const dx = pos.x - state.startX;
      const dy = pos.y - state.startY;
      const newX = state.noteStartX + dx;
      const newY = state.noteStartY + dy;

      const elements = engineRef.current.getElements();
      const idx = elements.findIndex(el => el.id === state.id);
      if (idx !== -1) {
        const newElements = [...elements];
        newElements[idx] = { ...newElements[idx], x: newX, y: newY } as CanvasElement;
        setElements(newElements);
        setNotes(newElements.filter(el => el.type === 'sticky-note') as StickyNoteElement[]);
      }

      socketRef.current?.emit('move-element', {
        roomId: roomIdRef.current,
        elementId: state.id,
        x: newX,
        y: newY,
        userId
      });
    }

    if (noteResizeStateRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const state = noteResizeStateRef.current;
      const dx = (e.clientX - rect.left - state.startX) / viewTransform.scale;
      const dy = (e.clientY - rect.top - state.startY) / viewTransform.scale;
      const newWidth = Math.max(100, state.startWidth + dx);
      const newHeight = Math.max(80, state.startHeight + dy);

      const elements = engineRef.current.getElements();
      const idx = elements.findIndex(el => el.id === state.id);
      if (idx !== -1) {
        const newElements = [...elements];
        newElements[idx] = { ...newElements[idx], width: newWidth, height: newHeight } as StickyNoteElement;
        setElements(newElements);
        setNotes(newElements.filter(el => el.type === 'sticky-note') as StickyNoteElement[]);
      }

      socketRef.current?.emit('update-note', {
        roomId: roomIdRef.current,
        elementId: state.id,
        width: newWidth,
        height: newHeight,
        userId
      });
    }

    if (noteRotateStateRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const state = noteRotateStateRef.current;
      const angle = Math.atan2(
        e.clientY - rect.top - state.centerY,
        e.clientX - rect.left - state.centerX
      ) * 180 / Math.PI;
      const newRotation = state.startRotation + (angle - state.startAngle);

      const elements = engineRef.current.getElements();
      const idx = elements.findIndex(el => el.id === state.id);
      if (idx !== -1) {
        const newElements = [...elements];
        newElements[idx] = { ...newElements[idx], rotation: newRotation } as CanvasElement;
        setElements(newElements);
        setNotes(newElements.filter(el => el.type === 'sticky-note') as StickyNoteElement[]);
      }

      socketRef.current?.emit('move-element', {
        roomId: roomIdRef.current,
        elementId: state.id,
        x: (elements[idx] as StickyNoteElement).x,
        y: (elements[idx] as StickyNoteElement).y,
        rotation: newRotation,
        userId
      });
    }
  }, [isDrawing, isPanning, userId, userColor, viewTransform, getCanvasPosition, screenToWorld, setTargetTransform]);

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      return;
    }

    if (noteDragStateRef.current) {
      noteDragStateRef.current = null;
      engineRef.current.subscribe(() => {});
      const currentEls = engineRef.current.getElements();
      setElements(currentEls);
      setNotes(currentEls.filter(el => el.type === 'sticky-note') as StickyNoteElement[]);
      forceUpdate(x => x + 1);
    }

    if (noteResizeStateRef.current) {
      noteResizeStateRef.current = null;
      forceUpdate(x => x + 1);
    }

    if (noteRotateStateRef.current) {
      noteRotateStateRef.current = null;
      forceUpdate(x => x + 1);
    }

    if (isDrawing && currentDrawingRef.current) {
      const el = currentDrawingRef.current;
      const currentElements = engineRef.current.getElements();
      const finalEl = currentElements.find(e => e.id === el.id) || el;
      engineRef.current.setElements(currentElements);
      socketRef.current?.emit('draw', {
        roomId: roomIdRef.current,
        elementId: el.id,
        element: finalEl,
        userId,
        timestamp: Date.now()
      });
    }

    setIsDrawing(false);
    currentDrawingRef.current = null;
    drawStartPointRef.current = null;
  }, [isDrawing, isPanning, userId]);

  const handleMouseLeave = useCallback(() => {
    if (isDrawing) {
      handleMouseUp({} as React.MouseEvent);
    }
    setIsPanning(false);
    panStartRef.current = null;
    noteDragStateRef.current = null;
    noteResizeStateRef.current = null;
    noteRotateStateRef.current = null;
  }, [isDrawing, handleMouseUp]);

  const handleUndo = useCallback(() => {
    if (engineRef.current.undo()) {
      socketRef.current?.emit('undo', { roomId: roomIdRef.current, userId });
    }
  }, [userId]);

  const handleRedo = useCallback(() => {
    if (engineRef.current.redo()) {
      socketRef.current?.emit('redo', { roomId: roomIdRef.current, userId });
    }
  }, [userId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === 'z' && e.shiftKey) || (e.key === 'y')) {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedNoteId && document.activeElement?.tagName !== 'TEXTAREA') {
            e.preventDefault();
            engineRef.current.removeElement(selectedNoteId);
            socketRef.current?.emit('delete-element', {
              roomId: roomIdRef.current,
              elementId: selectedNoteId,
              userId
            });
            setSelectedNoteId(null);
          }
        }
      }
      if (e.key === 'Escape') {
        setSelectedNoteId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedNoteId, userId]);

  const handleNoteMouseDown = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setSelectedNoteId(noteId);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    noteDragStateRef.current = {
      id: noteId,
      startX: pos.x,
      startY: pos.y,
      noteStartX: note.x,
      noteStartY: note.y
    };
  }, [notes, screenToWorld]);

  const handleNoteResizeMouseDown = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    noteResizeStateRef.current = {
      id: noteId,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      startWidth: note.width,
      startHeight: note.height
    };
  }, [notes]);

  const handleNoteRotateMouseDown = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const screenCenterX = note.x * viewTransform.scale + viewTransform.offsetX;
    const screenCenterY = note.y * viewTransform.scale + viewTransform.offsetY;

    noteRotateStateRef.current = {
      id: noteId,
      startAngle: Math.atan2(e.clientY - rect.top - screenCenterY, e.clientX - rect.left - screenCenterX) * 180 / Math.PI,
      startRotation: note.rotation,
      centerX: screenCenterX,
      centerY: screenCenterY
    };
  }, [notes, viewTransform]);

  const handleNoteTextChange = useCallback((noteId: string, text: string) => {
    engineRef.current.updateElement(noteId, { text } as Partial<StickyNoteElement>);
    socketRef.current?.emit('update-note', {
      roomId: roomIdRef.current,
      elementId: noteId,
      text,
      userId
    });
  }, [userId]);

  const handleNoteDelete = useCallback((noteId: string) => {
    engineRef.current.removeElement(noteId);
    socketRef.current?.emit('delete-element', {
      roomId: roomIdRef.current,
      elementId: noteId,
      userId
    });
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    }
  }, [selectedNoteId, userId]);

  const handleCanvasClick = useCallback((_e: React.MouseEvent) => {
    setSelectedNoteId(null);
  }, []);

  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(5, targetTransformRef.current.scale * 1.2);
    setTargetTransform({ ...targetTransformRef.current, scale: newScale });
  }, [setTargetTransform]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(0.1, targetTransformRef.current.scale / 1.2);
    setTargetTransform({ ...targetTransformRef.current, scale: newScale });
  }, [setTargetTransform]);

  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newScale = Number(e.target.value) / 100;
    setTargetTransform({ ...targetTransformRef.current, scale: newScale });
  }, [setTargetTransform]);

  return (
    <div className="collabboard-app">
      <Toolbar
        currentTool={currentTool}
        setTool={setCurrentTool}
        brushColor={brushColor}
        setBrushColor={setBrushColor}
        brushWidth={brushWidth}
        setBrushWidth={setBrushWidth}
        shapeFillOpacity={shapeFillOpacity}
        setShapeFillOpacity={setShapeFillOpacity}
        fontSize={fontSize}
        setFontSize={setFontSize}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={engineRef.current.canUndo()}
        canRedo={engineRef.current.canRedo()}
      />

      <div
        ref={containerRef}
        className={`canvas-container ${isPanning ? 'panning' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      >
        <canvas ref={canvasRef} className="main-canvas" />

        {notes.map(note => {
          const screenX = note.x * viewTransform.scale + viewTransform.offsetX;
          const screenY = note.y * viewTransform.scale + viewTransform.offsetY;
          const scaledWidth = note.width * viewTransform.scale;
          const scaledHeight = note.height * viewTransform.scale;

          return (
            <div
              key={note.id}
              className={`sticky-note ${selectedNoteId === note.id ? 'selected' : ''} ${note.fadeIn ? 'fade-in' : ''}`}
              style={{
                left: screenX - scaledWidth / 2,
                top: screenY - scaledHeight / 2,
                width: scaledWidth,
                height: scaledHeight,
                transform: `rotate(${note.rotation}deg) scale(${viewTransform.scale})`,
                transformOrigin: 'center center'
              }}
              onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
            >
              {selectedNoteId === note.id && (
                <div
                  className="rotate-handle"
                  onMouseDown={(e) => handleNoteRotateMouseDown(e, note.id)}
                  title="旋转"
                >
                  ↻
                </div>
              )}
              <button
                className="delete-btn"
                onClick={(e) => { e.stopPropagation(); handleNoteDelete(note.id); }}
                title="删除"
              >
                ×
              </button>
              <textarea
                placeholder="输入便签内容..."
                value={note.text}
                onChange={(e) => handleNoteTextChange(note.id, e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: 14 / viewTransform.scale * 1, lineHeight: `${1.5 / viewTransform.scale}em` }}
              />
              {selectedNoteId === note.id && (
                <div
                  className="resize-handle"
                  onMouseDown={(e) => handleNoteResizeMouseDown(e, note.id)}
                  title="缩放"
                />
              )}
            </div>
          );
        })}

        {Array.from(remoteUsers.values()).map(user => (
          <div
            key={user.userId}
            className="remote-cursor"
            style={{
              left: user.cursor.x,
              top: user.cursor.y,
              transform: `translate(-2px, -2px)`
            }}
          >
            <svg viewBox="0 0 24 24" fill={user.color}>
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35z" />
            </svg>
            <div className="cursor-label" style={{ backgroundColor: user.color }}>
              {user.userName}
            </div>
          </div>
        ))}
      </div>

      <div className="control-panel">
        <h3>控制面板</h3>
        <div className="zoom-control">
          <label>画布缩放</label>
          <div className="zoom-slider-container">
            <button onClick={handleZoomOut} title="缩小">−</button>
            <input
              type="range"
              min="10"
              max="500"
              value={Math.round(viewTransform.scale * 100)}
              onChange={handleZoomChange}
            />
            <button onClick={handleZoomIn} title="放大">+</button>
            <span className="zoom-value">{Math.round(viewTransform.scale * 100)}%</span>
          </div>
        </div>

        <div className={`sync-status ${connected ? '' : 'disconnected'}`}>
          <div className="sync-dot"></div>
          <span className="sync-status-text">
            {connected ? '实时同步已连接' : '连接断开'}
          </span>
        </div>

        <div className="online-users">
          <div
            className="user-avatar"
            style={{ backgroundColor: userColor }}
            title={`${userName} (你)`}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          {Array.from(remoteUsers.values()).slice(0, 4).map(user => (
            <div
              key={user.userId}
              className="user-avatar"
              style={{ backgroundColor: user.color }}
              title={user.userName}
            >
              {user.userName.charAt(0).toUpperCase()}
            </div>
          ))}
          <span className="user-count">
            {1 + remoteUsers.size} 人在线
          </span>
        </div>
      </div>
    </div>
  );
};

export default App;
