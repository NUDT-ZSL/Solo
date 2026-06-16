import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Socket } from 'socket.io-client';
import Toolbar, { ToolType } from './Toolbar';
import StickyNoteComponent from './StickyNote';
import AnnotationComponent from './Annotation';
import {
  type Graphic,
  type StickyNoteData,
  type AnnotationData,
  type Point,
  createGraphic,
  createStickyNote,
  createAnnotation,
  DEFAULT_COLOR,
  DEFAULT_STROKE_WIDTH,
  STICKY_NOTE_DEFAULT_WIDTH,
  STICKY_NOTE_DEFAULT_HEIGHT
} from '../logic/DataModel';
import {
  screenToWorld,
  findAnnotationAtPoint,
  findStickyNoteAtPoint,
  isPointInResizeHandle,
  type ViewTransform
} from '../logic/CoordinateUtils';

interface WhiteboardProps {
  boardId: string;
  socket: Socket;
  userName: string;
}

interface OnlineUser {
  id: string;
  name: string;
  color: string;
}

interface HistoryItem {
  id: string;
  op: string;
  data: any;
  timestamp: number;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ boardId, socket, userName }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [currentColor, setCurrentColor] = useState(DEFAULT_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE_WIDTH);

  const [graphics, setGraphics] = useState<Graphic[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [designImage, setDesignImage] = useState<string | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [openAnnotationId, setOpenAnnotationId] = useState<string | null>(null);

  const [transform, setTransform] = useState<ViewTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  });

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (designImage) {
      const img = new Image();
      img.src = designImage;
      if (img.complete) {
        const imgWidth = img.width * transform.scale;
        const imgHeight = img.height * transform.scale;
        const x = (canvas.width - imgWidth) / 2;
        const y = (canvas.height - imgHeight) / 2;
        ctx.drawImage(img, x, y, imgWidth, imgHeight);
      }
    }

    ctx.save();
    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.scale, transform.scale);

    for (const graphic of graphics) {
      drawGraphic(ctx, graphic);
    }

    if (isDrawing && currentPoints.length > 0) {
      const tempGraphic: Graphic = {
        id: 'temp',
        type: currentTool as any,
        points: currentPoints,
        color: currentColor,
        strokeWidth,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      drawGraphic(ctx, tempGraphic);
    }

    ctx.restore();
  }, [graphics, currentPoints, isDrawing, currentTool, currentColor, strokeWidth, transform, designImage]);

  const drawGraphic = (ctx: CanvasRenderingContext2D, graphic: Graphic) => {
    ctx.strokeStyle = graphic.color;
    ctx.lineWidth = graphic.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (graphic.type === 'pen') {
      if (graphic.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(graphic.points[0].x, graphic.points[0].y);
      for (let i = 1; i < graphic.points.length; i++) {
        ctx.lineTo(graphic.points[i].x, graphic.points[i].y);
      }
      ctx.stroke();
    } else if (graphic.type === 'rectangle') {
      if (graphic.points.length < 2) return;
      const start = graphic.points[0];
      const end = graphic.points[graphic.points.length - 1];
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (graphic.type === 'circle') {
      if (graphic.points.length < 2) return;
      const start = graphic.points[0];
      const end = graphic.points[graphic.points.length - 1];
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
      );
      ctx.beginPath();
      ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (graphic.type === 'line') {
      if (graphic.points.length < 2) return;
      const start = graphic.points[0];
      const end = graphic.points[graphic.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [redrawCanvas]);

  useEffect(() => {
    if (designImage) {
      const img = new Image();
      img.onload = () => {
        redrawCanvas();
      };
      img.src = designImage;
    }
  }, [designImage, redrawCanvas]);

  const getCanvasCoords = (e: React.MouseEvent | MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvasCoords = getCanvasCoords(e);

    if (currentTool === 'annotation') {
      const worldPos = screenToWorld(canvasCoords.x, canvasCoords.y, transform);
      const newAnnotation = createAnnotation(uuidv4(), worldPos.x, worldPos.y);
      setAnnotations(prev => [...prev, newAnnotation]);
      setOpenAnnotationId(newAnnotation.id);
      socket.emit('add-annotation', { boardId, annotation: newAnnotation });
      return;
    }

    if (currentTool === 'sticky') {
      const worldPos = screenToWorld(canvasCoords.x, canvasCoords.y, transform);
      const newNote = createStickyNote(uuidv4(), worldPos.x, worldPos.y);
      setStickyNotes(prev => [...prev, newNote]);
      setSelectedNoteId(newNote.id);
      setCurrentTool('select');
      socket.emit('add-sticky-note', { boardId, note: newNote });
      return;
    }

    if (currentTool === 'select') {
      const clickedAnnotation = findAnnotationAtPoint(
        canvasCoords.x,
        canvasCoords.y,
        annotations,
        transform
      );
      if (clickedAnnotation) {
        setOpenAnnotationId(clickedAnnotation.id === openAnnotationId ? null : clickedAnnotation.id);
        setSelectedNoteId(null);
        return;
      }

      const clickedNote = findStickyNoteAtPoint(
        canvasCoords.x,
        canvasCoords.y,
        stickyNotes,
        transform
      );
      if (clickedNote) {
        setSelectedNoteId(clickedNote.id);
        setOpenAnnotationId(null);
        return;
      }

      setSelectedNoteId(null);
      setOpenAnnotationId(null);
      return;
    }

    if (['pen', 'rectangle', 'circle', 'line'].includes(currentTool)) {
      setIsDrawing(true);
      const worldPos = screenToWorld(canvasCoords.x, canvasCoords.y, transform);
      setCurrentPoints([worldPos]);
      setSelectedNoteId(null);
      setOpenAnnotationId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;

    const canvasCoords = getCanvasCoords(e);
    const worldPos = screenToWorld(canvasCoords.x, canvasCoords.y, transform);

    if (currentTool === 'pen') {
      setCurrentPoints(prev => [...prev, worldPos]);
    } else {
      setCurrentPoints([currentPoints[0], worldPos]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentPoints.length < 2) {
      setIsDrawing(false);
      setCurrentPoints([]);
      return;
    }

    const newGraphic = createGraphic(
      uuidv4(),
      currentTool as any,
      currentPoints,
      currentColor,
      strokeWidth
    );

    setGraphics(prev => [...prev, newGraphic]);
    socket.emit('add-graphic', { boardId, graphic: newGraphic });

    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const handleNoteUpdate = (note: StickyNoteData) => {
    setStickyNotes(prev => prev.map(n => n.id === note.id ? note : n));
    socket.emit('update-sticky-note', { boardId, note });
  };

  const handleNoteDelete = (noteId: string) => {
    setStickyNotes(prev => prev.filter(n => n.id !== noteId));
    setSelectedNoteId(null);
    socket.emit('delete-sticky-note', { boardId, noteId });
  };

  const handleAnnotationUpdate = (annotation: AnnotationData) => {
    setAnnotations(prev => prev.map(a => a.id === annotation.id ? annotation : a));
    socket.emit('update-annotation', { boardId, annotation });
  };

  const handleAnnotationDelete = (annotationId: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== annotationId));
    setOpenAnnotationId(null);
    socket.emit('delete-annotation', { boardId, annotationId });
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.match('image.*')) {
      alert('请上传图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setDesignImage(imageData);
      socket.emit('upload-design', { boardId, imageData });

      const canvas = canvasRef.current;
      if (canvas && imageData) {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(
            canvas.width * 0.8 / img.width,
            canvas.height * 0.8 / img.height
          );
          setTransform({
            scale,
            offsetX: (canvas.width - img.width * scale) / 2,
            offsetY: (canvas.height - img.height * scale) / 2
          });
        };
        img.src = imageData;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('graphic-added', (graphic: Graphic) => {
      setGraphics(prev => [...prev, graphic]);
    });

    socket.on('graphic-updated', (graphic: Graphic) => {
      setGraphics(prev => prev.map(g => g.id === graphic.id ? graphic : g));
    });

    socket.on('graphic-deleted', (graphicId: string) => {
      setGraphics(prev => prev.filter(g => g.id !== graphicId));
    });

    socket.on('sticky-note-added', (note: StickyNoteData) => {
      setStickyNotes(prev => [...prev, note]);
    });

    socket.on('sticky-note-updated', (note: StickyNoteData) => {
      setStickyNotes(prev => prev.map(n => n.id === note.id ? note : n));
    });

    socket.on('sticky-note-deleted', (noteId: string) => {
      setStickyNotes(prev => prev.filter(n => n.id !== noteId));
    });

    socket.on('annotation-added', (annotation: AnnotationData) => {
      setAnnotations(prev => [...prev, annotation]);
    });

    socket.on('annotation-updated', (annotation: AnnotationData) => {
      setAnnotations(prev => prev.map(a => a.id === annotation.id ? annotation : a));
    });

    socket.on('annotation-deleted', (annotationId: string) => {
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
    });

    socket.on('design-uploaded', (imageData: string) => {
      setDesignImage(imageData);
    });

    socket.on('online-users', (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    socket.on('user-joined', ({ user }: { user: OnlineUser }) => {
      setNotification(`${user.name} 加入了协作`);
      setTimeout(() => setNotification(null), 3000);
    });

    socket.on('user-left', ({ user }: { user: OnlineUser }) => {
      setNotification(`${user.name} 离开了`);
      setTimeout(() => setNotification(null), 3000);
    });

    socket.on('board-data', (data: any) => {
      if (data.graphics) setGraphics(data.graphics);
      if (data.stickyNotes) setStickyNotes(data.stickyNotes);
      if (data.annotations) setAnnotations(data.annotations);
      if (data.designImage) setDesignImage(data.designImage);
    });

    socket.on('history-data', (historyData: HistoryItem[]) => {
      setHistory(historyData);
    });

    socket.emit('join-board', { boardId, userName });

    return () => {
      socket.off('graphic-added');
      socket.off('graphic-updated');
      socket.off('graphic-deleted');
      socket.off('sticky-note-added');
      socket.off('sticky-note-updated');
      socket.off('sticky-note-deleted');
      socket.off('annotation-added');
      socket.off('annotation-updated');
      socket.off('annotation-deleted');
      socket.off('design-uploaded');
      socket.off('online-users');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('board-data');
      socket.off('history-data');
    };
  }, [socket, boardId, userName]);

  const toggleHistory = () => {
    setShowHistory(!showHistory);
    if (!showHistory) {
      socket.emit('get-history', { boardId });
    }
  };

  const formatHistoryTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getHistorySummary = (item: HistoryItem) => {
    switch (item.op) {
      case 'add-graphic':
        return `添加了一个${item.data.type === 'pen' ? '画笔' : item.data.type === 'rectangle' ? '矩形' : item.data.type === 'circle' ? '圆形' : '直线'}图形`;
      case 'update-graphic':
        return '修改了图形';
      case 'delete-graphic':
        return '删除了图形';
      case 'add-sticky-note':
        return '添加了便签';
      case 'update-sticky-note':
        return item.data.text ? `修改了便签: "${item.data.text.substring(0, 20)}${item.data.text.length > 20 ? '...' : ''}"` : '修改了便签';
      case 'delete-sticky-note':
        return '删除了便签';
      case 'add-annotation':
        return '添加了批注';
      case 'update-annotation':
        return '更新了批注评论';
      case 'delete-annotation':
        return '删除了批注';
      case 'upload-design':
        return '上传了设计稿';
      default:
        return '未知操作';
    }
  };

  return (
    <div className="whiteboard-container">
      <div className="top-bar">
        <div className="top-bar-left">
          <button className="back-btn" onClick={() => window.history.back()}>
            ← 返回
          </button>
          <h1 className="board-title">协作白板</h1>
        </div>
        <div className="top-bar-right">
          <div className="online-users">
            <span className="online-count">{onlineUsers.length} 人在线</span>
            <div className="user-avatars">
              {onlineUsers.slice(0, 5).map(user => (
                <div
                  key={user.id}
                  className="user-avatar"
                  style={{ backgroundColor: user.color }}
                  title={user.name}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {onlineUsers.length > 5 && (
                <div className="user-avatar more">
                  +{onlineUsers.length - 5}
                </div>
              )}
            </div>
          </div>
          <button
            className="history-btn"
            onClick={toggleHistory}
            title="操作历史"
          >
            📋 历史
          </button>
        </div>
      </div>

      {notification && (
        <div className="notification-bar">
          {notification}
        </div>
      )}

      <div className="main-content">
        <Toolbar
          currentTool={currentTool}
          currentColor={currentColor}
          strokeWidth={strokeWidth}
          onToolChange={setCurrentTool}
          onColorChange={setCurrentColor}
          onStrokeWidthChange={setStrokeWidth}
        />

        <div
          className={`canvas-container ${isDragOver ? 'drag-over' : ''}`}
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <canvas ref={canvasRef} />

          {stickyNotes.map(note => (
            <StickyNoteComponent
              key={note.id}
              note={note}
              scale={transform.scale}
              isSelected={selectedNoteId === note.id}
              onSelect={() => setSelectedNoteId(note.id)}
              onUpdate={handleNoteUpdate}
              onDelete={() => handleNoteDelete(note.id)}
            />
          ))}

          {annotations.map(annotation => (
            <AnnotationComponent
              key={annotation.id}
              annotation={annotation}
              scale={transform.scale}
              isOpen={openAnnotationId === annotation.id}
              onToggle={() => setOpenAnnotationId(
                openAnnotationId === annotation.id ? null : annotation.id
              )}
              onUpdate={handleAnnotationUpdate}
              onDelete={() => handleAnnotationDelete(annotation.id)}
              currentUser={userName}
            />
          ))}

          {!designImage && (
            <div className="upload-hint">
              <div className="upload-hint-content">
                <div className="upload-icon">🖼️</div>
                <p>拖拽图片到此处或点击上传设计稿</p>
                <button
                  className="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  上传图片
                </button>
                <p className="upload-hint-small">支持 PNG / JPG，最大 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          )}

          {isDragOver && (
            <div className="drag-overlay">
              <div className="drag-overlay-content">
                <div className="drag-icon">📁</div>
                <p>释放以上传图片</p>
              </div>
            </div>
          )}
        </div>

        {showHistory && (
          <div className="history-sidebar">
            <div className="history-header">
              <h3>操作历史</h3>
              <button className="close-btn" onClick={() => setShowHistory(false)}>
                ×
              </button>
            </div>
            <div className="history-list">
              {history.length === 0 ? (
                <div className="empty-history">暂无操作记录</div>
              ) : (
                history.map(item => (
                  <div key={item.id} className="history-item">
                    <div className="history-time">{formatHistoryTime(item.timestamp)}</div>
                    <div className="history-summary">{getHistorySummary(item)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .whiteboard-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: #fafafa;
        }

        .top-bar {
          height: 56px;
          background: #ffffff;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          flex-shrink: 0;
        }

        .top-bar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .back-btn {
          padding: 6px 12px;
          border: 1px solid #e0e0e0;
          background: #f5f5f5;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: #eeeeee;
        }

        .board-title {
          font-size: 18px;
          font-weight: 600;
          color: #212121;
          margin: 0;
        }

        .top-bar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .online-users {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .online-count {
          font-size: 13px;
          color: #666;
        }

        .user-avatars {
          display: flex;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: 600;
          margin-left: -8px;
          first-child: {
            margin-left: 0;
          }
        }

        .user-avatar:first-child {
          margin-left: 0;
        }

        .user-avatar.more {
          background: #bdbdbd;
        }

        .history-btn {
          padding: 6px 14px;
          border: 1px solid #e0e0e0;
          background: #ffffff;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .history-btn:hover {
          background: #f5f5f5;
        }

        .notification-bar {
          position: absolute;
          top: 56px;
          left: 50%;
          transform: translateX(-50%);
          background: #4FC3F7;
          color: white;
          padding: 10px 24px;
          border-radius: 0 0 8px 8px;
          font-size: 14px;
          z-index: 1000;
          animation: fadeInDown 0.5s ease-out;
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .main-content {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
        }

        .canvas-container {
          flex: 1;
          position: relative;
          overflow: hidden;
          background-color: #ffffff;
          background-image:
            linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        .canvas-container canvas {
          position: absolute;
          top: 0;
          left: 0;
          cursor: crosshair;
        }

        .canvas-container.drag-over {
          background-color: #E0F7FA;
        }

        .upload-hint {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          pointer-events: none;
        }

        .upload-hint-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .upload-icon {
          font-size: 48px;
          opacity: 0.3;
        }

        .upload-hint p {
          color: #999;
          font-size: 14px;
          margin: 0;
        }

        .upload-btn {
          pointer-events: auto;
          padding: 10px 24px;
          background: #4FC3F7;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }

        .upload-btn:hover {
          background: #29B6F6;
        }

        .upload-hint-small {
          font-size: 12px !important;
          color: #bbb !important;
        }

        .drag-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(79, 195, 247, 0.1);
          border: 3px dashed #4FC3F7;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 10;
          animation: pulse-glow 1.5s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: inset 0 0 20px rgba(79, 195, 247, 0.2);
          }
          50% {
            box-shadow: inset 0 0 40px rgba(79, 195, 247, 0.4);
          }
        }

        .drag-overlay-content {
          text-align: center;
        }

        .drag-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .drag-overlay-content p {
          color: #4FC3F7;
          font-size: 18px;
          font-weight: 500;
          margin: 0;
        }

        .history-sidebar {
          width: 280px;
          background: #ffffff;
          border-left: 1px solid #e0e0e0;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #f0f0f0;
        }

        .history-header h3 {
          margin: 0;
          font-size: 16px;
          color: #212121;
        }

        .close-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          font-size: 20px;
          cursor: pointer;
          color: #999;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #f5f5f5;
          color: #666;
        }

        .history-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .empty-history {
          text-align: center;
          color: #999;
          font-size: 13px;
          padding: 40px 0;
        }

        .history-item {
          padding: 10px 12px;
          border-radius: 6px;
          margin-bottom: 8px;
          background: #fafafa;
          transition: background 0.2s;
        }

        .history-item:hover {
          background: #f0f0f0;
        }

        .history-time {
          font-size: 11px;
          color: #999;
          margin-bottom: 4px;
        }

        .history-summary {
          font-size: 13px;
          color: #424242;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .main-content {
            flex-direction: column;
          }

          .history-sidebar {
            width: 100%;
            height: 200px;
            border-left: none;
            border-top: 1px solid #e0e0e0;
          }

          .top-bar {
            padding: 0 12px;
          }

          .board-title {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default Whiteboard;
