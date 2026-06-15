import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleRegion,
  GradientStyle,
  ShadowStyle,
  copyToClipboard
} from './StyleDetector';

interface StyleEditorProps {
  region: StyleRegion | null;
  panelPosition: { x: number; y: number } | null;
  onClose: () => void;
  onUpdate?: (region: StyleRegion) => void;
}

interface EditorState {
  gradient: GradientStyle | null;
  innerShadow: ShadowStyle | null;
  boxShadow: ShadowStyle | null;
  borderRadius: number;
  backgroundColor: string;
}

const CSS_VAR_MAP = {
  gradientAngle: '--se-gradient-angle',
  gradientStartColor: '--se-gradient-start-color',
  gradientEndColor: '--se-gradient-end-color',
  gradientType: '--se-gradient-type',
  shadowOffsetX: '--se-shadow-offset-x',
  shadowOffsetY: '--se-shadow-offset-y',
  shadowBlur: '--se-shadow-blur',
  borderRadius: '--se-border-radius',
  backgroundColor: '--se-bg-color',
  innerShadowOffsetX: '--se-inner-shadow-offset-x',
  innerShadowOffsetY: '--se-inner-shadow-offset-y',
  innerShadowBlur: '--se-inner-shadow-blur',
  innerShadowColor: '--se-inner-shadow-color',
  shadowColor: '--se-shadow-color',
} as const;

const applyCSSToPreview = (
  previewEl: HTMLElement | null,
  state: EditorState
) => {
  if (!previewEl) return;
  const s = previewEl.style;

  if (state.gradient) {
    const stopsStr = state.gradient.stops
      .map(st => `${st.color} ${(st.position * 100).toFixed(1)}%`)
      .join(', ');
    const gradFunc = state.gradient.type === 'linear'
      ? `linear-gradient(${state.gradient.angle}deg, ${stopsStr})`
      : `radial-gradient(circle, ${stopsStr})`;
    s.background = gradFunc;
  } else {
    s.background = 'none';
    s.backgroundColor = state.backgroundColor || '#334155';
  }

  const shadowParts: string[] = [];
  if (state.boxShadow) {
    shadowParts.push(
      `${state.boxShadow.offsetX}px ${state.boxShadow.offsetY}px ` +
      `${state.boxShadow.blur}px ${state.boxShadow.spread}px ${state.boxShadow.color}`
    );
  }
  if (state.innerShadow) {
    shadowParts.push(
      `inset ${state.innerShadow.offsetX}px ${state.innerShadow.offsetY}px ` +
      `${state.innerShadow.blur}px ${state.innerShadow.spread}px ${state.innerShadow.color}`
    );
  }
  s.boxShadow = shadowParts.length > 0 ? shadowParts.join(', ') : 'none';

  s.borderRadius = `${state.borderRadius}px`;
};

