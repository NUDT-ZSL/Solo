import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Pencil,
  Square,
  Circle,
  Minus,
  Type,
  StickyNote,
  MousePointer,
  Undo2,
  Redo2,
  Clock,
  Download,
  Trash2,
  Copy,
  X,
} from 'lucide-react';
import { WhiteboardCanvas, type ToolType, type CanvasElement, type StickyElement, type TextElement } from './canvas';

interface HistoryEntry {
  id: string;
  timestamp: string;
  versionNumber: number;
  elements: CanvasElement[];
}

const TOOL_NAMES: Record<ToolType, string> = {
  brush: '画笔',
  rectangle: '矩形',
  circle: '圆形',
  line: '直线',
  text: '文本',
  sticky: '便签',
  select: '选择',
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const whiteboardRef = useRef<WhiteboardCanvas | null>(null);
  const [, forceUpdate] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryEntry[]>([]);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSaveRef = useRef<string>('');

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wb = whiteboardRef.current;
    if (!canvas || !wb) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    const scale = wb.getScale();
    const offsetX = wb.getOffsetX();
    const offsetY = wb.getOffsetY();
    const gridSize = 20 * scale;

    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 0.5;

    const startX = offsetX % gridSize;
    const startY = offsetY % gridSize;

    for (let x = startX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = startY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const elements = wb.getVisibleElements();
    const selectedIds = wb.getSelectedIds();

    for (const el of elements) {
      const isSelected = selectedIds.includes(el.id);

      ctx.save();

      if (isSelected) {
        ctx.shadowColor = 'rgba(0, 210, 255, 0.5)';
        ctx.shadowBlur = 10;
      }

      switch (el.type) {
        case 'path': {
          if (el.points.length < 2) {
            ctx.fillStyle = el.color;
            ctx.beginPath();
            ctx.arc(el.points[0].x, el.points[0].y, el.strokeWidth / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.strokeStyle = el.color;
            ctx.lineWidth = el.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(el.points[0].x, el.points[0].y);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x, el.points[i].y);
            }
            ctx.stroke();
          }
          break;
        }
        case 'rectangle': {
          ctx.strokeStyle = el.color;
          ctx.lineWidth = el.strokeWidth;
          ctx.strokeRect(el.x, el.y, el.width, el.height);
          break;
        }
        case 'circle': {
          ctx.strokeStyle = el.color;
          ctx.lineWidth = el.strokeWidth;
          ctx.beginPath();
          ctx.ellipse(el.x, el.y, el.radiusX, el.radiusY, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'line': {
          ctx.strokeStyle = el.color;
          ctx.lineWidth = el.strokeWidth;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(el.x, el.y);
          ctx.lineTo(el.x2, el.y2);
          ctx.stroke();
          break;
        }
        case 'text': {
          if (editingElement !== el.id) {
            ctx.fillStyle = el.color;
            ctx.font = `${el.fontSize}px sans-serif`;
            ctx.textBaseline = 'top';
            ctx.fillText(el.content, el.x, el.y);
          }
          break;
        }
        case 'sticky': {
          if (editingElement !== el.id) {
            ctx.fillStyle = el.backgroundColor;
            ctx.strokeStyle = '#d4a853';
            ctx.lineWidth = 1;
            const radius = 12;
            ctx.beginPath();
            ctx.moveTo(el.x + radius, el.y);
            ctx.lineTo(el.x + el.width - radius, el.y);
            ctx.quadraticCurveTo(el.x + el.width, el.y, el.x + el.width, el.y + radius);
            ctx.lineTo(el.x + el.width, el.y + el.height - radius);
            ctx.quadraticCurveTo(el.x + el.width, el.y + el.height, el.x + el.width - radius, el.y + el.height);
            ctx.lineTo(el.x + radius, el.y + el.height);
            ctx.quadraticCurveTo(el.x, el.y + el.height, el.x, el.y + el.height - radius);
            ctx.lineTo(el.x, el.y + radius);
            ctx.quadraticCurveTo(el.x, el.y, el.x + radius, el.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#333333';
            ctx.font = '16px sans-serif';
            ctx.textBaseline = 'top';

            const words = el.content.split('');
            let line = '';
            let lineHeight = 20;
            let y = el.y + 10;
            const maxWidth = el.width - 20;

            for (let i = 0; i < words.length; i++) {
              const testLine = line + words[i];
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxWidth && i > 0) {
                ctx.fillText(line, el.x + 10, y);
                line = words[i];
                y += lineHeight;
                if (y + lineHeight > el.y + el.height - 10) break;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, el.x + 10, y);

            ctx.fillStyle = '#e94560';
            ctx.beginPath();
            ctx.arc(el.x + el.width - 10, el.y + 10, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('×', el.x + el.width - 10, el.y + 10);
          }
          break;
        }
      }

      if (isSelected && el.type !== 'sticky') {
        const bounds = wb.getElementBounds(el);
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 2 / scale;
        ctx.setLineDash([6 / scale, 4 / scale]);
        ctx.strokeRect(
          bounds.x - 5 / scale,
          bounds.y - 5 / scale,
          bounds.width + 10 / scale,
          bounds.height + 10 / scale
        );
        ctx.setLineDash([]);
      }

      ctx.restore();
    }

    const selectionBox = wb.getSelectionBox();
    if (selectionBox) {
      ctx.strokeStyle = '#00d2ff';
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([6 / scale, 4 / scale]);
      ctx.fillStyle = 'rgba(0, 210, 255, 0.1)';
      const x = selectionBox.width < 0 ? selectionBox.x + selectionBox.width : selectionBox.x;
      const y = selectionBox.height < 0 ? selectionBox.y + selectionBox.height : selectionBox.y;
      const w = Math.abs(selectionBox.width);
      const h = Math.abs(selectionBox.height);
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }

    ctx.restore();

    const ripples = wb.getRipples();
    const now = performance.now();
    for (const ripple of ripples) {
      const elapsed = now - ripple.startTime;
      const progress = Math.min(elapsed / 300, 1);
      const radius = progress * 40;
      const alpha = (1 - progress) * 0.5;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [editingElement]);

  useEffect(() => {
    const wb = new WhiteboardCanvas();
    whiteboardRef.current = wb;

    wb.setUpdateCallback(() => {
      forceUpdate((n) => n + 1);
      scheduleAutoSave();
    });

    loadCanvas();

    historyTimerRef.current = setInterval(() => {
      createHistorySnapshot();
    }, 5 * 60 * 1000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (historyTimerRef.current) {
        clearInterval(historyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const wb = whiteboardRef.current;
      if (wb) {
        const rect = canvas.getBoundingClientRect();
        wb.setCanvasSize(rect.width, rect.height);
      }
      renderCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [renderCanvas]);

  useEffect(() => {
    renderCanvas();
  });

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveCanvas();
    }, 2000);
  }, []);

  const loadCanvas = async () => {
    try {
      const response = await fetch('/api/canvas');
      if (response.ok) {
        const data = await response.json();
        const wb = whiteboardRef.current;
        if (wb && data.elements) {
          wb.loadSnapshot(data.elements);
        }
      }
    } catch (error) {
      console.log('Failed to load canvas, using empty canvas');
    }
  };

  const saveCanvas = async () => {
    const wb = whiteboardRef.current;
    if (!wb) return;

    const elements = wb.getSnapshot();
    const snapshotStr = JSON.stringify(elements);
    if (snapshotStr === lastSaveRef.current) return;
    lastSaveRef.current = snapshotStr;

    try {
      await fetch('/api/canvas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ elements }),
      });
    } catch (error) {
      console.log('Failed to save canvas');
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const data = await response.json();
        setHistoryList(data);
      }
    } catch (error) {
      console.log('Failed to load history');
    }
  };

  const createHistorySnapshot = async () => {
    const wb = whiteboardRef.current;
    if (!wb) return;

    const elements = wb.getSnapshot();
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ elements }),
      });
    } catch (error) {
      console.log('Failed to create history snapshot');
    }
  };

  const restoreHistory = async (id: string) => {
    try {
      const response = await fetch(`/api/history/${id}/restore`, {
        method: 'POST',
      });
      if (response.ok) {
        const entry = historyList.find((h) => h.id === id);
        if (entry) {
          const wb = whiteboardRef.current;
          if (wb) {
            wb.loadSnapshot(entry.elements);
          }
        }
      }
    } catch (error) {
      console.log('Failed to restore history');
    }
    setConfirmRestore(null);
    setShowHistory(false);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wb = whiteboardRef.current;
    if (!wb) return;

    if (editingElement) {
      setEditingElement(null);
    }

    wb.handleMouseDown(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wb = whiteboardRef.current;
    if (!wb) return;
    wb.handleMouseMove(e);
  };

  const handleMouseUp = () => {
    const wb = whiteboardRef.current;
    if (!wb) return;
    wb.handleMouseUp();
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const wb = whiteboardRef.current;
    if (!wb) return;
    wb.handleWheel(e);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const wb = whiteboardRef.current;
    if (!wb) return;
    wb.handleContextMenu(e);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wb = whiteboardRef.current;
    if (!wb) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = wb.screenToWorld(screenX, screenY);

    const element = wb.getElementAtPoint(worldPos.x, worldPos.y);
    if (element && (element.type === 'text' || element.type === 'sticky')) {
      setEditingElement(element.id);
      setEditText(element.content);
    }
  };

  const handleEditTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value.slice(0, 100));
  };

  const handleEditTextBlur = () => {
    const wb = whiteboardRef.current;
    if (wb && editingElement) {
      wb.updateTextContent(editingElement, editText);
    }
    setEditingElement(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleEditTextBlur();
    }
    if (e.key === 'Escape') {
      setEditingElement(null);
    }
  };

  const handleToolClick = (tool: ToolType) => {
    const wb = whiteboardRef.current;
    if (wb) {
      wb.setCurrentTool(tool);
    }
  };

  const handleUndo = () => {
    const wb = whiteboardRef.current;
    if (wb) {
      wb.undo();
    }
  };

  const handleRedo = () => {
    const wb = whiteboardRef.current;
    if (wb) {
      wb.redo();
    }
  };

  const handleDeleteSelected = () => {
    const wb = whiteboardRef.current;
    if (wb) {
      wb.removeSelected();
    }
  };

  const handleDuplicateSelected = () => {
    const wb = whiteboardRef.current;
    if (wb) {
      wb.duplicateSelected();
    }
  };

  const handleSaveLocal = () => {
    const wb = whiteboardRef.current;
    if (!wb) return;

    const elements = wb.getSnapshot();
    const dataStr = JSON.stringify(elements, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleHistoryClick = () => {
    setShowHistory(!showHistory);
    if (!showHistory) {
      loadHistory();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const wb = whiteboardRef.current;
  const currentTool = wb?.getCurrentTool() || 'brush';
  const currentColor = wb?.getCurrentColor() || '#e94560';
  const strokeWidth = wb?.getStrokeWidth() || 4;
  const colors = wb?.getColors() || [];
  const strokeWidths = wb?.getStrokeWidths() || [];
  const selectedCount = wb?.getSelectedIds().length || 0;
  const canUndo = wb?.canUndo() || false;
  const canRedo = wb?.canRedo() || false;

  const getEditorStyle = () => {
    if (!wb || !editingElement) return {};
    const element = wb.getElements().find((el) => el.id === editingElement);
    if (!element) return {};

    const scale = wb.getScale();
    const offsetX = wb.getOffsetX();
    const offsetY = wb.getOffsetY();

    if (element.type === 'text') {
      const textEl = element as TextElement;
      return {
        left: textEl.x * scale + offsetX,
        top: textEl.y * scale + offsetY,
        fontSize: textEl.fontSize * scale,
        color: textEl.color,
        width: 'auto',
        height: 'auto',
      };
    }

    if (element.type === 'sticky') {
      const stickyEl = element as StickyElement;
      return {
