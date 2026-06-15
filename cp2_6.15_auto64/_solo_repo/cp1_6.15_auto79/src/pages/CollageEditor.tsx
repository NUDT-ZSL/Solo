import { useState, useEffect, useRef, useCallback } from 'react';
import { dataService, Material } from '../services/DataService';
import { dragService, CanvasMaterial } from '../services/DragService';

interface CollageEditorProps {
  onBack: () => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  materialId: string | null;
}

interface DragGhostState {
  visible: boolean;
  x: number;
  y: number;
  material: Material | null;
  delayed: boolean;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function CollageEditor({ onBack }: CollageEditorProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('全部');
  const [canvasMaterials, setCanvasMaterials] = useState<CanvasMaterial[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, materialId: null
  });
  const [dragGhost, setDragGhost] = useState<DragGhostState>({
    visible: false, x: 0, y: 0, material: null, delayed: false
  });
  const [panelOpen, setPanelOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragTimerRef = useRef<number | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const updateLayout = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
    };
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  useEffect(() => {
    dataService.fetchMaterials(undefined, undefined, 1, 30)
      .then(r => setMaterials(r.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const unsubscribe = dragService.subscribe(() => {
      setCanvasMaterials(dragService.getMaterials());
      setSelectedId(dragService.getSelectedId());
    });
    return unsubscribe;
  }, []);

  const filteredMaterials = materials.filter(m => {
    if (category !== '全部' && m.category !== category) return false;
    if (search) {
      const kw = search.toLowerCase();
      return m.name.toLowerCase().includes(kw) ||
        m.tags.some(t => t.toLowerCase().includes(kw));
    }
    return true;
  });

  const handlePanelDragStart = (e: React.MouseEvent | React.TouchEvent, mat: Material) => {
    e.preventDefault();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    setDragGhost({ visible: true, x: clientX, y: clientY, material: mat, delayed: false });

    if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    dragTimerRef.current = window.setTimeout(() => {
      setDragGhost(prev => prev.visible ? { ...prev, delayed: true } : prev);
    }, 100);

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      let cx: number, cy: number;
      if ('touches' in ev) {
        cx = ev.touches[0].clientX;
        cy = ev.touches[0].clientY;
      } else {
        cx = ev.clientX;
        cy = ev.clientY;
      }
      setDragGhost(prev => prev.visible ? { ...prev, x: cx, y: cy } : prev);
    };

    const handleEnd = (ev: MouseEvent | TouchEvent) => {
      let cx: number, cy: number;
      if ('changedTouches' in ev) {
        cx = ev.changedTouches[0].clientX;
        cy = ev.changedTouches[0].clientY;
      } else {
        cx = ev.clientX;
        cy = ev.clientY;
      }

      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
        dragTimerRef.current = null;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const localX = (cx - rect.left) * scaleX;
        const localY = (cy - rect.top) * scaleY;

        if (localX >= 0 && localX <= CANVAS_WIDTH && localY >= 0 && localY <= CANVAS_HEIGHT) {
          const w = Math.min(mat.width, 150);
          const h = (mat.height / mat.width) * w;
          dragService.addMaterial(
            mat.id,
            mat.image,
            localX - w / 2,
            localY - h / 2,
            w,
            h
          );
        }
      }

      setDragGhost({ visible: false, x: 0, y: 0, material: null, delayed: false });
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  const handleCanvasMaterialMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    dragService.selectMaterial(id);
    dragService.startDrag(id, e.clientX, e.clientY);

    const handleMove = (ev: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      dragService.onMove(ev.clientX, ev.clientY);
    };

    const handleUp = () => {
      dragService.endDrag();
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasbg) {
      dragService.selectMaterial(null);
      setContextMenu({ visible: false, x: 0, y: 0, materialId: null });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, id?: string) => {
    e.preventDefault();
    if (id) {
      dragService.selectMaterial(id);
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, materialId: id });
    } else {
      setContextMenu({ visible: false, x: 0, y: 0, materialId: null });
    }
  };

