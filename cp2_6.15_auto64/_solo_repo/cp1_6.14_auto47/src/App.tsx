import React, { useReducer, useState, useRef, useEffect } from 'react';
import Editor from './Editor';
import {
  EditorStateShape,
  Action,
  editorReducer,
  createInitialState,
  ELEMENT_COLORS,
  ELEMENT_LABELS,
  ElementType
} from './EditorState';
import { downloadMapJson, importMap, readFileAsText, ImportResult } from './IOHandler';

const TOOLBOX_ELEMENTS: ElementType[] = [
  'grass', 'dirt', 'sand', 'water', 'rock', 'tree', 'building', 'start', 'end'
];

interface ToolItemProps {
  type: ElementType;
  selected: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  compact?: boolean;
}

const ToolItem: React.FC<ToolItemProps> = ({
  type, selected, onSelect, onDragStart, onDragEnd, compact
}) => {
  const size = compact ? 40 : 60;
  const color = ELEMENT_COLORS[type];
  const label = ELEMENT_LABELS[type];

  const miniRender = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const pad = 4;
    const r = Math.max(2, w * 0.1);
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;
    const cx = w / 2;
    const cy = h / 2;

    const roundRect = (x: number, y: number, rw: number, rh: number, rr: number) => {
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + rw - rr, y);
      ctx.quadraticCurveTo(x + rw, y, x + rw, y + rr);
      ctx.lineTo(x + rw, y + rh - rr);
      ctx.quadraticCurveTo(x + rw, y + rh, x + rw - rr, y + rh);
      ctx.lineTo(x + rr, y + rh);
      ctx.quadraticCurveTo(x, y + rh, x, y + rh - rr);
      ctx.lineTo(x, y + rr);
      ctx.quadraticCurveTo(x, y, x + rr, y);
      ctx.closePath();
    };

    switch (type) {
      case 'grass':
      case 'dirt':
      case 'sand':
        roundRect(pad, pad, innerW, innerH, r);
        ctx.fillStyle = color;
        ctx.fill();
        break;
      case 'water':
        roundRect(pad, pad, innerW, innerH, r);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        const wy = cy - innerH * 0.05;
        ctx.beginPath();
        ctx.moveTo(pad + innerW * 0.15, wy);
        ctx.quadraticCurveTo(cx - innerW * 0.1, wy - 3, cx, wy);
        ctx.quadraticCurveTo(cx + innerW * 0.1, wy + 3, pad + innerW * 0.85, wy);
        ctx.stroke();
        break;
      case 'rock':
        ctx.fillStyle = color;
        const rs = Math.min(innerW, innerH) * 0.42;
        ctx.beginPath();
        ctx.moveTo(cx - rs, cy + rs * 0.3);
        ctx.lineTo(cx - rs * 0.6, cy - rs * 0.5);
        ctx.lineTo(cx, cy - rs * 0.8);
        ctx.lineTo(cx + rs * 0.5, cy - rs * 0.55);
        ctx.lineTo(cx + rs, cy + rs * 0.15);
        ctx.lineTo(cx + rs * 0.6, cy + rs * 0.7);
        ctx.lineTo(cx - rs * 0.2, cy + rs * 0.75);
        ctx.closePath();
        ctx.fill();
        break;
      case 'tree':
        ctx.fillStyle = '#78350f';
        const tw = innerW * 0.18;
        const th = innerH * 0.3;
        ctx.fillRect(cx - tw / 2, cy + innerH * 0.05, tw, th);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy - innerH * 0.05, Math.min(innerW, innerH) * 0.38, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'building':
        const bw = innerW * 0.78;
        const bh = innerH * 0.7;
        const bx = cx - bw / 2;
        const by = cy - bh / 2 + innerH * 0.05;
        ctx.fillStyle = color;
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(bx - innerW * 0.05, by);
        ctx.lineTo(cx, by - innerH * 0.2);
        ctx.lineTo(bx + bw + innerW * 0.05, by);
        ctx.closePath();
        ctx.fill();
        break;
      case 'start':
        roundRect(pad, pad, innerW, innerH, r);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(innerW, innerH) * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('S', cx, cy);
        break;
      case 'end':
        roundRect(pad, pad, innerW, innerH, r);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(innerW, innerH) * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', cx, cy);
        break;
    }
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr;
    c.height = size * dpr;
    c.style.width = size + 'px';
    c.style.height = size + 'px';
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    miniRender(ctx, size, size);
  }, [type, size]);

  return (
    <div
      draggable
      onClick={onSelect}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', type);
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      title={label}
      style={{
        width: size,
        height: compact ? 'auto' : size + 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        cursor: 'grab',
        userSelect: 'none',
        padding: compact ? 2 : 0,
        transition: 'transform 0.15s ease-out',
        transform: selected ? 'scale(1.1)' : 'scale(1)',
        borderRadius: 6
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          background: selected ? '#3b82f630' : 'transparent',
          border: selected ? '2px solid #3b82f6' : '2px solid #ffffff12',
          padding: selected ? 0 : 2,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: selected ? '0 0 14px #3b82f660' : 'none',
          transition: 'all 0.15s ease-out'
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 3 }} />
      </div>
      {!compact && (
        <div
          style={{
            marginTop: 5,
            fontSize: 11,
            color: selected ? '#93c5fd' : '#9ca3af',
            fontWeight: selected ? 600 : 400,
            whiteSpace: 'nowrap'
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer<React.Reducer<EditorStateShape, Action>>(
    editorReducer,
    createInitialState(20, 60)
  );
  const [dragType, setDragType] = useState<ElementType | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkWidth = () => setIsCompact(window.innerWidth < 1024);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    if (importStatus) {
      const t = setTimeout(() => setImportStatus(null), 3500);
      return () => clearTimeout(t);
    }
  }, [importStatus]);

  const handleExport = () => {
    const fname = `map_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-6)}.json`;
    downloadMapJson(state, fname);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const result: ImportResult = importMap(text);
      if (result.success && result.state) {
        dispatch({ type: 'REPLACE_STATE', payload: result.state });
        setImportStatus({ type: 'success', msg: `成功导入 ${result.state.elements?.length || 0} 个元素！` });
      } else {
        setImportStatus({ type: 'error', msg: result.error || '导入失败' });
      }
    } catch (err) {
      setImportStatus({ type: 'error', msg: err instanceof Error ? err.message : '读取文件失败' });
    }
    e.target.value = '';
  };

  const handleToolSelect = (type: ElementType) => {
    dispatch({ type: 'SELECT_TOOL', payload: state.selectedTool === type ? null : type });
  };

  const handleToggleCollision = () => {
    dispatch({ type: 'TOGGLE_COLLISION_LAYER' });
  };

  const handleClear = () => {
    if (state.elements.length === 0) return;
    if (window.confirm(`确定要清空全部 ${state.elements.length} 个元素吗？`)) {
      dispatch({ type: 'CLEAR_ALL' });
    }
  };

  const handleResetView = () => {
    dispatch({ type: 'SET_ZOOM', payload: 1 });
    dispatch({ type: 'SET_PAN', payload: { x: 0, y: 0 } });
  };

  const panelInnerShadow: React.CSSProperties = {
    background: '#1e1e2e',
    boxShadow: 'inset 0 2px 10px #00000040, 0 1px 0 #ffffff0a'
  };

  const buttonStyle: React.CSSProperties = {
    height: 36,
    padding: '0 14px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: '#e5e7eb',
    background: '#2a2a3e',
    border: '1px solid #ffffff10',
    transition: 'all 0.15s ease-out',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6
  };

  const toolboxContent = (
    <div style={{ padding: 14, height: '100%', overflowY: 'auto' }}>
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: '#e5e7eb',
        marginBottom: 4,
        letterSpacing: 0.3
      }}>
        EditorCraft
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 16 }}>
        2D 俯视角地图编辑器
      </div>

      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#6366f1',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 10
      }}>
        元素工具箱
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isCompact ? 'repeat(auto-fill, 48px)' : 'repeat(2, 1fr)',
        gap: isCompact ? 6 : 10,
        justifyItems: 'center'
      }}>
        {TOOLBOX_ELEMENTS.map(type => (
          <ToolItem
            key={type}
            type={type}
            selected={state.selectedTool === type}
            onSelect={() => handleToolSelect(type)}
            onDragStart={() => setDragType(type)}
            onDragEnd={() => setDragType(null)}
            compact={isCompact}
          />
        ))}
      </div>

      <div style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid #ffffff10'
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#6366f1',
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          marginBottom: 10
        }}>
          操作
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={handleToggleCollision}
            style={{
              ...buttonStyle,
              background: state.showCollisionLayer ? '#3b82f6' : '#2a2a3e',
              justifyContent: 'center',
              width: '100%'
            }}
            onMouseEnter={(e) => { if (!state.showCollisionLayer) e.currentTarget.style.background = '#3b82f6'; }}
            onMouseLeave={(e) => { if (!state.showCollisionLayer) e.currentTarget.style.background = '#2a2a3e'; }}
          >
            {state.showCollisionLayer ? '👁 隐藏碰撞层' : '👁 显示碰撞层'}
          </button>
          <button
            onClick={handleResetView}
            style={{ ...buttonStyle, justifyContent: 'center', width: '100%' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#3b82f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#2a2a3e'}
          >
            ⟲ 重置视图
          </button>
          <button
            onClick={handleClear}
            style={{
              ...buttonStyle,
              justifyContent: 'center',
              width: '100%',
              color: '#fca5a5',
              border: '1px solid #ef444430'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#2a2a3e'}
          >
            🗑 清空画布
          </button>
        </div>
      </div>

      {!isCompact && (
        <div style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid #ffffff10',
          fontSize: 11,
          color: '#6b7280',
          lineHeight: 1.8
        }}>
          <div style={{ color: '#a5b4fc', fontWeight: 600, marginBottom: 6 }}>快捷键</div>
          <div>⌨ 空格 + 拖拽：快速平移</div>
          <div>🖱 滚轮：缩放视图</div>
          <div>🖱 右键元素：快捷菜单</div>
          <div>⎋ Esc：取消选择</div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0a0a1a',
      display: 'flex',
      flexDirection: isCompact ? 'column' : 'row',
      color: '#e5e7eb'
    }}>
      <div
        style={{
          ...panelInnerShadow,
          width: isCompact ? '100%' : 260,
          height: isCompact ? 'auto' : '100%',
          flexShrink: 0,
          borderRight: isCompact ? 'none' : '1px solid #ffffff0a',
          borderBottom: isCompact ? '1px solid #ffffff0a' : 'none',
          zIndex: 10,
          maxHeight: isCompact ? '52vh' : 'none'
        }}
      >
        {toolboxContent}
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div
          style={{
            height: 52,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            ...panelInnerShadow,
            borderBottom: '1px solid #ffffff0a',
            flexShrink: 0,
            zIndex: 5
          }}
        >
          <div style={{
            fontSize: 13,
            color: '#9ca3af',
            marginRight: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            {state.selectedTool && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: '#3b82f625',
                borderRadius: 6,
                border: '1px solid #3b82f640',
                color: '#93c5fd'
              }}>
                <span style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: ELEMENT_COLORS[state.selectedTool]
                }} />
                当前工具：<b style={{ color: '#bfdbfe' }}>{ELEMENT_LABELS[state.selectedTool]}</b>
              </div>
            )}
            {!state.selectedTool && !isCompact && (
              <span>选择工具箱元素，或拖拽放置到画布</span>
            )}
          </div>

          <button
            onClick={handleImportClick}
            style={{ ...buttonStyle }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#3b82f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#2a2a3e'}
          >
            📂 导入地图
          </button>
          <button
            onClick={handleExport}
            style={{
              ...buttonStyle,
              background: '#3b82f6',
              border: '1px solid #3b82f6',
              fontWeight: 600
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
          >
            💾 导出 JSON
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Editor
            state={state}
            dispatch={dispatch}
            dragType={dragType}
            onDragEnd={() => setDragType(null)}
          />
        </div>

        {importStatus && (
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              right: 20,
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: importStatus.type === 'success' ? '#bbf7d0' : '#fecaca',
              background: importStatus.type === 'success' ? '#166534cc' : '#991b1bcc',
              border: importStatus.type === 'success' ? '1px solid #22c55e40' : '1px solid #ef444440',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 8px 32px #00000060',
              zIndex: 100,
              animation: 'slideUp 0.25s ease-out'
            }}
          >
            {importStatus.type === 'success' ? '✓ ' : '✗ '}
            {importStatus.msg}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ffffff18; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #ffffff28; }
      `}</style>
    </div>
  );
};

export default App;
