import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Pencil, MessageCircle, Volume2, Trash2, Download, X, Star } from 'lucide-react';
import type { Project, Frame, DialogBubble, Comment } from '../types';
import { getProjects, getProject, getFrameDialogs } from '../api';
import { CommentWebSocket } from '../websocket';

interface ExportConfig {
  colsPerRow: number;
  imageWidth: number;
}

const SAMPLE_IMAGES = [
  'https://picsum.photos/seed/comic1/320/400',
  'https://picsum.photos/seed/comic2/320/400',
  'https://picsum.photos/seed/comic3/320/400',
  'https://picsum.photos/seed/comic4/320/400',
  'https://picsum.photos/seed/comic5/320/400',
  'https://picsum.photos/seed/comic6/320/400',
];

const GRID_COLS = 4;
const GRID_ROWS = 4;
const CELL_WIDTH = 160;
const CELL_HEIGHT = 200;

interface EditorProps {
  selectedFrameId: string | null;
  onFrameSelect: (frameId: string | null, index: number | null) => void;
}

export default function Editor({ selectedFrameId, onFrameSelect }: EditorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [dialogs, setDialogs] = useState<Map<string, DialogBubble[]>>(new Map());
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());
  const [bouncingFrames, setBouncingFrames] = useState<Set<string>>(new Set());
  const [hoveredFrameId, setHoveredFrameId] = useState<string | null>(null);
  const [dragOverFrameId, setDragOverFrameId] = useState<string | null>(null);
  const [draggingImage, setDraggingImage] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({ colsPerRow: 4, imageWidth: 1600 });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [editingDialogId, setEditingDialogId] = useState<string | null>(null);

  const wsRef = useRef<CommentWebSocket | null>(null);
  const dragStateRef = useRef<{
    dialogId: string;
    frameId: string;
    type: 'move' | 'resize';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  useEffect(() => {
    getProjects().then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      getProject(selectedProject.id).then((data) => {
        const initialFrames: Frame[] = [];
        for (let y = 0; y < GRID_ROWS; y++) {
          for (let x = 0; x < GRID_COLS; x++) {
            const existing = data.frames.find((f) => f.gridX === x && f.gridY === y);
            initialFrames.push(
              existing || {
                id: `frame-${selectedProject.id}-${x}-${y}`,
                projectId: selectedProject.id,
                order: y * GRID_COLS + x,
                gridX: x,
                gridY: y,
                width: 1,
                height: 1,
              }
            );
          }
        }
        setFrames(initialFrames);
        initialFrames.forEach((f) => {
          getFrameDialogs(f.id)
            .then((d) => setDialogs((prev) => new Map(prev).set(f.id, d)))
            .catch(() => {});
        });
      }).catch(console.error);
    }
  }, [selectedProject]);

  useEffect(() => {
    wsRef.current = new CommentWebSocket();
    wsRef.current.connect();
    const unsub = wsRef.current.onNewComment(({ frameId, count }) => {
      setCommentCounts((prev) => new Map(prev).set(frameId, count));
      setBouncingFrames((prev) => new Set(prev).add(frameId));
      setTimeout(() => {
        setBouncingFrames((prev) => {
          const next = new Set(prev);
          next.delete(frameId);
          return next;
        });
      }, 800);
    });
    return () => {
      unsub();
      wsRef.current?.disconnect();
    };
  }, []);

  const allFrames = useMemo(() => {
    if (frames.length >= GRID_COLS * GRID_ROWS) return frames;
    const result = [...frames];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (!result.find((f) => f.gridX === x && f.gridY === y)) {
          result.push({
            id: `frame-gen-${x}-${y}`,
            projectId: selectedProject?.id || '',
            order: y * GRID_COLS + x,
            gridX: x,
            gridY: y,
            width: 1,
            height: 1,
          });
        }
      }
    }
    return result.sort((a, b) => a.order - b.order);
  }, [frames, selectedProject]);

  const useContain = allFrames.length > 50;

  const handleDrop = useCallback(
    (e: React.DragEvent, frameId: string) => {
      e.preventDefault();
      setDragOverFrameId(null);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          const url = ev.target?.result as string;
          setFrames((prev) =>
            prev.map((f) => (f.id === frameId ? { ...f, imageUrl: url } : f))
          );
        };
        reader.readAsDataURL(file);
        return;
      }
      const imageUrl = e.dataTransfer.getData('imageUrl');
      if (imageUrl) {
        setFrames((prev) =>
          prev.map((f) => (f.id === frameId ? { ...f, imageUrl } : f))
        );
      }
    },
    []
  );

  const handleResourceImageClick = (url: string) => {
    setDraggingImage(url);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      if (dragStateRef.current) {
        const s = dragStateRef.current;
        const dx = e.clientX - s.startX;
        const dy = e.clientY - s.startY;
        setDialogs((prev) => {
          const next = new Map(prev);
          const list = next.get(s.frameId) || [];
          const updated = list.map((d) => {
            if (d.id !== s.dialogId) return d;
            if (s.type === 'move') {
              return { ...d, x: s.origX + dx, y: s.origY + dy };
            } else {
              return {
                ...d,
                width: Math.max(60, s.origW + dx),
                height: Math.max(30, s.origH + dy),
              };
            }
          });
          next.set(s.frameId, updated);
          return next;
        });
      }
    };
    const handleUp = () => {
      dragStateRef.current = null;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  useEffect(() => {
    if (!draggingImage) return;
    const handleClick = () => setDraggingImage(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [draggingImage]);

  const handleFrameClickForImage = (frameId: string) => {
    if (draggingImage) {
      setFrames((prev) =>
        prev.map((f) => (f.id === frameId ? { ...f, imageUrl: draggingImage } : f))
      );
      setDraggingImage(null);
    } else {
      const frame = frames.find((f) => f.id === frameId);
      const order = frame ? frame.order : null;
      if (selectedFrameId === frameId) {
        onFrameSelect(null, null);
      } else {
        onFrameSelect(frameId, order);
      }
    }
  };

  const addDialog = (frameId: string, type: 'dialog' | 'sound') => {
    const newDialog: DialogBubble = {
      id: `dialog-${Date.now()}-${Math.random()}`,
      frameId,
      type,
      x: CELL_WIDTH / 2 - 60,
      y: CELL_HEIGHT / 2 - 20,
      width: type === 'sound' ? 100 : 120,
      height: type === 'sound' ? 40 : 50,
      text: type === 'sound' ? 'BAM!' : '对话框文字',
      tailDirection: 'bottom',
    };
    setDialogs((prev) => {
      const next = new Map(prev);
      const list = next.get(frameId) || [];
      next.set(frameId, [...list, newDialog]);
      return next;
    });
  };

  const deleteFrame = (frameId: string) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === frameId ? { ...f, imageUrl: undefined } : f))
    );
    setDialogs((prev) => {
      const next = new Map(prev);
      next.delete(frameId);
      return next;
    });
  };

  const deleteDialog = (frameId: string, dialogId: string) => {
    setDialogs((prev) => {
      const next = new Map(prev);
      const list = (next.get(frameId) || []).filter((d) => d.id !== dialogId);
      next.set(frameId, list);
      return next;
    });
  };

  const startDialogDrag = (
    e: React.MouseEvent,
    dialog: DialogBubble,
    type: 'move' | 'resize'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    dragStateRef.current = {
      dialogId: dialog.id,
      frameId: dialog.frameId,
      type,
      startX: e.clientX,
      startY: e.clientY,
      origX: dialog.x,
      origY: dialog.y,
      origW: dialog.width,
      origH: dialog.height,
    };
  };

  const calcFontSize = (width: number) => {
    const ratio = (width - 60) / 60;
    return Math.max(12, Math.min(18, 12 + ratio * 6));
  };

  const handleExport = () => {
    setIsExporting(true);
    setExportProgress(0);
    const interval = setInterval(() => {
      setExportProgress((p) => {
        const next = p + Math.random() * 15 + 5;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#f0f0f0';
              ctx.fillRect(0, 0, 100, 100);
              ctx.fillStyle = '#3c6382';
              ctx.font = 'bold 14px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('Storyboard', 50, 55);
            }
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${selectedProject?.name || 'storyboard'}.png`;
                a.click();
                URL.revokeObjectURL(url);
              }
              setIsExporting(false);
              setShowExportModal(false);
              setExportProgress(0);
            }, 'image/png');
          }, 500);
          return 100;
        }
        return next;
      });
    }, 300);
  };

  const keyframesStyle = `
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes bounce-badge {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.4); }
    }
    @keyframes spin-loading {
      to { transform: rotate(360deg); }
    }
  `;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <style>{keyframesStyle}</style>

      {draggingImage && (
        <img
          src={draggingImage}
          alt="dragging"
          style={{
            position: 'fixed',
            left: mousePos.x + 10,
            top: mousePos.y + 10,
            width: 80,
            height: 100,
            objectFit: 'cover',
            borderRadius: 8,
            opacity: 0.7,
            pointerEvents: 'none',
            zIndex: 2000,
            border: '2px dashed #ff6b6b',
          }}
        />
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
        padding: '0 24px',
        background: '#fff',
        borderBottom: '1px solid #e5e5e5',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Star size={20} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>
            {selectedProject ? selectedProject.name : '分镜画板'}
          </span>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          disabled={!selectedProject}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#3c6382',
            color: '#fff',
            fontSize: 16,
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            cursor: selectedProject ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
            opacity: selectedProject ? 1 : 0.5,
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            if (selectedProject) (e.currentTarget as HTMLButtonElement).style.background = '#2d4d66';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#3c6382';
          }}
        >
          <Download size={18} />
          导出
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          width: 240,
          background: '#1a1a2e',
          padding: '16px 10px',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          <h2 style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: 700,
            margin: '0 0 16px 10px',
          }}>我的项目</h2>
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProject(p)}
              style={{
                width: 220,
                height: 90,
                borderRadius: 14,
                background: '#2d2d44',
                padding: 12,
                marginBottom: 12,
                marginLeft: 'auto',
                marginRight: 'auto',
                border: `2px solid ${selectedProject?.id === p.id ? '#ff6b6b' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex',
                gap: 10,
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              {p.thumbnail ? (
                <img src={p.thumbnail} alt={p.name} style={{
                  width: 56, height: 66, borderRadius: 8, objectFit: 'cover', flexShrink: 0,
                }} />
              ) : (
                <div style={{
                  width: 56, height: 66, borderRadius: 8, background: '#3d3d5c',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Star size={24} color="#ff6b6b" />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', flex: 1 }}>
                <span style={{
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{p.name}</span>
                <span style={{ color: '#8888aa', fontSize: 11 }}>
                  {new Date(p.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          flex: 1,
          background: '#f0f0f0',
          overflow: 'auto',
          padding: 24,
        }}>
          {selectedProject ? (
            <>
              <div style={{
                background: '#fff',
                borderRadius: 12,
                padding: 12,
                marginBottom: 20,
              }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 8,
                  color: '#1a1a2e',
                }}>素材资源</div>
                <div style={{
                  display: 'flex',
                  gap: 12,
                  overflowX: 'auto',
                  paddingBottom: 4,
                }}>
                  {SAMPLE_IMAGES.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`资源 ${i + 1}`}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('imageUrl', url)}
                      onClick={() => handleResourceImageClick(url)}
                      style={{
                        width: 80,
                        height: 100,
                        objectFit: 'cover',
                        borderRadius: 8,
                        cursor: draggingImage === url ? 'grabbing' : 'grab',
                        flexShrink: 0,
                        border: `2px solid ${draggingImage === url ? '#ff6b6b' : 'transparent'}`,
                        transition: 'transform 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)';
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_WIDTH}px)`,
                gridAutoRows: `${CELL_HEIGHT}px`,
                gap: 20,
                justifyContent: 'flex-start',
              }}>
                {(() => {
                  const selectedFrameIdLocal = selectedFrameId;
                  return allFrames.map((frame) => {
                  const frameDialogs = dialogs.get(frame.id) || [];
                  const commentCount = commentCounts.get(frame.id) || 0;
                  const isBouncing = bouncingFrames.has(frame.id);
                  const isHovered = hoveredFrameId === frame.id;
                  const isDragOver = dragOverFrameId === frame.id;
                  const isSelected = frame.id === selectedFrameIdLocal;

                  return (
                    <div
                      key={frame.id}
                      style={{
                        width: CELL_WIDTH,
                        height: CELL_HEIGHT,
                        border: isSelected
                          ? '3px solid #ff6b6b'
                          : isDragOver
                          ? '2px dashed #ff6b6b'
                          : '1px solid #ccc',
                        boxShadow: isSelected
                          ? '0 0 0 4px rgba(255,107,107,0.2)'
                          : 'none',
                        borderRadius: 10,
                        background: '#fff',
                        overflow: 'hidden',
                        position: 'relative',
                        cursor: draggingImage ? 'copy' : 'default',
                        boxSizing: 'border-box',
                        ...(useContain ? { contain: 'layout paint' } : {}),
                      }}
                      onMouseEnter={() => setHoveredFrameId(frame.id)}
                      onMouseLeave={() => setHoveredFrameId(null)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverFrameId(frame.id);
                      }}
                      onDragLeave={() => setDragOverFrameId(null)}
                      onDrop={(e) => handleDrop(e, frame.id)}
                      onClick={() => handleFrameClickForImage(frame.id)}
                    >
                      {frame.imageUrl && (
                        <img
                          src={frame.imageUrl}
                          alt={`格子 ${frame.order + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            animation: 'fadeIn 0.3s ease',
                            userSelect: 'none',
                            pointerEvents: 'none',
                          }}
                        />
                      )}

                      {frameDialogs.map((d) => (
                        <div
                          key={d.id}
                          style={{
                            position: 'absolute',
                            left: d.x,
                            top: d.y,
                            width: d.width,
                            minWidth: 60,
                            minHeight: 30,
                            background: d.type === 'sound' ? '#fff3cd' : '#fff',
                            borderRadius: d.type === 'sound' ? 16 : 8,
                            padding: '8px 12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            cursor: 'move',
                            userSelect: 'none',
                            boxSizing: 'border-box',
                            zIndex: 5,
                            fontWeight: d.type === 'sound' ? 800 : 400,
                            color: d.type === 'sound' ? '#856404' : '#333',
                            fontSize: calcFontSize(d.width),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                          }}
                          onMouseDown={(e) => startDialogDrag(e, d, 'move')}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingDialogId(d.id);
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            bottom: -8,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 0,
                            height: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: `8px solid ${d.type === 'sound' ? '#fff3cd' : '#fff'}`,
                          }} />
                          {editingDialogId === d.id ? (
                            <div
                              contentEditable
                              suppressContentEditableWarning
                              autoFocus
                              style={{
                                outline: 'none',
                                width: '100%',
                                minHeight: 20,
                              }}
                              onBlur={(e) => {
                                const text = (e.currentTarget as HTMLDivElement).innerText;
                                setDialogs((prev) => {
                                  const next = new Map(prev);
                                  const list = next.get(d.frameId) || [];
                                  next.set(
                                    d.frameId,
                                    list.map((x) => (x.id === d.id ? { ...x, text } : x))
                                  );
                                  return next;
                                });
                                setEditingDialogId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  (e.currentTarget as HTMLDivElement).blur();
                                }
                              }}
                              ref={(el) => {
                                if (el) {
                                  el.focus();
                                  const range = document.createRange();
                                  range.selectNodeContents(el);
                                  const sel = window.getSelection();
                                  sel?.removeAllRanges();
                                  sel?.addRange(range);
                                }
                              }}
                            >
                              {d.text}
                            </div>
                          ) : (
                            <span style={{ wordBreak: 'break-word', lineHeight: 1.3 }}>{d.text}</span>
                          )}
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              bottom: 0,
                              width: 12,
                              height: 12,
                              cursor: 'nwse-resize',
                              background:
                                'linear-gradient(135deg, transparent 50%, #bbb 50%)',
                              borderBottomRightRadius: d.type === 'sound' ? 16 : 8,
                            }}
                            onMouseDown={(e) => startDialogDrag(e, d, 'resize')}
                          />
                        </div>
                      ))}

                      {commentCount > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            fontSize: 12,
                            color: '#fff',
                            background: '#ff4757',
                            borderRadius: '50%',
                            width: 20,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            zIndex: 10,
                            animation: isBouncing ? 'bounce-badge 0.6s ease' : undefined,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {commentCount > 9 ? '9+' : commentCount}
                        </div>
                      )}

                      {isHovered && (
                        <div
                          style={{
                            position: 'absolute',
                            top: -44,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(255,255,255,0.95)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: 12,
                            padding: 8,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                            display: 'flex',
                            gap: 4,
                            zIndex: 20,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {[
                            { Icon: Pencil, title: '编辑' },
                            { Icon: MessageCircle, title: '对话框', action: () => addDialog(frame.id, 'dialog') },
                            { Icon: Volume2, title: '拟声词', action: () => addDialog(frame.id, 'sound') },
                            { Icon: Trash2, title: '删除', action: () => deleteFrame(frame.id), danger: true },
                          ].map(({ Icon, title, action, danger }, idx) => (
                            <button
                              key={idx}
                              title={title}
                              onClick={action}
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 8,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#555',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background 0.15s, color 0.15s, transform 0.1s',
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
                                (e.currentTarget as HTMLButtonElement).style.color = danger ? '#ff4757' : '#ff6b6b';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                (e.currentTarget as HTMLButtonElement).style.color = '#555';
                              }}
                              onMouseDown={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                              }}
                              onMouseUp={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                              }}
                            >
                              <Icon size={20} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })})()}
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '70%',
              flexDirection: 'column',
              gap: 16,
              color: '#888',
            }}>
              <Star size={64} color="#ccc" />
              <div style={{ fontSize: 18 }}>请从左侧选择一个项目开始创作</div>
            </div>
          )}
        </div>
      </div>

      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !isExporting && setShowExportModal(false)}
        >
          <div
            style={{
              width: 500,
              minHeight: 300,
              borderRadius: 20,
              padding: 32,
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#1a1a2e' }}>导出设置</h2>
              {!isExporting && (
                <button
                  onClick={() => setShowExportModal(false)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none',
                    background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#888',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {!isExporting ? (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, color: '#555', marginBottom: 8, fontWeight: 500 }}>
                    每行格子数
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={8}
                    value={exportConfig.colsPerRow}
                    onChange={(e) => {
                      const v = Math.max(2, Math.min(8, parseInt(e.target.value) || 2));
                      setExportConfig((c) => ({ ...c, colsPerRow: v }));
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #ddd',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                    onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = '#3c6382'; }}
                    onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = '#ddd'; }}
                  />
                </div>
                <div style={{ marginBottom: 'auto' }}>
                  <label style={{ display: 'block', fontSize: 14, color: '#555', marginBottom: 8, fontWeight: 500 }}>
                    图片宽度 (px)
                  </label>
                  <input
                    type="number"
                    min={800}
                    max={4000}
                    step={100}
                    value={exportConfig.imageWidth}
                    onChange={(e) => {
                      const v = Math.max(800, Math.min(4000, parseInt(e.target.value) || 800));
                      setExportConfig((c) => ({ ...c, imageWidth: v }));
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #ddd',
                      fontSize: 14,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                    onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = '#3c6382'; }}
                    onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = '#ddd'; }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button
                    onClick={() => setShowExportModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      borderRadius: 10,
                      border: '1px solid #ddd',
                      background: '#fff',
                      color: '#555',
                      fontSize: 15,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f9f9f9'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleExport}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#3c6382',
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2d4d66'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#3c6382'; }}
                  >
                    确认导出
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  border: '4px solid #e8eef3',
                  borderTopColor: '#3c6382',
                  animation: 'spin-loading 0.8s linear infinite',
                }} />
                <div style={{ fontSize: 16, color: '#555', fontWeight: 500 }}>正在生成图片...</div>
                <div style={{ width: '100%', height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: '#2ed573',
                    width: `${exportProgress}%`,
                    transition: 'width 0.5s ease',
                    borderRadius: 4,
                  }} />
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>{Math.round(exportProgress)}%</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
