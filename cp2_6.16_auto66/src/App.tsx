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
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
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
            const lineHeight = 20;
            let ty = el.y + 10;
            const maxWidth = el.width - 20;

            for (let i = 0; i < words.length; i++) {
              const testLine = line + words[i];
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxWidth && i > 0) {
                ctx.fillText(line, el.x + 10, ty);
                line = words[i];
                ty += lineHeight;
                if (ty + lineHeight > el.y + el.height - 10) break;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, el.x + 10, ty);

            ctx.fillStyle = '#e94560';
            ctx.beginPath();
            ctx.arc(el.x + el.width - 10, el.y + 10, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('×', el.x + el.width - 10, el.y + 10);
            ctx.textAlign = 'start';
          }
          break;
        }
      }

      if (isSelected) {
        const bounds = wb.getElementBounds(el);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
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
      const sx = selectionBox.width < 0 ? selectionBox.x + selectionBox.width : selectionBox.x;
      const sy = selectionBox.height < 0 ? selectionBox.y + selectionBox.height : selectionBox.y;
      const sw = Math.abs(selectionBox.width);
      const sh = Math.abs(selectionBox.height);
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.setLineDash([]);
    }

    ctx.restore();

    const ripples = wb.getRipples();
    const now = performance.now();
    for (const ripple of ripples) {
      const elapsed = now - ripple.startTime;
      const progress = Math.min(elapsed / 300, 1);
      const r = progress * 40;
      const alpha = (1 - progress) * 0.5;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, r, 0, Math.PI * 2);
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
        const r = canvas.getBoundingClientRect();
        wb.setCanvasSize(r.width, r.height);
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
    } catch (_e) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements }),
      });
    } catch (_e) {
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
    } catch (_e) {
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements }),
      });
    } catch (_e) {
      console.log('Failed to create history snapshot');
    }
  };

  const confirmRestoreHistory = async () => {
    if (!confirmRestoreId) return;
    try {
      const response = await fetch(`/api/history/${confirmRestoreId}/restore`, {
        method: 'POST',
      });
      if (response.ok) {
        const entry = historyList.find((h) => h.id === confirmRestoreId);
        if (entry) {
          const wb = whiteboardRef.current;
          if (wb) {
            wb.loadSnapshot(entry.elements);
          }
        }
      }
    } catch (_e) {
      console.log('Failed to restore history');
    }
    setConfirmRestoreId(null);
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
      e.preventDefault();
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
    if (wb) wb.undo();
  };

  const handleRedo = () => {
    const wb = whiteboardRef.current;
    if (wb) wb.redo();
  };

  const handleDeleteSelected = () => {
    const wb = whiteboardRef.current;
    if (wb) wb.removeSelected();
  };

  const handleDuplicateSelected = () => {
    const wb = whiteboardRef.current;
    if (wb) wb.duplicateSelected();
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
  const scale = wb?.getScale() || 1;

  const getEditorStyle = () => {
    if (!wb || !editingElement) return {};
    const element = wb.getElements().find((el) => el.id === editingElement);
    if (!element) return {};

    const s = wb.getScale();
    const ox = wb.getOffsetX();
    const oy = wb.getOffsetY();

    if (element.type === 'text') {
      const textEl = element as TextElement;
      return {
        left: textEl.x * s + ox + 60,
        top: textEl.y * s + oy + 48,
        fontSize: textEl.fontSize * s,
        color: textEl.color,
        width: 200 * s,
        height: 'auto' as const,
      };
    }

    if (element.type === 'sticky') {
      const stickyEl = element as StickyElement;
      return {
        left: stickyEl.x * s + ox + 60,
        top: stickyEl.y * s + oy + 48,
        fontSize: 16 * s,
        color: '#333333',
        width: stickyEl.width * s,
        height: stickyEl.height * s,
        backgroundColor: stickyEl.backgroundColor,
      };
    }

    return {};
  };

  const tools: { type: ToolType; icon: React.ReactNode }[] = [
    { type: 'brush', icon: <Pencil size={20} /> },
    { type: 'rectangle', icon: <Square size={20} /> },
    { type: 'circle', icon: <Circle size={20} /> },
    { type: 'line', icon: <Minus size={20} /> },
    { type: 'text', icon: <Type size={20} /> },
    { type: 'sticky', icon: <StickyNote size={20} /> },
    { type: 'select', icon: <MousePointer size={20} /> },
  ];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          height: 48,
          background: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#ffffff', fontSize: 14 }}>{TOOL_NAMES[currentTool]}</span>
          {currentTool !== 'select' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {colors.map((color) => (
                <div
                  key={color}
                  onClick={() => wb?.setCurrentColor(color)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: color === currentColor ? '2px solid #ffffff' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.2)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
                />
              ))}
            </div>
          )}
          {(currentTool === 'brush' || currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'line') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
              {strokeWidths.map((w) => (
                <div
                  key={w}
                  onClick={() => wb?.setStrokeWidth(w)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: w === strokeWidth ? '#0f3460' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: Math.min(w, 12),
                      height: Math.min(w, 12),
                      borderRadius: '50%',
                      backgroundColor: currentColor,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <span style={{ color: '#ffffff80', fontSize: 12, marginLeft: 8 }}>
            {Math.round(scale * 100)}%
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedCount > 0 && (
            <>
              <button
                onClick={handleDeleteSelected}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(233, 69, 96, 0.2)',
                  color: '#e94560',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                title="删除选中"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={handleDuplicateSelected}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(0, 210, 255, 0.2)',
                  color: '#00d2ff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                title="复制选中"
              >
                <Copy size={16} />
              </button>
            </>
          )}
          <button
            onClick={handleHistoryClick}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'none',
              background: showHistory ? '#1a1a2e' : '#0f3460',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1a1a2e'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = showHistory ? '#1a1a2e' : '#0f3460'; }}
            title="历史版本"
          >
            <Clock size={18} />
          </button>
          <button
            onClick={handleSaveLocal}
            style={{
              width: 120,
              height: 36,
              borderRadius: 18,
              border: 'none',
              background: '#e94560',
              color: '#ffffff',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            <Download size={14} />
            保存到本地
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          style={{
            width: 60,
            background: '#16213e',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 0',
            gap: 4,
            flexShrink: 0,
            zIndex: 5,
          }}
        >
          {tools.map(({ type, icon }) => (
            <button
              key={type}
              onClick={() => handleToolClick(type)}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: 'none',
                background: currentTool === type ? '#0f3460' : 'rgba(255,255,255,0.08)',
                color: currentTool === type ? '#ffffff' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              title={TOOL_NAMES[type]}
            >
              {icon}
            </button>
          ))}

          <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

          <button
            onClick={handleUndo}
            disabled={!canUndo}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.08)',
              color: canUndo ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
              cursor: canUndo ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { if (canUndo) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            title="撤销"
          >
            <Undo2 size={20} />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.08)',
              color: canRedo ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
              cursor: canRedo ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { if (canRedo) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            title="重做"
          >
            <Redo2 size={20} />
          </button>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              cursor: currentTool === 'select' ? 'default' : currentTool === 'brush' ? 'crosshair' : 'crosshair',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
          />

          {editingElement && (
            <textarea
              value={editText}
              onChange={handleEditTextChange}
              onBlur={handleEditTextBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              style={{
                position: 'absolute',
                ...getEditorStyle(),
                background: (getEditorStyle() as React.CSSProperties).backgroundColor || 'transparent',
                border: '2px solid #00d2ff',
                borderRadius: 8,
                padding: 4,
                fontSize: (getEditorStyle() as React.CSSProperties).fontSize || 16,
                color: (getEditorStyle() as React.CSSProperties).color || '#ffffff',
                outline: 'none',
                resize: 'none',
                zIndex: 20,
                fontFamily: 'inherit',
                lineHeight: 1.4,
                boxSizing: 'border-box',
              }}
            />
          )}

          {showHistory && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 300,
                maxHeight: 'calc(100% - 16px)',
                background: '#16213e',
                borderRadius: 16,
                boxShadow: '#00000033 0 4px 24px',
                overflow: 'auto',
                zIndex: 30,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <span style={{ color: '#ffffff', fontSize: 14, fontWeight: 600 }}>历史版本</span>
                <button
                  onClick={() => setShowHistory(false)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ padding: 8 }}>
                {historyList.length === 0 && (
                  <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 24, fontSize: 13 }}>
                    暂无历史版本
                  </div>
                )}
                {historyList.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 8,
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                      {formatDate(entry.timestamp)} #{entry.versionNumber}
                    </span>
                    <button
                      onClick={() => setConfirmRestoreId(entry.id)}
                      style={{
                        width: 80,
                        height: 32,
                        borderRadius: 8,
                        border: 'none',
                        background: '#e94560',
                        color: '#ffffff',
                        fontSize: 12,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      恢复此版本
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {confirmRestoreId && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#00000066',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
              }}
              onClick={() => setConfirmRestoreId(null)}
            >
              <div
                style={{
                  background: '#16213e',
                  borderRadius: 16,
                  padding: 24,
                  width: 360,
                  boxShadow: '#00000066 0 8px 32px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ color: '#ffffff', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                  确认恢复版本
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
                  恢复此版本后，当前画布内容将被替换为历史版本的内容。此操作不可撤销，是否继续？
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button
                    onClick={() => setConfirmRestoreId(null)}
                    style={{
                      height: 36,
                      padding: '0 20px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmRestoreHistory}
                    style={{
                      height: 36,
                      padding: '0 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#e94560',
                      color: '#ffffff',
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    确认恢复
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
