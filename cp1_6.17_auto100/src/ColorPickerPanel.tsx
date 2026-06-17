import { useCallback, useState } from 'react';
import type { ColorNode, GradientType } from './types';
import { buildGradientCSS, computeStopPosition, generateId, randomColor } from './types';

interface ColorPickerPanelProps {
  colorNodes: ColorNode[];
  angle: number;
  gradientType: GradientType;
  onColorNodesChange: (nodes: ColorNode[]) => void;
  onAngleChange: (angle: number) => void;
  onGradientTypeChange: (type: GradientType) => void;
}

const MONO_FONT = "Consolas, 'Courier New', Monaco, monospace";

export default function ColorPickerPanel({
  colorNodes,
  angle,
  gradientType,
  onColorNodesChange,
  onAngleChange,
  onGradientTypeChange,
}: ColorPickerPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleColorChange = useCallback(
    (id: string, color: string) => {
      onColorNodesChange(
        colorNodes.map((n) => (n.id === id ? { ...n, color } : n))
      );
    },
    [colorNodes, onColorNodesChange]
  );

  const handleAddNode = useCallback(() => {
    if (colorNodes.length >= 4) return;
    const avgX = colorNodes.length
      ? Math.round(colorNodes.reduce((s, n) => s + n.x, 0) / colorNodes.length)
      : 50;
    const avgY = colorNodes.length
      ? Math.round(colorNodes.reduce((s, n) => s + n.y, 0) / colorNodes.length)
      : 70;
    const newNode: ColorNode = {
      id: generateId(),
      color: randomColor(),
      x: Math.min(100, Math.max(0, avgX + 10)),
      y: Math.min(100, Math.max(0, avgY)),
    };
    onColorNodesChange([...colorNodes, newNode]);
  }, [colorNodes, onColorNodesChange]);

  const handleDeleteNode = useCallback(
    (id: string) => {
      if (colorNodes.length <= 1) return;
      onColorNodesChange(colorNodes.filter((n) => n.id !== id));
    },
    [colorNodes, onColorNodesChange]
  );

  const handleCopy = useCallback(async () => {
    const css = buildGradientCSS(colorNodes, angle, gradientType);
    const text = `background: ${css};`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }, [colorNodes, angle, gradientType]);

  const cssCode = `background: ${buildGradientCSS(colorNodes, angle, gradientType)};`;

  const isLinear = gradientType === 'linear';

  return (
    <div
      style={{
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          color: '#e0e0e0',
          letterSpacing: '0.5px',
        }}
      >
        渐变编辑器
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label
          style={{
            fontSize: 13,
            color: '#a0a0b8',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          颜色节点
        </label>
        {colorNodes.map((node) => {
          const pos = computeStopPosition(node.x, node.y, angle, gradientType);
          return (
            <div
              key={node.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 8,
              }}
            >
              <label
                style={{
                  position: 'relative',
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <input
                  type="color"
                  value={node.color}
                  onChange={(e) => handleColorChange(node.id, e.target.value)}
                  style={{
                    position: 'absolute',
                    top: -4,
                    left: -4,
                    width: 32,
                    height: 32,
                    border: 'none',
                    cursor: 'pointer',
                    opacity: 0,
                  }}
                />
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: node.color,
                  }}
                />
              </label>
              <input
                type="text"
                value={node.color}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                    handleColorChange(node.id, val);
                  }
                }}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  color: '#d4d4d4',
                  fontSize: 13,
                  fontFamily: MONO_FONT,
                  outline: 'none',
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: '#888',
                  minWidth: 36,
                  textAlign: 'right',
                  fontFamily: MONO_FONT,
                }}
              >
                {pos}%
              </span>
              {colorNodes.length > 1 && (
                <button
                  onClick={() => handleDeleteNode(node.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: '0 4px',
                    lineHeight: 1,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.color = '#ff6b6b';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.color = '#888';
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
        {colorNodes.length < 4 && (
          <button
            onClick={handleAddNode}
            style={{
              padding: '8px 0',
              background: 'rgba(255,255,255,0.06)',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: '#a0a0b8',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = 'rgba(255,255,255,0.1)';
              el.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = 'rgba(255,255,255,0.06)';
              el.style.transform = 'translateY(0)';
            }}
          >
            + 添加颜色节点
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: '#a0a0b8',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            {isLinear ? '角度' : '半径'}
          </label>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#4A90D9',
              fontFamily: MONO_FONT,
            }}
          >
            {angle}{isLinear ? '°' : '%'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={isLinear ? 360 : 100}
          step={1}
          value={angle}
          onChange={(e) => onAngleChange(Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#4A90D9',
            cursor: 'pointer',
            margin: '4px 0',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label
          style={{
            fontSize: 13,
            color: '#a0a0b8',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          形状
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              onGradientTypeChange('linear');
              onAngleChange(0);
            }}
            style={{
              flex: 1,
              padding: '10px 0',
              background: isLinear
                ? 'rgba(74,144,217,0.25)'
                : 'rgba(255,255,255,0.06)',
              border: isLinear
                ? '1px solid #4A90D9'
                : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: isLinear ? '#4A90D9' : '#a0a0b8',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            线性
          </button>
          <button
            onClick={() => {
              onGradientTypeChange('radial');
              onAngleChange(50);
            }}
            style={{
              flex: 1,
              padding: '10px 0',
              background: !isLinear
                ? 'rgba(74,144,217,0.25)'
                : 'rgba(255,255,255,0.06)',
              border: !isLinear
                ? '1px solid #4A90D9'
                : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: !isLinear ? '#4A90D9' : '#a0a0b8',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            径向
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: '#a0a0b8',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            CSS 代码
          </label>
        </div>
        <div
          style={{
            position: 'relative',
            background: '#1e1e1e',
            color: '#d4d4d4',
            fontFamily: MONO_FONT,
            fontSize: 13,
            borderRadius: 8,
            padding: '12px 44px 12px 14px',
            wordBreak: 'break-all',
            lineHeight: 1.6,
          }}
        >
          {cssCode}
          <button
            onClick={handleCopy}
            title="复制代码"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: '#d4d4d4',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: MONO_FONT,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = 'rgba(74,144,217,0.3)';
              el.style.borderColor = '#4A90D9';
              el.style.color = '#fff';
              el.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = 'rgba(255,255,255,0.08)';
              el.style.borderColor = 'rgba(255,255,255,0.12)';
              el.style.color = '#d4d4d4';
              el.style.transform = 'translateY(0)';
            }}
          >
            {copied ? '已复制 ✓' : '复制'}
          </button>
        </div>
        <button
          onClick={handleCopy}
          style={{
            padding: '10px 0',
            background: '#4A90D9',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.2s',
            letterSpacing: '0.5px',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.background = '#5A9FE8';
            el.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.background = '#4A90D9';
            el.style.transform = 'translateY(0)';
          }}
        >
          {copied ? '已复制 ✓' : '一键复制'}
        </button>
      </div>
    </div>
  );
}