const generateCSSText = (state: EditorState): string => {
  const lines: string[] = [];

  if (state.backgroundColor && !state.gradient) {
    lines.push(`  background-color: ${state.backgroundColor};`);
  }

  if (state.gradient) {
    const stopsStr = state.gradient.stops
      .map(s => `${s.color} ${(s.position * 100).toFixed(1)}%`)
      .join(', ');
    const gradFunc = state.gradient.type === 'linear'
      ? `linear-gradient(${state.gradient.angle}deg, ${stopsStr})`
      : `radial-gradient(circle, ${stopsStr})`;
    lines.push(`  background: ${gradFunc};`);
    lines.push(`  background: -webkit-${gradFunc};`);
  }

  const allShadows: string[] = [];
  if (state.boxShadow) {
    allShadows.push(
      `${state.boxShadow.offsetX}px ${state.boxShadow.offsetY}px ` +
      `${state.boxShadow.blur}px ${state.boxShadow.spread}px ${state.boxShadow.color}`
    );
  }
  if (state.innerShadow) {
    allShadows.push(
      `inset ${state.innerShadow.offsetX}px ${state.innerShadow.offsetY}px ` +
      `${state.innerShadow.blur}px ${state.innerShadow.spread}px ${state.innerShadow.color}`
    );
  }
  if (allShadows.length > 0) {
    lines.push(`  box-shadow: ${allShadows.join(', ')};`);
    lines.push(`  -webkit-box-shadow: ${allShadows.join(', ')};`);
  }

  if (state.borderRadius > 0) {
    lines.push(`  border-radius: ${state.borderRadius}px;`);
    lines.push(`  -webkit-border-radius: ${state.borderRadius}px;`);
  }

  return lines.join('\n');
};

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
}> = ({ label, value, min, max, step = 1, unit = '', onChange, onCommit }) => {
  const rafIdRef = useRef<number | null>(null);
  const pendingRef = useRef(value);
  const lastCommitRef = useRef(value);
  const [displayValue, setDisplayValue] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    pendingRef.current = v;
    setDisplayValue(v);
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      onChange(pendingRef.current);
      rafIdRef.current = null;
    });
  };

  const handlePointerUp = () => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    onChange(pendingRef.current);
    if (onCommit && pendingRef.current !== lastCommitRef.current) {
      lastCommitRef.current = pendingRef.current;
      onCommit(pendingRef.current);
    }
  };

  useEffect(() => {
    lastCommitRef.current = value;
    pendingRef.current = value;
    setDisplayValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '6px',
        fontSize: '12px',
        color: '#94a3b8'
      }}>
        <span>{label}</span>
        <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>
          {displayValue}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={displayValue}
        onChange={handleChange}
        onPointerUp={handlePointerUp}
        onKeyUp={handlePointerUp}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          background: '#334155',
          outline: 'none',
          WebkitAppearance: 'none',
          cursor: 'pointer'
        }}
      />
    </div>
  );
};

const ColorPicker: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '12px',
        color: '#94a3b8'
      }}>
        <span style={{ minWidth: '60px' }}>{label}</span>
        <div style={{
          width: '36px',
          height: '24px',
          borderRadius: '6px',
          background: value,
          border: '1px solid #475569',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          <input
            type="color"
            value={value.startsWith('#') ? value : '#f97316'}
            onChange={(e) => onChange(e.target.value)}
            style={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              width: '48px',
              height: '36px',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              opacity: 0
            }}
          />
        </div>
        <span style={{
          color: '#e2e8f0',
          fontFamily: 'monospace',
          fontSize: '11px',
          background: '#334155',
          padding: '3px 8px',
          borderRadius: '4px'
        }}>
          {value.toUpperCase()}
        </span>
      </div>
    </div>
  );
};

