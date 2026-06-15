import { useReducer, useCallback, useRef, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import BatchCard from './components/BatchCard';
import {
  BatchRecord,
  FlavorProfile,
  RoastCurvePoint,
  DEFAULT_FLAVOR_PROFILE,
  FLAVOR_KEYS,
  FLAVOR_LABELS,
  FLAVOR_COLORS,
  generateRoastCurve,
} from './utils/types';

interface AppState {
  records: BatchRecord[];
  selectedIds: Set<string>;
  removingIds: Set<string>;
  resetting: boolean;
}

type Action =
  | { type: 'ADD_RECORD'; record: BatchRecord }
  | { type: 'DELETE_RECORD'; id: string }
  | { type: 'CONFIRM_DELETE'; id: string }
  | { type: 'UPDATE_FLAVOR'; id: string; profile: FlavorProfile }
  | { type: 'TOGGLE_SELECT'; id: string; selected: boolean }
  | { type: 'RESET_ALL' }
  | { type: 'CLEAR_ALL' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_RECORD':
      return { ...state, records: [...state.records, action.record] };
    case 'DELETE_RECORD':
      return {
        ...state,
        removingIds: new Set([...state.removingIds, action.id]),
      };
    case 'CONFIRM_DELETE':
      return {
        ...state,
        records: state.records.filter((r) => r.id !== action.id),
        removingIds: new Set([...state.removingIds].filter((i) => i !== action.id)),
        selectedIds: new Set([...state.selectedIds].filter((i) => i !== action.id)),
      };
    case 'UPDATE_FLAVOR':
      return {
        ...state,
        records: state.records.map((r) =>
          r.id === action.id ? { ...r, flavorProfile: action.profile } : r
        ),
      };
    case 'TOGGLE_SELECT': {
      const next = new Set(state.selectedIds);
      if (action.selected) next.add(action.id);
      else next.delete(action.id);
      return { ...state, selectedIds: next };
    }
    case 'RESET_ALL':
      return { ...state, resetting: true };
    case 'CLEAR_ALL':
      return { records: [], selectedIds: new Set(), removingIds: new Set(), resetting: false };
    default:
      return state;
  }
}

const initialState: AppState = {
  records: [],
  selectedIds: new Set(),
  removingIds: new Set(),
  resetting: false,
};

