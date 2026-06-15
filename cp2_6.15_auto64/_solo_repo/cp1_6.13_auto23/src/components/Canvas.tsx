import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Palette, ColorStop, GradientType, LinearDirection, RadialShape } from '../types';
import { generateCSSGradient, getMiddleColorBetweenStops } from '../utils/colorUtils';

interface CanvasProps {
  palette: Palette;
  onUpdateColorStops: (stops: ColorStop[]) => void;
  onUpdateType: (type: GradientType) => void;
  onUpdateDirection: (direction: LinearDirection) => void;
  onUpdateShape: (shape: RadialShape) => void;
  onRename: (id: string, name: string) => void;
  onShowToast: (msg: string) => void;
}

interface ColorNodeProps {
  stop: ColorStop;
  barWidth: number;
  barLeft: number;
  isDragging: boolean;
  isRemoving: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onColorChange: (color: string) => void;
}

const ColorNode = memo(function ColorNode({
  stop,
  barWidth,
  barLeft,
  isDragging,
  isRemoving,
  onPointerDown,
  onClick,
  onColorChange
}: ColorNodeProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(e);
    if (!e.ctrlKey && !e.metaKey) {
      // 打开颜色选择器
      setTimeout(() => inputRef.current?.click(), 10);
    }
  };

  const left = barLeft + stop.position * barWidth - 16;

  return (
    <div
      style={{
        position: 'absolute',
        top: 80 - 12,
        left,
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        touchAction: 'none',
        transform: isRemoving ? 'scale(0)' : (isDragging ? 'scale(1.2)' : 'scale(1)'),
        transition: isRemoving
          ? 'transform 0.15s ease-in, opacity 0.15s ease-in'
          : (isDragging ? 'none' : 'transform 0.15s ease-out'),
        opacity: isRemoving ? 0 : 1,
        zIndex: isDragging ? 20 : 10
      }}
      onPointerDown={onPointerDown}
      onClick={handleNodeClick}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: stop.color,
          border: '3px solid #ffffff',
          boxShadow: isDragging
            ? '0 6px 18px rgba(0,0,0,0.4), 0 0 0 3px rgba(129,140,248,0.45)'
            : '0 2px 8px rgba(0,0,0,0.25)',
          transition: isDragging ? 'none' : 'box-shadow 0.15s ease'
        }}
      />
      <input
        ref={inputRef}
        type="color"
        value={stop.color}
        onChange={e => onColorChange(e.target.value)}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          width: 16,
          height: 16,
          opacity: 0,
          pointerEvents: 'none',
          cursor: 'pointer'
        }}
      />
    </div>
  );
});

