import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { Expression, Parameters } from '../core/GraphEngine';
import { FUNCTION_TEMPLATES, detectExpressionType } from '../core/GraphEngine';

interface FormulaInputProps {
  expressions: Expression[];
  parameters: Parameters;
  onExpressionsChange: (exprs: Expression[]) => void;
  onParametersChange: (params: Parameters) => void;
  onSubmit: () => void;
}

const DEFAULT_COLORS = ['#e94560', '#48dbfb', '#1dd1a1', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3'];

const extractParameters = (formula: string): string[] => {
  const reserved = new Set([
    'x', 'y', 'z', 'theta', 'pi', 'e',
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
    'sinh', 'cosh', 'tanh',
    'exp', 'log', 'ln', 'log10', 'log2',
    'sqrt', 'cbrt', 'pow', 'abs',
    'floor', 'ceil', 'round', 'trunc', 'sign',
    'min', 'max', 'clamp', 'mod',
    'Math',
  ]);
  const params = new Set<string>();
  const matches = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
  for (const m of matches) {
    if (!reserved.has(m)) params.add(m);
  }
  return [...params];
};

const FormulaInput: React.FC<FormulaInputProps> = ({
  expressions,
  parameters,
  onExpressionsChange,
  onParametersChange,
  onSubmit,
}) => {
  const [activeParamId, setActiveParamId] = useState<string | null>(null);
  const [autocompleteIdx, setAutocompleteIdx] = useState<number | null>(null);
  const [showSuggestFor, setShowSuggestFor] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const suggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const allParams = new Set<string>();
    for (const e of expressions) {
      for (const p of extractParameters(e.formula)) allParams.add(p);
    }
    const newParams: Parameters = { ...parameters };
    for (const p of allParams) {
      if (!(p in newParams)) newParams[p] = p === 'a' ? 1 : p === 'b' ? 2 : p === 'c' ? 0.5 : 1;
    }
    if (JSON.stringify(Object.keys(newParams).sort()) !== JSON.stringify(Object.keys(parameters).sort())) {
      onParametersChange(newParams);
    }
  }, [expressions]);

  const updateExpression = useCallback(
    (index: number, patch: Partial<Expression>) => {
      const next = [...expressions];
      next[index] = { ...next[index], ...patch };
      if (patch.formula !== undefined) {
        next[index].type = detectExpressionType(patch.formula);
      }
      onExpressionsChange(next);
    },
    [expressions, onExpressionsChange]
  );

  const addExpression = useCallback(() => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const color = DEFAULT_COLORS[expressions.length % DEFAULT_COLORS.length];
    onExpressionsChange([
      ...expressions,
      { id, formula: '', type: '2d-line', color, visible: true },
    ]);
    setTimeout(() => {
      inputRefs.current[expressions.length]?.focus();
    }, 50);
  }, [expressions, onExpressionsChange]);

  const removeExpression = useCallback(
    (index: number) => {
      if (expressions.length <= 1) {
        updateExpression(index, { formula: '' });
        return;
      }
      const next = expressions.filter((_, i) => i !== index);
      onExpressionsChange(next);
      if (activeParamId === expressions[index].id) setActiveParamId(null);
    },
    [expressions, onExpressionsChange, updateExpression, activeParamId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const input = e.currentTarget;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setShowSuggestFor(null);
      onSubmit();
    } else if (e.key === 'Backspace' && input.value === '' && expressions.length > 1) {
      e.preventDefault();
      removeExpression(index);
    } else if (e.key === 'ArrowDown' && showSuggestFor === index) {
      e.preventDefault();
      setAutocompleteIdx((i) => (i === null ? 0 : Math.min(FUNCTION_TEMPLATES.length - 1, i + 1)));
    } else if (e.key === 'ArrowUp' && showSuggestFor === index) {
      e.preventDefault();
      setAutocompleteIdx((i) => (i === null ? FUNCTION_TEMPLATES.length - 1 : Math.max(0, i - 1)));
    } else if (e.key === 'Tab' || e.key === 'Escape') {
      setShowSuggestFor(null);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    updateExpression(index, { formula: e.target.value });
    if (e.target.value.length > 0) {
      setShowSuggestFor(index);
      setAutocompleteIdx(null);
    } else {
      setShowSuggestFor(null);
    }
  };

  const applySuggestion = useCallback(
    (tpl: string, index: number) => {
      updateExpression(index, { formula: tpl });
      setShowSuggestFor(null);
      setTimeout(() => {
        inputRefs.current[index]?.focus();
        inputRefs.current[index]?.setSelectionRange(tpl.length, tpl.length);
      }, 30);
    },
    [updateExpression]
  );

  const activeExpr = expressions.find((e) => e.id === activeParamId);
  const activeParams = useMemo(
    () => (activeExpr ? extractParameters(activeExpr.formula) : []),
    [activeExpr]
  );

  const updateParam = useCallback(
    (name: string, value: number) => {
      onParametersChange({ ...parameters, [name]: value });
    },
    [parameters, onParametersChange]
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>ƒ</span>
        <span style={styles.headerText}>公式输入</span>
      </div>

      <div style={styles.expressionsList}>
        {expressions.map((expr, idx) => (
          <div
            key={expr.id}
            className="expr-row"
            style={{
              ...styles.expressionRow,
              borderLeft: `4px solid ${expr.color}`,
              opacity: expr.visible ? 1 : 0.5,
            }}
          >
            <div style={styles.expressionInputWrap}>
              <div style={styles.rowNumber}>{idx + 1}</div>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  value={expr.formula}
                  placeholder={`y = f(x)  或  z = f(x,y)`}
                  onChange={(e) => handleInput(e, idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  onFocus={() => {
                    if (expr.formula.length === 0 || FUNCTION_TEMPLATES.some((t) => t.template.startsWith(expr.formula.charAt(0)))) {
                      setShowSuggestFor(idx);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestFor(null), 150)}
                  style={styles.input}
                  spellCheck={false}
                />
                {showSuggestFor === idx && (
                  <div ref={suggestRef} style={styles.suggestBox}>
                    {FUNCTION_TEMPLATES.map((tpl, i) => (
                      <div
                        key={tpl.label}
                        className="suggest-item"
                        onClick={() => applySuggestion(tpl.template, idx)}
                        style={{
                          ...styles.suggestItem,
                          background: autocompleteIdx === i ? '#3a3a4e' : 'transparent',
                        }}
                      >
                        <span style={styles.suggestLabel}>{tpl.label}</span>
                        <span style={styles.suggestDesc}>{tpl.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.rowButtons}>
                <button
                  title="切换显示"
                  onClick={() => updateExpression(idx, { visible: !expr.visible })}
                  style={styles.iconBtn}
                  className="icon-btn"
                >
                  {expr.visible ? '👁' : '🚫'}
                </button>
                <button
                  title="参数设置"
                  onClick={() => setActiveParamId(activeParamId === expr.id ? null : expr.id)}
                  className="icon-btn"
                  style={{
                    ...styles.iconBtn,
                    background: activeParamId === expr.id ? '#e9456030' : 'transparent',
                    color: activeParamId === expr.id ? '#e94560' : '#ffffff80',
                  }}
                >
                  ⚙
                </button>
                <button
                  title="删除"
                  onClick={() => removeExpression(idx)}
                  style={styles.iconBtn}
                  className="icon-btn"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addExpression} style={styles.addBtn} className="add-btn">
        <span style={{ fontSize: 18 }}>+</span> 添加新函数
      </button>

      <div style={styles.submitRow}>
        <button onClick={onSubmit} style={styles.submitBtn} className="submit-btn">
          绘制图形 (Enter)
        </button>
      </div>

      {activeExpr && (
        <div
          style={{
            ...styles.paramPanel,
            opacity: activeParamId === activeExpr.id ? 1 : 0,
            pointerEvents: activeParamId === activeExpr.id ? 'auto' : 'none',
            transform: activeParamId === activeExpr.id ? 'translateY(0)' : 'translateY(12px)',
          }}
        >
          <div style={styles.paramPanelHeader}>
            <ColorPicker
              color={activeExpr.color}
              onChange={(c) => updateExpression(expressions.indexOf(activeExpr), { color: c })}
            />
            <span style={styles.paramPanelTitle}>函数参数</span>
            <select
              value={activeExpr.type}
              onChange={(e) =>
                updateExpression(expressions.indexOf(activeExpr), {
                  type: e.target.value as Expression['type'],
                })
              }
              style={styles.typeSelect}
            >
              <option value="2d-line">2D 折线</option>
              <option value="2d-scatter">2D 散点</option>
              <option value="polar">极坐标</option>
              <option value="implicit">隐函数</option>
              <option value="3d-surface">3D 曲面</option>
              <option value="3d-contour">3D 等高线</option>
            </select>
          </div>

          <div style={styles.paramList}>
            {activeParams.length === 0 ? (
              <div style={styles.noParams}>
                此函数无参数。
                <br />
                <span style={{ color: '#ffffff60', fontSize: 12 }}>
                  提示：在公式中使用 a、b、c 等字母即可生成可调节参数
                </span>
              </div>
            ) : (
              activeParams.map((name) => (
                <div key={name} style={styles.paramRow}>
                  <label style={styles.paramName}>{name}</label>
                  <div style={styles.sliderWrap}>
                    <div
                      style={{
                        ...styles.sliderTrack,
                        background: `linear-gradient(to right, #e94560 0%, #e94560 ${Math.max(
                          0,
                          Math.min(100, ((parameters[name] - (-5)) / 10) * 100)
                        )}%, #ffffff20 ${Math.max(
                          0,
                          Math.min(100, ((parameters[name] - (-5)) / 10) * 100)
                        )}%, #ffffff20 100%)`,
                      }}
                    >
                      <input
                        type="range"
                        min={-5}
                        max={5}
                        step={0.01}
                        value={parameters[name] ?? 1}
                        onChange={(e) => updateParam(name, parseFloat(e.target.value))}
                        style={styles.sliderInput}
                      />
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={parameters[name] ?? 1}
                    onChange={(e) => updateParam(name, parseFloat(e.target.value) || 0)}
                    style={styles.paramNumInput}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ColorPicker: React.FC<{ color: string; onChange: (c: string) => void }> = ({ color, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const presetColors = DEFAULT_COLORS.concat(['#ffffff', '#000000', '#ff6b6b', '#4ecdc4', '#ff9f43']);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid #ffffff30',
          background: color,
          cursor: 'pointer',
          padding: 0,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
      />
      {open && (
        <div style={styles.colorPicker}>
          <div style={styles.colorGrid}>
            {presetColors.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: c === color ? '2px solid #ffffff' : '2px solid transparent',
                  background: c,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <div style={styles.customColorRow}>
            <span style={{ fontSize: 12, color: '#ffffff80' }}>自定义:</span>
            <input
              type="color"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              style={{ width: 36, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 340,
    height: '100%',
    background: '#1e1e2e',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    boxSizing: 'border-box',
    color: '#fff',
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottom: '1px solid #ffffff10',
  },
  headerIcon: {
    width: 36,
    height: 36,
    background: 'linear-gradient(135deg, #e94560, #ff6b8a)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 700,
  },
  headerText: {
    fontSize: 17,
    fontWeight: 600,
    color: '#fff',
  },
  expressionsList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    overflowY: 'auto',
    paddingRight: 4,
  },
  expressionRow: {
    background: '#ffffff08',
    borderRadius: 8,
    padding: '8px 10px 8px 0',
    transition: 'all 0.2s',
    borderLeft: '4px solid #e94560',
  },
  expressionInputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  rowNumber: {
    width: 22,
    textAlign: 'center',
    color: '#ffffff50',
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  input: {
    width: '100%',
    background: '#0d0d1a',
    border: '1px solid #ffffff15',
    borderRadius: 6,
    padding: '8px 10px',
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Consolas, Menlo, monospace',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  suggestBox: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: '#2a2a3e',
    border: '1px solid #4a4a5e',
    borderRadius: 8,
    maxHeight: 240,
    overflowY: 'auto',
    zIndex: 20,
    boxShadow: '0 8px 24px #00000080',
  },
  suggestItem: {
    padding: '0 12px',
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  suggestLabel: {
    fontFamily: 'Consolas, Menlo, monospace',
    fontSize: 13,
    color: '#48dbfb',
  },
  suggestDesc: {
    fontSize: 12,
    color: '#ffffff60',
  },
  rowButtons: {
    display: 'flex',
    gap: 2,
    flexShrink: 0,
  },
  iconBtn: {
    width: 28,
    height: 28,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: '#ffffff80',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  addBtn: {
    background: '#ffffff08',
    border: '1px dashed #ffffff30',
    borderRadius: 8,
    color: '#ffffff80',
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'all 0.2s',
  },
  submitRow: {},
  submitBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #e94560, #ff6b8a)',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 4px 12px #e9456040',
  },
  paramPanel: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    width: 340,
    height: 320,
    background: '#2a2a3e',
    borderRadius: 12,
    border: '1px solid #4a4a5e',
    padding: 14,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    zIndex: 10,
    transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
    boxShadow: '0 12px 40px #00000080',
  },
  paramPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
    borderBottom: '1px solid #ffffff10',
  },
  paramPanelTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
  },
  typeSelect: {
    background: '#ffffff10',
    border: '1px solid #ffffff20',
    borderRadius: 6,
    color: '#fff',
    padding: '5px 8px',
    fontSize: 12,
    outline: 'none',
  },
  paramList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  paramRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  paramName: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: 'linear-gradient(135deg, #48dbfb30, #48dbfb10)',
    color: '#48dbfb',
    fontSize: 14,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Consolas, monospace',
    flexShrink: 0,
  },
  sliderWrap: {
    flex: 1,
  },
  sliderTrack: {
    width: 200,
    height: 6,
    borderRadius: 3,
    position: 'relative',
  },
  sliderInput: {
    position: 'absolute',
    inset: 0,
    width: 200,
    height: 6,
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'transparent',
    outline: 'none',
    margin: 0,
    cursor: 'pointer',
  },
  paramNumInput: {
    width: 56,
    background: '#0d0d1a',
    border: '1px solid #ffffff15',
    borderRadius: 6,
    padding: '5px 8px',
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Consolas, monospace',
    outline: 'none',
    textAlign: 'right',
    MozAppearance: 'textfield',
  },
  noParams: {
    color: '#ffffff60',
    fontSize: 13,
    textAlign: 'center',
    padding: '20px 8px',
    lineHeight: 1.6,
  },
  colorPicker: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    background: '#1e1e2e',
    border: '1px solid #4a4a5e',
    borderRadius: 10,
    padding: 12,
    zIndex: 30,
    boxShadow: '0 8px 24px #00000080',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 28px)',
    gap: 6,
    marginBottom: 10,
  },
  customColorRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTop: '1px solid #ffffff10',
  },
};

export default FormulaInput;