const StyleEditor: React.FC<StyleEditorProps> = ({
  region,
  panelPosition,
  onClose,
  onUpdate
}) => {
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [copied, setCopied] = useState(false);
  const [cssText, setCssText] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<EditorState | null>(null);
  const commitTimerRef = useRef<number | null>(null);

  const applyToPreviewDirect = useCallback((state: EditorState) => {
    applyCSSToPreview(previewRef.current, state);
  }, []);

  const scheduleCommit = useCallback((state: EditorState) => {
    if (commitTimerRef.current != null) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = window.setTimeout(() => {
      const newCss = generateCSSText(state);
      setCssText(newCss);
      if (onUpdate && region) {
        onUpdate({
          ...region,
          gradient: state.gradient || undefined,
          boxShadow: state.boxShadow ? [state.boxShadow] : undefined,
          innerShadow: state.innerShadow ? [state.innerShadow] : undefined,
          borderRadius: state.borderRadius,
          backgroundColor: state.backgroundColor || undefined,
          cssText: newCss
        });
      }
      commitTimerRef.current = null;
    }, 80);
  }, [region, onUpdate]);

  useEffect(() => {
    if (region) {
      const state: EditorState = {
        gradient: region.gradient ? { ...region.gradient, stops: region.gradient.stops.map(s => ({ ...s })) } : null,
        innerShadow: region.innerShadow && region.innerShadow.length > 0 ? { ...region.innerShadow[0] } : null,
        boxShadow: region.boxShadow && region.boxShadow.length > 0 ? { ...region.boxShadow[0] } : null,
        borderRadius: region.borderRadius,
        backgroundColor: region.backgroundColor || ''
      };
      setEditorState(state);
      stateRef.current = state;
      setCssText(region.cssText);
      applyToPreviewDirect(state);
    } else {
      setEditorState(null);
      stateRef.current = null;
      setCssText('');
    }
  }, [region, applyToPreviewDirect]);

  useEffect(() => {
    return () => {
      if (commitTimerRef.current != null) clearTimeout(commitTimerRef.current);
    };
  }, []);

  const handleSliderChange = useCallback((updater: (prev: EditorState) => EditorState) => {
    if (!stateRef.current) return;
    const next = updater(stateRef.current);
    stateRef.current = next;
    applyToPreviewDirect(next);
  }, [applyToPreviewDirect]);

  const handleSliderCommit = useCallback(() => {
    if (stateRef.current) {
      setEditorState({ ...stateRef.current });
      scheduleCommit(stateRef.current);
    }
  }, [scheduleCommit]);

  const handleColorChange = useCallback((updater: (prev: EditorState) => EditorState) => {
    setEditorState(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      stateRef.current = next;
      const newCss = generateCSSText(next);
      setCssText(newCss);
      applyToPreviewDirect(next);
      if (onUpdate && region) {
        onUpdate({
          ...region,
          gradient: next.gradient || undefined,
          boxShadow: next.boxShadow ? [next.boxShadow] : undefined,
          innerShadow: next.innerShadow ? [next.innerShadow] : undefined,
          borderRadius: next.borderRadius,
          backgroundColor: next.backgroundColor || undefined,
          cssText: newCss
        });
      }
      return next;
    });
  }, [region, onUpdate, applyToPreviewDirect]);

  const handleCopy = async () => {
    if (!cssText) return;
    const fullCss = `.element {\n${cssText}\n}`;
    const ok = await copyToClipboard(fullCss);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    }
  };

  const panelStyle: React.CSSProperties = useMemo(() => {
    if (!panelPosition) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) scale(1)',
        opacity: 1,
        transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 1000
      };
    }
    return {
      position: 'fixed',
      top: `${panelPosition.y}px`,
      left: `${panelPosition.x}px`,
      opacity: 1,
      transform: 'scale(1)',
      transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 1000
    };
  }, [panelPosition]);

  if (!region || !editorState) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
          cursor: 'default'
        }}
      />
      <div style={{
        width: '320px',
        background: '#1e293b',
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        padding: '20px',
        color: '#e2e8f0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        ...panelStyle
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: '#f1f5f9'
          }}>
            {region.name}
          </h3>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: 'none',
              background: '#334155',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#475569')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#334155')}
          >
            ×
          </button>
        </div>

        <div style={{
          background: '#0f172a',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div
            ref={previewRef}
            style={{
              width: '320px',
              height: '180px',
              backgroundColor: editorState.backgroundColor || '#334155',
              borderRadius: `${editorState.borderRadius}px`,
              transition: 'none'
            }}
          />
        </div>

        {editorState.gradient && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#60a5fa',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid #334155'
            }}>
              渐变设置
            </div>
            <Slider
              label="渐变角度"
              value={editorState.gradient.angle}
              min={0}
              max={360}
              unit="°"
              onChange={(v) => handleSliderChange(prev => ({
                ...prev,
                gradient: prev.gradient ? { ...prev.gradient, angle: v } : prev.gradient
              }))}
              onCommit={handleSliderCommit}
            />
            {editorState.gradient.stops.slice(0, 2).map((stop, idx) => (
              <ColorPicker
                key={idx}
                label={idx === 0 ? '起始色' : '结束色'}
                value={stop.color}
                onChange={(c) => handleColorChange(prev => {
                  if (!prev.gradient) return prev;
                  const newStops = prev.gradient.stops.map((s, i) =>
                    i === idx ? { ...s, color: c } : s
                  );
                  if (newStops.length < 2) {
                    newStops.push({
                      color: idx === 0 ? '#eab308' : '#f97316',
                      position: 1
                    });
                  }
                  return {
                    ...prev,
                    gradient: { ...prev.gradient, stops: newStops }
                  };
                })}
              />
            ))}
            {editorState.gradient.stops.length < 2 && (
              <ColorPicker
                label="结束色"
                value="#eab308"
                onChange={(c) => handleColorChange(prev => {
                  if (!prev.gradient) return prev;
                  return {
                    ...prev,
                    gradient: {
                      ...prev.gradient,
                      stops: [...prev.gradient.stops, { color: c, position: 1 }]
                    }
                  };
                })}
              />
            )}
          </div>
        )}

        {editorState.innerShadow && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#60a5fa',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid #334155'
            }}>
              内阴影设置
            </div>
            <Slider
              label="偏移 X"
              value={editorState.innerShadow.offsetX}
              min={-20}
              max={20}
              unit="px"
              onChange={(v) => handleSliderChange(prev => ({
                ...prev,
                innerShadow: prev.innerShadow ? { ...prev.innerShadow, offsetX: v } : prev.innerShadow
              }))}
              onCommit={handleSliderCommit}
            />
            <Slider
              label="偏移 Y"
              value={editorState.innerShadow.offsetY}
              min={-20}
              max={20}
              unit="px"
              onChange={(v) => handleSliderChange(prev => ({
                ...prev,
                innerShadow: prev.innerShadow ? { ...prev.innerShadow, offsetY: v } : prev.innerShadow
              }))}
              onCommit={handleSliderCommit}
            />
            <Slider
              label="模糊半径"
              value={editorState.innerShadow.blur}
              min={0}
              max={30}
              unit="px"
              onChange={(v) => handleSliderChange(prev => ({
                ...prev,
                innerShadow: prev.innerShadow ? { ...prev.innerShadow, blur: v } : prev.innerShadow
              }))}
              onCommit={handleSliderCommit}
            />
          </div>
        )}

        {editorState.boxShadow && !editorState.innerShadow && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#60a5fa',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid #334155'
            }}>
              阴影设置
            </div>
            <Slider
              label="偏移 X"
              value={editorState.boxShadow.offsetX}
              min={-20}
              max={20}
              unit="px"
              onChange={(v) => handleSliderChange(prev => ({
                ...prev,
                boxShadow: prev.boxShadow ? { ...prev.boxShadow, offsetX: v } : prev.boxShadow
              }))}
              onCommit={handleSliderCommit}
            />
            <Slider
              label="偏移 Y"
              value={editorState.boxShadow.offsetY}
              min={-20}
              max={20}
              unit="px"
              onChange={(v) => handleSliderChange(prev => ({
                ...prev,
                boxShadow: prev.boxShadow ? { ...prev.boxShadow, offsetY: v } : prev.boxShadow
              }))}
              onCommit={handleSliderCommit}
            />
            <Slider
              label="模糊半径"
              value={editorState.boxShadow.blur}
              min={0}
              max={30}
              unit="px"
              onChange={(v) => handleSliderChange(prev => ({
                ...prev,
                boxShadow: prev.boxShadow ? { ...prev.boxShadow, blur: v } : prev.boxShadow
              }))}
              onCommit={handleSliderCommit}
            />
          </div>
        )}

        <Slider
          label="圆角大小"
          value={editorState.borderRadius}
          min={0}
          max={60}
          unit="px"
          onChange={(v) => handleSliderChange(prev => ({
            ...prev,
            borderRadius: v
          }))}
          onCommit={handleSliderCommit}
        />

        <div style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #334155'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>CSS 代码</span>
            <button
              onClick={handleCopy}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: copied ? '#22c55e' : '#3b82f6',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.3s ease',
                minWidth: '72px'
              }}
            >
              {copied ? '已复制' : '复制代码'}
            </button>
          </div>
          <pre style={{
            margin: 0,
            padding: '12px',
            background: '#0f172a',
            borderRadius: '8px',
            fontSize: '11px',
            lineHeight: '1.6',
            color: '#93c5fd',
            fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: '180px',
            overflowY: 'auto'
          }}>
{`.element {\n${cssText}\n}`}
          </pre>
        </div>
      </div>
    </>
  );
};

export default StyleEditor;

export { applyCSSToPreview, generateCSSText };