export function Canvas({
  palette,
  onUpdateColorStops,
  onUpdateType,
  onUpdateDirection,
  onUpdateShape,
  onRename,
  onShowToast
}: CanvasProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(palette.name);
  const [barRect, setBarRect] = useState<{ left: number; width: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dragDataRef = useRef<{
    startX: number;
    startPos: number;
    stopId: string;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ [id: string]: number }>({});

  // 初始化 lastPosRef
  useEffect(() => {
    for (const s of palette.colorStops) {
      if (lastPosRef.current[s.id] === undefined) {
        lastPosRef.current[s.id] = s.position;
      }
    }
  }, [palette.colorStops]);

  const sortedStops = [...palette.colorStops].sort((a, b) => a.position - b.position);

  const updateBarRect = useCallback(() => {
    if (barRef.current) {
      const r = barRef.current.getBoundingClientRect();
      setBarRect({ left: r.left, width: r.width });
    }
  }, []);

  useEffect(() => {
    updateBarRect();
    window.addEventListener('resize', updateBarRect);
    return () => window.removeEventListener('resize', updateBarRect);
  }, [updateBarRect]);

  // 处理节点颜色修改
  const handleNodeColorChange = useCallback((stopId: string, color: string) => {
    onUpdateColorStops(
      palette.colorStops.map(s =>
        s.id === stopId ? { ...s, color } : s
      )
    );
  }, [palette.colorStops, onUpdateColorStops]);

  // 处理在预览条上点击添加节点
  const handleBarClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== barRef.current) return;
    if (palette.colorStops.length >= 6) {
      onShowToast('最多只能添加 6 个颜色节点');
      return;
    }
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const clampedPos = Math.max(0.02, Math.min(0.98, pos));

    // 找到左右相邻节点
    const sorted = [...palette.colorStops].sort((a, b) => a.position - b.position);
    let leftIdx = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].position <= clampedPos) {
        leftIdx = i;
      }
    }
    const rightIdx = Math.min(sorted.length - 1, leftIdx + 1);
    const leftStop = sorted[leftIdx];
    const rightStop = sorted[rightIdx];
    const midColor = getMiddleColorBetweenStops(
      leftStop.color,
      rightStop.color,
      leftStop.position,
      rightStop.position,
      clampedPos
    );

    const newStop: ColorStop = {
      id: uuidv4(),
      color: midColor,
      position: clampedPos
    };
    onUpdateColorStops([...palette.colorStops, newStop]);
  }, [palette.colorStops, onUpdateColorStops, onShowToast]);

  // 处理点击节点（删除逻辑 Ctrl + Click）
  const handleNodeClick = useCallback((stop: ColorStop, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (palette.colorStops.length <= 2) {
        onShowToast('至少保留 2 个颜色节点');
        return;
      }
      // 删除动画
      setRemovingId(stop.id);
      setTimeout(() => {
        const remaining = palette.colorStops.filter(s => s.id !== stop.id);
        // 重新均匀分布
        const sorted = [...remaining].sort((a, b) => a.position - b.position);
        const redistributed = sorted.map((s, i) => {
          if (sorted.length === 1) return { ...s, position: 0.5 };
          return { ...s, position: i / (sorted.length - 1) };
        });
        onUpdateColorStops(redistributed);
        setRemovingId(null);
      }, 150);
    }
  }, [palette.colorStops, onUpdateColorStops, onShowToast]);

  // 节点拖拽
  const handlePointerDown = useCallback((stopId: string, e: React.PointerEvent) => {
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const stop = palette.colorStops.find(s => s.id === stopId);
    if (!stop || !barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    dragDataRef.current = {
      startX: e.clientX,
      startPos: stop.position,
      stopId
    };
    setDraggingId(stopId);
    setBarRect({ left: rect.left, width: rect.width });

    const handleMove = (ev: PointerEvent) => {
      if (!dragDataRef.current || !barRect) return;
      const delta = ev.clientX - dragDataRef.current.startX;
      const barWidth = barRect.width;
      if (barWidth <= 0) return;
      const posDelta = delta / barWidth;
      let newPos = dragDataRef.current.startPos + posDelta;
      newPos = Math.max(0, Math.min(1, newPos));

      // 批量帧更新
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!dragDataRef.current) return;
        const id = dragDataRef.current.stopId;
        // 不允许越过相邻节点
        const sorted = [...palette.colorStops].sort((a, b) => a.position - b.position);
        const idx = sorted.findIndex(s => s.id === id);
        if (idx > 0) {
          const minPos = (sorted[idx - 1].position + 0.001);
          newPos = Math.max(newPos, minPos);
        }
        if (idx < sorted.length - 1) {
          const maxPos = (sorted[idx + 1].position - 0.001);
          newPos = Math.min(newPos, maxPos);
        }
        if (Math.abs((lastPosRef.current[id] ?? -1) - newPos) > 0.0005) {
          lastPosRef.current[id] = newPos;
          onUpdateColorStops(
            palette.colorStops.map(s =>
              s.id === id ? { ...s, position: newPos } : s
            )
          );
        }
      });
    };

    const handleUp = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      dragDataRef.current = null;
      setDraggingId(null);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }, [palette.colorStops, barRect, onUpdateColorStops]);

  const gradientStyle = {
    background: generateCSSGradient(palette),
    transition: 'background 0.3s ease'
  };

  const commitName = () => {
    onRename(palette.id, editName);
    setEditingName(false);
  };

  return (
    <div
      style={{
        padding: '32px 40px',
        height: '100%',
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        maxWidth: 960,
        margin: '0 auto',
        width: '100%'
      }}
    >
      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        {editingName ? (
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => {
              if (e.key === 'Enter') commitName();
              if (e.key === 'Escape') setEditingName(false);
            }}
            autoFocus
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#e0e0f0',
              background: 'rgba(255,255,255,0.08)',
              padding: '6px 10px',
              borderRadius: 8,
              flex: 1,
              outline: 'none',
              border: '1px solid #6366f1',
              maxWidth: 400
            }}
          />
        ) : (
          <div
            onDoubleClick={() => {
              setEditingName(true);
              setEditName(palette.name);
            }}
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#e0e0f0',
              cursor: 'text',
              padding: '6px 10px',
              margin: '-6px -10px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 400
            }}
            title="双击重命名"
          >
            {palette.name}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            padding: '4px 10px',
            borderRadius: 6,
            background: 'rgba(129,140,248,0.15)',
            color: '#a5b4fc',
            fontSize: 12,
            fontWeight: 500
          }}>
            {palette.colorStops.length} / 6 节点
          </span>
        </div>
      </div>

      {/* 渐变预览 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          padding: '0 16px',
          marginTop: 16
        }}
      >
        <div
          ref={barRef}
          onClick={handleBarClick}
          style={{
            position: 'relative',
            width: '100%',
            height: 80,
            borderRadius: 12,
            ...gradientStyle,
            cursor: 'crosshair',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          {sortedStops.map(stop => (
            <ColorNode
              key={stop.id}
              stop={stop}
              barWidth={barRect?.width || 0}
              barLeft={16}
              isDragging={draggingId === stop.id}
              isRemoving={removingId === stop.id}
              onPointerDown={(e) => handlePointerDown(stop.id, e)}
              onClick={(e) => handleNodeClick(stop, e)}
              onColorChange={(c) => handleNodeColorChange(stop.id, c)}
            />
          ))}
        </div>
        <div style={{
          marginTop: 8,
          fontSize: 11,
          color: '#666680',
          textAlign: 'center',
          lineHeight: 1.6
        }}>
          提示：在渐变条空白处单击添加节点 · 单击节点修改颜色 · Ctrl/⌘ + 单击节点删除 · 拖拽节点调整位置
        </div>
      </div>

      {/* 渐变类型切换 */}
      <div style={{
        padding: '20px',
        borderRadius: 12,
        background: '#2a2a3e',
        border: '1px solid #3a3a4e',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e0f0' }}>渐变模式</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['linear', 'radial'] as GradientType[]).map(type => (
              <button
                key={type}
                onClick={() => onUpdateType(type)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  background: palette.type === type ? '#6366f1' : '#3a3a4e',
                  color: palette.type === type ? '#ffffff' : '#e0e0f0',
                  transition: 'all 0.2s ease'
                }}
              >
                {type === 'linear' ? '线性渐变' : '径向渐变'}
              </button>
            ))}
          </div>
        </div>

        {palette.type === 'linear' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            borderTop: '1px solid #3a3a4e',
            paddingTop: 16
          }}>
            <div style={{ fontSize: 13, color: '#aaaaca' }}>方向</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['to right', 'to bottom', 'diagonal'] as LinearDirection[]).map(dir => {
                const active = palette.direction === dir;
                const labels = {
                  'to right': '→ 向右',
                  'to bottom': '↓ 向下',
                  'diagonal': '↘ 对角'
                };
                return (
                  <button
                    key={dir}
                    onClick={() => onUpdateDirection(dir)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      background: active ? 'rgba(129,140,248,0.25)' : 'rgba(255,255,255,0.04)',
                      color: active ? '#a5b4fc' : '#aaaaca',
                      border: active ? '1px solid rgba(129,140,248,0.4)' : '1px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {labels[dir]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {palette.type === 'radial' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            borderTop: '1px solid #3a3a4e',
            paddingTop: 16
          }}>
            <div style={{ fontSize: 13, color: '#aaaaca' }}>形状</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['circle', 'ellipse'] as RadialShape[]).map(shape => {
                const active = (palette.shape || 'circle') === shape;
                return (
                  <button
                    key={shape}
                    onClick={() => onUpdateShape(shape)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      background: active ? 'rgba(129,140,248,0.25)' : 'rgba(255,255,255,0.04)',
                      color: active ? '#a5b4fc' : '#aaaaca',
                      border: active ? '1px solid rgba(129,140,248,0.4)' : '1px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {shape === 'circle' ? '● 圆形' : '⬮ 椭圆'}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 颜色节点列表 */}
      <div style={{
        padding: '20px',
        borderRadius: 12,
        background: '#2a2a3e',
        border: '1px solid #3a3a4e',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e0f0' }}>颜色节点</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {sortedStops.map((stop, idx) => (
            <div
              key={stop.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
            >
              <label
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: stop.color,
                  border: '2px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <input
                  type="color"
                  value={stop.color}
                  onChange={e => handleNodeColorChange(stop.id, e.target.value)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    margin: 0,
                    padding: 0,
                    border: 'none',
                    width: '100%',
                    height: '100%'
                  }}
                />
              </label>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e0e0f0', letterSpacing: '0.5px', fontFamily: 'monospace' }}>
                  {stop.color.toUpperCase()}
                </div>
                <div style={{ fontSize: 11, color: '#8888a0' }}>
                  位置 {(stop.position * 100).toFixed(0)}% · #{idx + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 遮罩层 */}
      {colorPickerOpen && (
        <div
          onClick={() => setColorPickerOpen(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 50
          }}
        />
      )}
    </div>
  );
}