function CurveModal({
  record,
  onClose,
}: {
  record: BatchRecord;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    time: number;
    temp: number;
  } | null>(null);
  const [visible, setVisible] = useState(false);
  const pointsRef = useRef(record.curvePoints);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points = pointsRef.current;
    const w = 520;
    const h = 320;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    const pad = { top: 30, right: 30, bottom: 40, left: 50 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    ctx.fillStyle = '#FFF';
    ctx.fillRect(0, 0, w, h);

    const maxTime = Math.max(...points.map((p) => p.time), 1);
    const minTemp = Math.min(...points.map((p) => p.temperature)) - 10;
    const maxTemp = Math.max(...points.map((p) => p.temperature)) + 10;
    const tempRange = maxTemp - minTemp || 1;

    ctx.strokeStyle = '#E0D8CF';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (plotH * i) / 5;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
      const tempVal = Math.round(maxTemp - (tempRange * i) / 5);
      ctx.fillStyle = '#8D6E63';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${tempVal}°C`, pad.left - 8, y);
    }
    for (let i = 0; i <= 5; i++) {
      const x = pad.left + (plotW * i) / 5;
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + plotH);
      ctx.stroke();
      const timeVal = Math.round((maxTime * i) / 5);
      ctx.fillStyle = '#8D6E63';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${timeVal}min`, x, pad.top + plotH + 8);
    }

    ctx.beginPath();
    ctx.strokeStyle = '#C75B39';
    ctx.lineWidth = 2;
    points.forEach((p, i) => {
      const x = pad.left + (p.time / maxTime) * plotW;
      const y = pad.top + ((maxTemp - p.temperature) / tempRange) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    points.forEach((p) => {
      const x = pad.left + (p.time / maxTime) * plotW;
      const y = pad.top + ((maxTemp - p.temperature) / tempRange) * plotH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF';
      ctx.fill();
      ctx.strokeStyle = '#C75B39';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    ctx.fillStyle = '#3E2723';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${record.batchNumber} - ${record.beanName} 烘焙曲线`,
      w / 2,
      16
    );
  }, [record.batchNumber, record.beanName]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const points = pointsRef.current;
      const w = 520;
      const h = 320;
      const pad = { top: 30, right: 30, bottom: 40, left: 50 };
      const plotW = w - pad.left - pad.right;
      const plotH = h - pad.top - pad.bottom;
      const maxTime = Math.max(...points.map((p) => p.time), 1);
      const minTemp = Math.min(...points.map((p) => p.temperature)) - 10;
      const maxTemp = Math.max(...points.map((p) => p.temperature)) + 10;
      const tempRange = maxTemp - minTemp || 1;

      let closest: { p: RoastCurvePoint; dist: number; sx: number; sy: number } | null = null;
      for (const p of points) {
        const sx = pad.left + (p.time / maxTime) * plotW;
        const sy = pad.top + ((maxTemp - p.temperature) / tempRange) * plotH;
        const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
        if (!closest || dist < closest.dist) closest = { p, dist, sx, sy };
      }
      if (closest && closest.dist < 20) {
        setTooltip({
          x: closest.sx,
          y: closest.sy,
          time: closest.p.time,
          temp: closest.p.temperature,
        });
      } else {
        setTooltip(null);
      }
    },
    []
  );

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(62,39,35,0.5)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#FFF',
          borderRadius: 16,
          overflow: 'hidden',
          width: 560,
          transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
          transform: visible ? 'translateY(0)' : 'translateY(60px)',
          opacity: visible ? 1 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: '#6F4E37',
            color: '#FFF',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 'bold', fontSize: 15 }}>烘焙曲线</span>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#FFF',
              borderRadius: 4,
              padding: '2px 10px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            关闭
          </button>
        </div>
        <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setTooltip(null)}
              style={{ display: 'block' }}
            />
            {tooltip && (
              <div
                style={{
                  position: 'absolute',
                  left: tooltip.x + 10,
                  top: tooltip.y - 30,
                  background: '#3E2723',
                  color: '#FFF',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {tooltip.time}分钟 / {tooltip.temp}°C
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function generateProductHTML(records: BatchRecord[]): string {
  const flavorItems = (profile: FlavorProfile) =>
    FLAVOR_KEYS.map(
      (key) =>
        `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
          <span style="width:60px;font-size:13px;color:#8D6E63;">${FLAVOR_LABELS[key]}</span>
          <div style="flex:1;height:8px;background:#E0D8CF;border-radius:4px;overflow:hidden;">
            <div style="width:${profile[key]}%;height:100%;background:${FLAVOR_COLORS[key]};border-radius:4px;"></div>
          </div>
          <span style="font-size:12px;color:#3E2723;width:32px;text-align:right;">${Math.round(profile[key])}%</span>
        </div>`
    ).join('');

  const curveSVG = (points: RoastCurvePoint[]) => {
    const maxTime = Math.max(...points.map((p) => p.time), 1);
    const minTemp = Math.min(...points.map((p) => p.temperature)) - 10;
    const maxTemp = Math.max(...points.map((p) => p.temperature)) + 10;
    const tempRange = maxTemp - minTemp || 1;
    const w = 400;
    const h = 200;
    const pad = { t: 10, r: 10, b: 30, l: 40 };
    const pw = w - pad.l - pad.r;
    const ph = h - pad.t - pad.b;
    const pathD = points
      .map((p, i) => {
        const x = pad.l + (p.time / maxTime) * pw;
        const y = pad.t + ((maxTemp - p.temperature) / tempRange) * ph;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="#FFF" rx="8"/>
      <path d="${pathD}" fill="none" stroke="#C75B39" stroke-width="2"/>
      ${points
        .map((p) => {
          const x = pad.l + (p.time / maxTime) * pw;
          const y = pad.t + ((maxTemp - p.temperature) / tempRange) * ph;
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#FFF" stroke="#C75B39" stroke-width="1.5"/>`;
        })
        .join('')}
      <text x="${w / 2}" y="${h - 6}" text-anchor="middle" font-size="10" fill="#8D6E63">时间 (分钟)</text>
    </svg>`;
  };

  const batchCards = records
    .map(
      (r) => `
    <div style="background:#FFF;border-radius:12px;box-shadow:0 2px 8px rgba(62,39,35,0.12);overflow:hidden;margin-bottom:16px;">
      <div style="background:#6F4E37;color:#FFF;padding:10px 16px;font-weight:bold;font-size:15px;">
        ${r.batchNumber}
      </div>
      <div style="padding:16px;color:#3E2723;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:13px;margin-bottom:12px;">
          <div><span style="color:#8D6E63;">生豆：</span>${r.beanName}</div>
          <div><span style="color:#8D6E63;">日期：</span>${r.roastDate}</div>
          <div><span style="color:#8D6E63;">时长：</span>${r.roastDuration} 分钟</div>
          <div><span style="color:#8D6E63;">温度：</span>${r.roastTemperature}°C</div>
        </div>
        <div style="font-weight:bold;font-size:13px;margin-bottom:6px;color:#3E2723;">风味特征</div>
        ${flavorItems(r.flavorProfile)}
        <div style="margin-top:12px;">
          <div style="font-weight:bold;font-size:13px;margin-bottom:6px;color:#3E2723;">烘焙曲线</div>
          ${curveSVG(r.curvePoints)}
        </div>
      </div>
    </div>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>咖啡产品介绍</title>
</head>
<body style="background:#F5F0E8;margin:0;padding:24px;font-family:sans-serif;">
<div style="max-width:640px;margin:0 auto;">
  <h1 style="color:#3E2723;text-align:center;margin-bottom:24px;">☕ 咖啡产品介绍</h1>
  ${batchCards}
</div>
</body>
</html>`;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [curveRecord, setCurveRecord] = useState<BatchRecord | null>(null);
  const [productHTML, setProductHTML] = useState<string | null>(null);
  const [form, setForm] = useState({
    batchNumber: '',
    beanName: '',
    roastDate: new Date().toISOString().slice(0, 10),
    roastDuration: '',
    roastTemperature: '',
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.removingIds.size === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    state.removingIds.forEach((id) => {
      timers.push(
        setTimeout(() => dispatch({ type: 'CONFIRM_DELETE', id }), 300)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [state.removingIds]);

  useEffect(() => {
    if (!state.resetting) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_ALL' }), 400);
    return () => clearTimeout(timer);
  }, [state.resetting]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.batchNumber || !form.beanName || !form.roastDuration || !form.roastTemperature) return;
      const duration = Number(form.roastDuration);
      const temperature = Number(form.roastTemperature);
      if (isNaN(duration) || isNaN(temperature)) return;
      const record: BatchRecord = {
        id: uuidv4(),
        batchNumber: form.batchNumber,
        beanName: form.beanName,
        roastDate: form.roastDate,
        roastDuration: duration,
        roastTemperature: temperature,
        flavorProfile: { ...DEFAULT_FLAVOR_PROFILE },
        curvePoints: generateRoastCurve(duration, temperature),
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_RECORD', record });
      setForm({
        batchNumber: '',
        beanName: '',
        roastDate: new Date().toISOString().slice(0, 10),
        roastDuration: '',
        roastTemperature: '',
      });
    },
    [form]
  );

  const handleDelete = useCallback((id: string) => {
    dispatch({ type: 'DELETE_RECORD', id });
  }, []);

  const handleViewCurve = useCallback((record: BatchRecord) => {
    setCurveRecord(record);
  }, []);

  const handleSelect = useCallback((id: string, selected: boolean) => {
    dispatch({ type: 'TOGGLE_SELECT', id, selected });
  }, []);

  const handleFlavorChange = useCallback(
    (id: string, profile: FlavorProfile) => {
      dispatch({ type: 'UPDATE_FLAVOR', id, profile });
    },
    []
  );

  const handleGenerateProduct = useCallback(() => {
    const selected = state.records.filter((r) =>
      state.selectedIds.has(r.id)
    );
    if (selected.length === 0) return;
    setProductHTML(generateProductHTML(selected));
  }, [state.records, state.selectedIds]);

  const handleCopyHTML = useCallback(async () => {
    if (!productHTML) return;
    try {
      await navigator.clipboard.writeText(productHTML);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = productHTML;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [productHTML]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
    setProductHTML(null);
  }, []);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #D7CCC8',
    borderRadius: 6,
    fontSize: 13,
    color: '#3E2723',
    background: '#FFF',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: '#8D6E63',
    marginBottom: 4,
    fontWeight: 'bold',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0E8' }}>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          background: '#3E2723',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(62,39,35,0.3)',
        }}
      >
        <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>
          ☕ Coffee Roast Studio
        </span>
        <button
          onClick={handleReset}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#FFF',
            borderRadius: 6,
            padding: '6px 16px',
            cursor: 'pointer',
            fontSize: 13,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.25)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)';
          }}
        >
          重置所有数据
        </button>
      </nav>

      <div
        style={{
          paddingTop: 76,
          display: 'flex',
          gap: 20,
          padding: '76px 20px 20px',
          minHeight: '100vh',
        }}
        className="main-layout"
      >
        <div
          style={{
            width: '30%',
            minWidth: 260,
            flexShrink: 0,
          }}
          className="left-panel"
        >
          <form
            onSubmit={handleSubmit}
            style={{
              background: '#FFF',
              borderRadius: 12,
              padding: 20,
              boxShadow: '0 2px 8px rgba(62,39,35,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h2
              style={{
                margin: '0 0 4px',
                color: '#3E2723',
                fontSize: 16,
                fontWeight: 'bold',
              }}
            >
              新增烘焙批次
            </h2>
            <div>
              <label style={labelStyle}>批次号</label>
              <input
                style={inputStyle}
                value={form.batchNumber}
                onChange={(e) =>
                  setForm({ ...form, batchNumber: e.target.value })
                }
                placeholder="例如: B-2024-001"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>生豆名称</label>
              <input
                style={inputStyle}
                value={form.beanName}
                onChange={(e) =>
                  setForm({ ...form, beanName: e.target.value })
                }
                placeholder="例如: 埃塞俄比亚 耶加雪菲"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>烘焙日期</label>
              <input
                style={inputStyle}
                type="date"
                value={form.roastDate}
                onChange={(e) =>
                  setForm({ ...form, roastDate: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label style={labelStyle}>烘焙时长（分钟）</label>
              <input
                style={inputStyle}
                type="number"
                min="1"
                max="60"
                value={form.roastDuration}
                onChange={(e) =>
                  setForm({ ...form, roastDuration: e.target.value })
                }
                placeholder="例如: 12"
                required
              />
            </div>
            <div>
              <label style={labelStyle}>烘焙温度（°C）</label>
              <input
                style={inputStyle}
                type="number"
                min="100"
                max="300"
                value={form.roastTemperature}
                onChange={(e) =>
                  setForm({ ...form, roastTemperature: e.target.value })
                }
                placeholder="例如: 220"
                required
              />
            </div>
            <button
              type="submit"
              style={{
                background: '#6F4E37',
                border: 'none',
                color: '#FFF',
                borderRadius: 8,
                padding: '10px 0',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 'bold',
                transition: 'background 0.2s',
                marginTop: 4,
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = '#5a3d2b';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = '#6F4E37';
              }}
            >
              提交批次
            </button>
          </form>

          <button
            onClick={handleGenerateProduct}
            disabled={state.selectedIds.size === 0}
            style={{
              width: '100%',
              marginTop: 12,
              background:
                state.selectedIds.size === 0 ? '#BCAAA4' : '#6F4E37',
              border: 'none',
              color: '#FFF',
              borderRadius: 8,
              padding: '10px 0',
              cursor: state.selectedIds.size === 0 ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 'bold',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              if (state.selectedIds.size > 0)
                (e.target as HTMLButtonElement).style.background = '#5a3d2b';
            }}
            onMouseLeave={(e) => {
              if (state.selectedIds.size > 0)
                (e.target as HTMLButtonElement).style.background = '#6F4E37';
            }}
          >
            生成产品页（已选 {state.selectedIds.size} 项）
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            transition: state.resetting ? 'opacity 0.4s' : 'none',
            opacity: state.resetting ? 0 : 1,
          }}
          className="right-panel"
        >
          {productHTML ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    color: '#3E2723',
                    fontSize: 16,
                    fontWeight: 'bold',
                  }}
                >
                  产品页面预览
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleCopyHTML}
                    style={{
                      background: '#6F4E37',
                      border: 'none',
                      color: '#FFF',
                      borderRadius: 6,
                      padding: '6px 14px',
                      cursor: 'pointer',
                      fontSize: 13,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.background = '#5a3d2b';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.background = '#6F4E37';
                    }}
                  >
                    {copied ? '✓ 已复制' : '复制代码'}
                  </button>
                  <button
                    onClick={() => setProductHTML(null)}
                    style={{
                      background: '#BCAAA4',
                      border: 'none',
                      color: '#FFF',
                      borderRadius: 6,
                      padding: '6px 14px',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    关闭预览
                  </button>
                </div>
              </div>
              <iframe
                srcDoc={productHTML}
                style={{
                  width: '100%',
                  height: 600,
                  border: '1px solid #D7CCC8',
                  borderRadius: 8,
                  background: '#FFF',
                }}
                title="产品页面预览"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                alignContent: 'flex-start',
              }}
            >
              {state.records.length === 0 && (
                <div
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    color: '#8D6E63',
                    padding: '60px 0',
                    fontSize: 15,
                  }}
                >
                  暂无烘焙记录，请在左侧添加批次
                </div>
              )}
              {state.records.map((record) => (
                <div
                  key={record.id}
                  style={{
                    width: 'calc(50% - 8px)',
                    minWidth: 280,
                    flexShrink: 0,
                  }}
                  className="card-wrapper"
                >
                  <BatchCard
                    record={record}
                    onDelete={handleDelete}
                    onViewCurve={handleViewCurve}
                    onSelect={handleSelect}
                    onFlavorChange={handleFlavorChange}
                    selected={state.selectedIds.has(record.id)}
                    removing={state.removingIds.has(record.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {curveRecord && (
        <CurveModal
          record={curveRecord}
          onClose={() => setCurveRecord(null)}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .main-layout {
            flex-direction: column !important;
          }
          .left-panel {
            width: 100% !important;
            min-width: 0 !important;
          }
          .card-wrapper {
            width: 100% !important;
          }
        }
        input:focus, select:focus {
          border-color: #6F4E37 !important;
        }
      `}</style>
    </div>
  );
}