  const handleResizeStart = (e: React.MouseEvent, id: string, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    dragService.startResize(id, handle as any, e.clientX, e.clientY);

    const handleMove = (ev: MouseEvent) => {
      dragService.onMove(ev.clientX, ev.clientY);
    };

    const handleUp = () => {
      dragService.endDrag();
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleRotateStart = (e: React.MouseEvent, id: string, centerX: number, centerY: number) => {
    e.stopPropagation();
    e.preventDefault();
    dragService.startRotate(id, e.clientX, e.clientY, centerX, centerY);

    const handleMove = (ev: MouseEvent) => {
      dragService.onMove(ev.clientX, ev.clientY, centerX, centerY);
    };

    const handleUp = () => {
      dragService.endDrag();
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleMenuBringToFront = () => {
    if (contextMenu.materialId) {
      dragService.bringToFront(contextMenu.materialId);
    }
    setContextMenu({ visible: false, x: 0, y: 0, materialId: null });
  };

  const handleMenuDuplicate = () => {
    if (contextMenu.materialId) {
      dragService.duplicateMaterial(contextMenu.materialId);
    }
    setContextMenu({ visible: false, x: 0, y: 0, materialId: null });
  };

  const handleMenuDelete = () => {
    if (contextMenu.materialId) {
      dragService.deleteMaterial(contextMenu.materialId);
    }
    setContextMenu({ visible: false, x: 0, y: 0, materialId: null });
  };

  const handleExport = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFF8F0';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#E0D8C8';
    for (let x = 0; x < CANVAS_WIDTH; x += 20) {
      for (let y = 0; y < CANVAS_HEIGHT; y += 20) {
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const sorted = [...canvasMaterials].sort((a, b) => a.zIndex - b.zIndex);

    const loadImage = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img);
        img.src = src;
      });

    for (const mat of sorted) {
      const img = await loadImage(mat.image);
      ctx.save();
      const cx = mat.x + mat.width / 2;
      const cy = mat.y + mat.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((mat.rotation * Math.PI) / 180);
      ctx.drawImage(img, -mat.width / 2, -mat.height / 2, mat.width, mat.height);
      ctx.restore();
    }

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `手帐拼贴_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const renderHandles = (mat: CanvasMaterial, canvasRect: DOMRect) => {
    if (selectedId !== mat.id) return null;

    const scaleX = canvasRect.width / CANVAS_WIDTH;
    const scaleY = canvasRect.height / CANVAS_HEIGHT;

    const left = mat.x * scaleX;
    const top = mat.y * scaleY;
    const w = mat.width * scaleX;
    const h = mat.height * scaleY;

    const handleSize = 8;
    const positions = [
      { pos: 'nw', x: left - handleSize / 2, y: top - handleSize / 2, cursor: 'nw-resize' },
      { pos: 'n', x: left + w / 2 - handleSize / 2, y: top - handleSize / 2, cursor: 'n-resize' },
      { pos: 'ne', x: left + w - handleSize / 2, y: top - handleSize / 2, cursor: 'ne-resize' },
      { pos: 'e', x: left + w - handleSize / 2, y: top + h / 2 - handleSize / 2, cursor: 'e-resize' },
      { pos: 'se', x: left + w - handleSize / 2, y: top + h - handleSize / 2, cursor: 'se-resize' },
      { pos: 's', x: left + w / 2 - handleSize / 2, y: top + h - handleSize / 2, cursor: 's-resize' },
      { pos: 'sw', x: left - handleSize / 2, y: top + h - handleSize / 2, cursor: 'sw-resize' },
      { pos: 'w', x: left - handleSize / 2, y: top + h / 2 - handleSize / 2, cursor: 'w-resize' },
    ];

    const rotateHandle = {
      x: left + w / 2 - handleSize / 2,
      y: top - 30 - handleSize / 2
    };

    const centerX = canvasRect.left + left + w / 2;
    const centerY = canvasRect.top + top + h / 2;

    return (
      <>
        {positions.map(p => (
          <div
            key={p.pos}
            onMouseDown={e => handleResizeStart(e, mat.id, p.pos)}
            style={{
              position: 'absolute',
              left: p.x, top: p.y,
              width: handleSize, height: handleSize,
              borderRadius: '50%',
              background: '#D4A574',
              border: '2px solid #FFF8F0',
              cursor: p.cursor,
              zIndex: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }}
          />
        ))}
        <div
          onMouseDown={e => handleRotateStart(e, mat.id, centerX, centerY)}
          style={{
            position: 'absolute',
            left: rotateHandle.x, top: rotateHandle.y,
            width: handleSize + 4, height: handleSize + 4,
            borderRadius: '50%',
            background: '#D4A574',
            border: '2px solid #FFF8F0',
            cursor: 'grab',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF8F0',
            fontSize: 10,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}
        >↻</div>
        <div style={{
          position: 'absolute',
          left: left + w / 2 - 0.5,
          top: top - 26,
          width: 1, height: 26,
          background: '#D4A574',
          zIndex: 9
        }} />
      </>
    );
  };

  const panelWidth = isMobile ? undefined : (isTablet ? (panelOpen ? 280 : 0) : 280);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: '#F5F0EB',
      overflow: 'hidden'
    }}>
      <header style={{
        padding: '12px 20px',
        background: '#FFF8F0',
        borderBottom: '1px solid #E0D8C8',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 2px 6px #E0D8C8',
        flexShrink: 0,
        zIndex: 10
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '8px 14px', borderRadius: 8,
            border: '1px solid #E0D8C8',
            background: '#F5F0EB', color: '#8B7355',
            cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 4
          }}
        >← 返回</button>

        <h1 style={{
          fontSize: 18, color: '#8B7355', fontWeight: 700,
          fontFamily: 'Georgia, serif', fontStyle: 'italic',
          flex: 1
        }}>✿ 拼贴编辑</h1>

        {(isTablet || isMobile) && (
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            style={{
              padding: '8px 12px', borderRadius: 8,
              border: 'none', background: '#D4A574',
              color: '#FFF8F0', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              boxShadow: '0 2px 6px #E0D8C8'
            }}
          >☰ 素材</button>
        )}

        <button
          onClick={() => dragService.clearCanvas()}
          style={{
            padding: '8px 14px', borderRadius: 8,
            border: '1px solid #E0D8C8',
            background: '#FFF8F0', color: '#8B7355',
            cursor: 'pointer', fontSize: 14
          }}
        >清空</button>

        <button
          onClick={handleExport}
          style={{
            padding: '8px 18px', borderRadius: 8,
            border: 'none',
            background: '#8B7355', color: '#FFF8F0',
            cursor: 'pointer', fontSize: 14, fontWeight: 600,
            boxShadow: '0 2px 6px #E0D8C8'
          }}
        >导出 PNG</button>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {!isMobile && (
          <aside style={{
            width: panelWidth,
            flexShrink: 0,
            background: '#FFF8F0',
            borderRight: '1px solid #E0D8C8',
            overflow: 'hidden',
            transition: 'width 0.3s ease',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: 12, borderBottom: '1px solid #E0D8C8' }}>
              <input
                type="text"
                placeholder="搜索素材..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid #E0D8C8',
                  background: '#F5F0EB',
                  outline: 'none', fontSize: 13,
                  marginBottom: 8, color: '#4A3F35'
                }}
              />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #E0D8C8',
                  background: '#F5F0EB',
                  outline: 'none', fontSize: 13,
                  color: '#4A3F35'
                }}
              >
                {['全部', '手绘', '复古', '和风', '简约', '节日'].map(c =>
                  <option key={c} value={c}>{c}</option>
                )}
              </select>
            </div>
            <div style={{
              flex: 1, overflowY: 'auto',
              padding: 12,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8
            }}>
              {filteredMaterials.map(mat => (
                <div
                  key={mat.id}
                  onMouseDown={e => handlePanelDragStart(e, mat)}
                  onTouchStart={e => handlePanelDragStart(e, mat)}
                  style={{
                    background: '#F5F0EB',
                    borderRadius: 6,
                    overflow: 'hidden',
                    cursor: 'grab',
                    border: '1px solid #E0D8C8',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    userSelect: 'none'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 3px 8px #D4C8B8';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: '100%',
                    paddingBottom: '100%',
                    background: '#F0EDE8',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <img src={mat.thumbnail} alt={mat.name}
                      style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        pointerEvents: 'none'
                      }} draggable={false} />
                  </div>
                  <div style={{
                    padding: '4px 6px',
                    fontSize: 11,
                    color: '#4A3F35',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center'
                  }}>{mat.name}</div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {isMobile && panelOpen && (
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            height: '50%',
            background: '#FFF8F0',
            borderTop: '1px solid #E0D8C8',
            zIndex: 50,
            animation: 'slideUp 0.3s ease',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderBottom: '1px solid #E0D8C8'
            }}>
              <h3 style={{ color: '#8B7355', fontSize: 14 }}>素材列表</h3>
              <button
                onClick={() => setPanelOpen(false)}
                style={{
                  border: 'none', background: 'transparent',
                  cursor: 'pointer', fontSize: 20,
                  color: '#8B7355'
                }}
              >×</button>
            </div>
            <div style={{ padding: 8, display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="搜索..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid #E0D8C8',
                  background: '#F5F0EB',
                  outline: 'none', fontSize: 12
                }}
              />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  padding: '6px 8px', borderRadius: 6,
                  border: '1px solid #E0D8C8',
                  background: '#F5F0EB',
                  outline: 'none', fontSize: 12
                }}
              >
                {['全部', '手绘', '复古', '和风', '简约', '节日'].map(c =>
                  <option key={c} value={c}>{c}</option>
                )}
              </select>
            </div>
            <div style={{
              flex: 1, overflowY: 'auto',
              padding: 8,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6
            }}>
              {filteredMaterials.map(mat => (
                <div
                  key={mat.id}
                  onTouchStart={e => handlePanelDragStart(e, mat)}
                  style={{
                    background: '#F5F0EB',
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: '1px solid #E0D8C8'
                  }}
                >
                  <div style={{
                    width: '100%', paddingBottom: '100%',
                    position: 'relative', overflow: 'hidden'
                  }}>
                    <img src={mat.thumbnail} alt={mat.name}
                      style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover'
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <main style={{
          flex: 1, overflow: 'auto',
          padding: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F0EDE8'
        }}
          onClick={() => setContextMenu({ visible: false, x: 0, y: 0, materialId: null })}
        >
          <div
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onContextMenu={e => handleContextMenu(e)}
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              maxWidth: '100%',
              background: '#FFF8F0',
              borderRadius: 8,
              boxShadow: '0 4px 12px #D4C8B8',
              position: 'relative',
              overflow: 'visible',
              backgroundImage: `radial-gradient(#E0D8C8 1px, transparent 1px)`,
              backgroundSize: '20px 20px'
            }}
            data-canvasbg="true"
          >
            {canvasMaterials.map(mat => {
              const isSelected = selectedId === mat.id;
              return (
                <div
                  key={mat.id}
                  onMouseDown={e => handleCanvasMaterialMouseDown(e, mat.id)}
                  onContextMenu={e => handleContextMenu(e, mat.id)}
                  style={{
                    position: 'absolute',
                    left: mat.x, top: mat.y,
                    width: mat.width, height: mat.height,
                    cursor: isSelected ? 'move' : 'pointer',
                    transform: `rotate(${mat.rotation}deg)`,
                    transformOrigin: 'center center',
                    zIndex: mat.zIndex,
                    outline: isSelected ? '2px dashed #D4A574' : 'none',
                    outlineOffset: 2
                  }}
                >
                  <img
                    src={mat.image}
                    alt=""
                    draggable={false}
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'contain',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      WebkitUserDrag: 'none'
                    }}
                  />
                </div>
              );
            })}

