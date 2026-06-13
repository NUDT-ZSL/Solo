import { useState } from 'react';
import {
  Pencil,
  Type,
  Sticker,
  Undo2,
  Redo2,
  Trash2,
  Download,
  CircleDot,
  Wifi,
  WifiOff,
  ChevronDown,
} from 'lucide-react';
import type { ToolType, StickerType } from '../types';

const STICKER_PREVIEWS: Record<StickerType, string> = {
  star: '⭐',
  smile: '😊',
  arrow: '➡️',
  heart: '❤️',
  lightning: '⚡',
};

const STICKER_LIST: StickerType[] = ['star', 'smile', 'arrow', 'heart', 'lightning'];

const BRUSH_WIDTHS = [2, 4, 6];

interface ToolbarProps {
  currentTool: ToolType;
  setCurrentTool: (tool: ToolType) => void;
  color: string;
  setColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onExport: () => void;
  onStickerSelect: (stickerType: StickerType) => void;
  connected: boolean;
  username: string;
  onUsernameChange: (name: string) => void;
}

export function Toolbar({
  currentTool,
  setCurrentTool,
  color,
  setColor,
  brushWidth,
  setBrushWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDelete,
  onExport,
  onStickerSelect,
  connected,
  username,
  onUsernameChange,
}: ToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [showWidthPicker, setShowWidthPicker] = useState(false);
  const [showUsernameEditor, setShowUsernameEditor] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);
  const [hexInput, setHexInput] = useState(color);

  const toolButtons = [
    { tool: 'brush' as ToolType, icon: Pencil, label: '画笔' },
    { tool: 'text' as ToolType, icon: Type, label: '文字' },
    { tool: 'sticker' as ToolType, icon: Sticker, label: '贴纸' },
  ];

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    setHexInput(newColor);
  };

  const handleHexSubmit = () => {
    const validHex = /^#[0-9A-Fa-f]{6}$/.test(hexInput);
    if (validHex) {
      setColor(hexInput);
    }
  };

  const handleUsernameSubmit = () => {
    if (tempUsername.trim()) {
      onUsernameChange(tempUsername.trim());
    }
    setShowUsernameEditor(false);
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          maxWidth: 'calc(100vw - 32px)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {toolButtons.map(({ tool, icon: Icon, label }) => (
          <button
            key={tool}
            onClick={() => {
              setCurrentTool(tool);
              if (tool === 'sticker') {
                setShowStickerPanel(!showStickerPanel);
                setShowColorPicker(false);
                setShowWidthPicker(false);
              } else {
                setShowStickerPanel(false);
              }
            }}
            title={label}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 12px',
              border: 'none',
              background: 'transparent',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: currentTool === tool ? '#6366f1' : '#475569',
              minWidth: '44px',
              height: '48px',
            }}
          >
            <Icon size={24} strokeWidth={currentTool === tool ? 2.5 : 2} />
            <div
              style={{
                position: 'absolute',
                bottom: '2px',
                left: '12px',
                right: '12px',
                height: '2px',
                background: currentTool === tool ? '#6366f1' : 'transparent',
                borderRadius: '1px',
                transition: 'all 0.2s ease',
              }}
            />
          </button>
        ))}

        <div style={{ width: '1px', height: '32px', background: '#e2e8f0', margin: '0 4px' }} />

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setCurrentTool('brush')}
            title={`画笔粗细 (${brushWidth}px)`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 10px',
              border: 'none',
              background: 'transparent',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              color: '#475569',
              height: '48px',
            }}
          >
            <CircleDot size={20} />
            <ChevronDown
              size={14}
              style={{
                transition: 'transform 0.2s ease',
                transform: showWidthPicker ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setShowWidthPicker(!showWidthPicker);
                setShowColorPicker(false);
                setShowStickerPanel(false);
              }}
            />
          </button>

          {showWidthPicker && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '8px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                padding: '12px',
                display: 'flex',
                gap: '12px',
                zIndex: 101,
                transformOrigin: 'top right',
                animation: 'expandFromTopRight 0.2s ease-out',
              }}
            >
              {BRUSH_WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    setBrushWidth(w);
                    setShowWidthPicker(false);
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: brushWidth === w ? '2px solid #6366f1' : '2px solid transparent',
                    background: brushWidth === w ? '#eef2ff' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: w * 2,
                      height: w * 2,
                      borderRadius: '50%',
                      background: color,
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowStickerPanel(false);
              setShowWidthPicker(false);
            }}
            title="颜色选择"
            style={{
              padding: '8px',
              border: '2px solid #e2e8f0',
              background: color,
              borderRadius: '8px',
              cursor: 'pointer',
              width: '40px',
              height: '40px',
              transition: 'all 0.2s ease',
              boxShadow: showColorPicker ? '0 0 0 2px rgba(99, 102, 241, 0.3)' : 'none',
            }}
          />

          {showColorPicker && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '8px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                padding: '16px',
                zIndex: 101,
                width: '240px',
                transformOrigin: 'top right',
                animation: 'expandFromTopRight 0.2s ease-out',
              }}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                style={{
                  width: '100%',
                  height: '80px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '12px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'].map((c) => (
                  <button
                    key={c}
                    onClick={() => handleColorChange(c)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      border: color === c ? '2px solid #6366f1' : c === '#ffffff' ? '2px solid #e2e8f0' : '2px solid transparent',
                      background: c,
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>#</span>
                <input
                  type="text"
                  value={hexInput.replace('#', '')}
                  onChange={(e) => setHexInput('#' + e.target.value)}
                  onBlur={handleHexSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleHexSubmit()}
                  maxLength={6}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '32px', background: '#e2e8f0', margin: '0 4px' }} />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
          style={{
            padding: '8px 10px',
            border: 'none',
            background: 'transparent',
            borderRadius: '8px',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            color: canUndo ? '#475569' : '#cbd5e1',
            height: '48px',
          }}
        >
          <Undo2 size={22} />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="重做 (Ctrl+Shift+Z)"
          style={{
            padding: '8px 10px',
            border: 'none',
            background: 'transparent',
            borderRadius: '8px',
            cursor: canRedo ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            color: canRedo ? '#475569' : '#cbd5e1',
            height: '48px',
          }}
        >
          <Redo2 size={22} />
        </button>

        <button
          onClick={onDelete}
          title="删除选中 (Delete)"
          style={{
            padding: '8px 10px',
            border: 'none',
            background: 'transparent',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: '#ef4444',
            height: '48px',
          }}
        >
          <Trash2 size={22} />
        </button>

        <div style={{ width: '1px', height: '32px', background: '#e2e8f0', margin: '0 4px' }} />

        <button
          onClick={onExport}
          title="导出为PNG"
          style={{
            padding: '8px 10px',
            border: 'none',
            background: 'transparent',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: '#6366f1',
            height: '48px',
          }}
        >
          <Download size={22} />
        </button>

        <div style={{ width: '1px', height: '32px', background: '#e2e8f0', margin: '0 4px' }} />

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUsernameEditor(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              border: 'none',
              background: '#f1f5f9',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              height: '40px',
            }}
          >
            {connected ? (
              <Wifi size={18} color="#22c55e" style={{ animation: 'pulse 2s infinite' }} />
            ) : (
              <WifiOff size={18} color="#ef4444" />
            )}
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#334155', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {username}
            </span>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: connected ? '#22c55e' : '#ef4444',
                boxShadow: connected ? '0 0 8px rgba(34, 197, 94, 0.5)' : 'none',
              }}
            />
          </button>

          {showUsernameEditor && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '8px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
                padding: '16px',
                zIndex: 101,
                width: '220px',
              }}
            >
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                修改用户名
              </label>
              <input
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                autoFocus
                maxLength={20}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowUsernameEditor(false)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#64748b',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleUsernameSubmit}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    background: '#6366f1',
                    color: 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  确定
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showStickerPanel && (
        <div
          style={{
            position: 'fixed',
            top: '84px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            padding: '16px',
            width: '280px',
            transformOrigin: 'top center',
            animation: 'expandFromTop 0.2s ease-out',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '12px' }}>
            选择贴纸
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}
          >
            {STICKER_LIST.map((stickerType) => (
              <button
                key={stickerType}
                onClick={() => {
                  onStickerSelect(stickerType);
                  setShowStickerPanel(false);
                }}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '10px',
                  border: '2px solid transparent',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  transition: 'all 0.2s ease',
                }}
              >
                {STICKER_PREVIEWS[stickerType]}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes expandFromTopRight {
          from { opacity: 0; transform: scale(0.8) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes expandFromTop {
          from { opacity: 0; transform: translateX(-50%) scale(0.9) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @media (max-width: 768px) {
          button { height: 50px !important; }
          svg { width: 20px !important; height: 20px !important; }
        }
      `}</style>
    </>
  );
}