            {canvasRef.current && selectedId && canvasMaterials
              .filter(m => m.id === selectedId)
              .map(m => (
                <div key={`handles-${m.id}`} style={{
                  position: 'absolute',
                  left: 0, top: 0, right: 0, bottom: 0,
                  pointerEvents: 'none',
                  zIndex: 9999
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    pointerEvents: 'auto'
                  }}>
                    {renderHandles(m, canvasRef.current!.getBoundingClientRect())}
                  </div>
                </div>
              ))
            }
          </div>
        </main>
      </div>

      {dragGhost.visible && dragGhost.material && (
        <div style={{
          position: 'fixed',
          left: dragGhost.x - 50,
          top: dragGhost.y - 50,
          width: 100, height: 100,
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: dragGhost.delayed ? 0.6 : 0.8,
          transition: 'opacity 0.1s ease',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <img
            src={dragGhost.material.image}
            alt=""
            style={{
              width: '100%', height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none'
            }}
            draggable={false}
          />
        </div>
      )}

      {contextMenu.visible && (
        <div style={{
          position: 'fixed',
          left: contextMenu.x, top: contextMenu.y,
          background: '#FFF8F0',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          border: '1px solid #E0D8C8',
          padding: 4,
          zIndex: 9999,
          minWidth: 120,
          animation: 'fadeInMenu 0.15s ease'
        }}>
          {[
            { label: '置顶', icon: '↑', action: handleMenuBringToFront },
            { label: '复制', icon: '⎘', action: handleMenuDuplicate },
            { label: '删除', icon: '✕', action: handleMenuDelete }
          ].map(item => (
            <div
              key={item.label}
              onClick={item.action}
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: '#4A3F35',
                borderRadius: 4,
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F0EDE8'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ color: '#D4A574', width: 16 }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      )}

      <canvas ref={exportCanvasRef} style={{ display: 'none' }} />
    </div>
  );
}
