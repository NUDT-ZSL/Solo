import React, { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (hex: string) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const s = hex.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
};

const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, v];
};

const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  const c = v * s;
  const hh = (h % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (0 <= hh && hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

export const getComplementaryHex = (hex: string): string => {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, v] = rgbToHsv(r, g, b);
  const [r2, g2, b2] = hsvToRgb((h + 180) % 360, Math.max(s, 0.55), Math.max(v, 0.75));
  return rgbToHex(r2, g2, b2);
};

export default function ColorPicker({ value, onChange, onConfirm, onCancel }: Props) {
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const satRef = useRef<HTMLCanvasElement>(null);
  const [hsv, setHsv] = useState<[number, number, number]>(() => {
    const [r, g, b] = hexToRgb(value || '#5B7FFF');
    return rgbToHsv(r, g, b);
  });
  const [huePos, setHuePos] = useState({ x: 0, y: 0 });
  const [svPos, setSvPos] = useState({ x: 0, y: 0 });
  const draggingRef = useRef<'wheel' | 'sv' | null>(null);

  const RADIUS = 120;

  useEffect(() => {
    const [r, g, b] = hexToRgb(value || '#5B7FFF');
    const nhsv = rgbToHsv(r, g, b);
    setHsv(nhsv);
  }, [value]);

  useEffect(() => {
    const wheel = wheelRef.current;
    const sat = satRef.current;
    if (!wheel || !sat) return;
    const wctx = wheel.getContext('2d');
    const sctx = sat.getContext('2d');
    if (!wctx || !sctx) return;

    const size = RADIUS * 2 + 20;
    wheel.width = size; wheel.height = size;
    wctx.clearRect(0, 0, size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - size / 2;
        const dy = y - size / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= RADIUS && dist >= RADIUS - 24) {
          let angle = Math.atan2(dy, dx) * 180 / Math.PI;
          if (angle < 0) angle += 360;
          const [cr, cg, cb] = hsvToRgb(angle, 1, 1);
          wctx.fillStyle = `rgb(${cr|0},${cg|0},${cb|0})`;
          wctx.fillRect(x, y, 1, 1);
        }
      }
    }

    sat.width = 220; sat.height = 140;
    const w = sat.width, h = sat.height;
    const pure = hsvToRgb(hsv[0], 1, 1);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = x / w;
        const v = 1 - y / h;
        const r = 255 + (pure[0] - 255) * s;
        const g = 255 + (pure[1] - 255) * s;
        const b = 255 + (pure[2] - 255) * s;
        const rr = Math.round(r * v);
        const gg = Math.round(g * v);
        const bb = Math.round(b * v);
        sctx.fillStyle = `rgb(${rr},${gg},${bb})`;
        sctx.fillRect(x, y, 1, 1);
      }
    }
  }, [hsv[0]]);

  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const angleRad = (hsv[0]) * Math.PI / 180;
    const r = RADIUS - 12;
    const cx = RADIUS + 10;
    setHuePos({ x: cx + Math.cos(angleRad) * r, y: cx + Math.sin(angleRad) * r });
  }, [hsv[0]]);

  useEffect(() => {
    const sat = satRef.current;
    if (!sat) return;
    setSvPos({ x: hsv[1] * sat.width, y: (1 - hsv[2]) * sat.height });
  }, [hsv[1], hsv[2]]);

  const updateFromWheel = (clientX: number, clientY: number) => {
    const wheel = wheelRef.current!;
    const rect = wheel.getBoundingClientRect();
    const cx = rect.width / 2;
    const x = clientX - rect.left - cx;
    const y = clientY - rect.top - cx;
    let angle = Math.atan2(y, x) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    const [r, g, b] = hsvToRgb(angle, hsv[1], hsv[2]);
    const hex = rgbToHex(r, g, b);
    setHsv([angle, hsv[1], hsv[2]]);
    onChange(hex);
  };

  const updateFromSv = (clientX: number, clientY: number) => {
    const sat = satRef.current!;
    const rect = sat.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const s = x / rect.width;
    const v = 1 - y / rect.height;
    const [r, g, b] = hsvToRgb(hsv[0], s, v);
    const hex = rgbToHex(r, g, b);
    setHsv([hsv[0], s, v]);
    onChange(hex);
  };

  const onMouseDown = (type: 'wheel' | 'sv') => (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = type;
    if (type === 'wheel') updateFromWheel(e.clientX, e.clientY);
    else updateFromSv(e.clientX, e.clientY);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current === 'wheel') updateFromWheel(e.clientX, e.clientY);
      else if (draggingRef.current === 'sv') updateFromSv(e.clientX, e.clientY);
    };
    const onUp = () => { draggingRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [hsv]);

  const [r, g, b] = hexToRgb(value || '#000');
  const textLight = (r * 0.299 + g * 0.587 + b * 0.114) > 150;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative' }} onMouseDown={onMouseDown('wheel')}>
          <canvas ref={wheelRef} style={{ display: 'block', cursor: 'crosshair' }} />
          <div style={{
            position: 'absolute',
            left: huePos.x - 9, top: huePos.y - 9,
            width: 18, height: 18,
            borderRadius: '50%',
            border: '2px solid #fff',
            boxShadow: '0 0 6px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }} />
        </div>
        <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }} onMouseDown={onMouseDown('sv')}>
          <canvas ref={satRef} style={{ display: 'block', borderRadius: 8, cursor: 'crosshair' }} />
          <div style={{
            position: 'absolute',
            left: svPos.x - 7, top: svPos.y - 7,
            width: 14, height: 14,
            borderRadius: '50%',
            border: '2px solid #fff',
            boxShadow: '0 0 4px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
        <div style={{
          width: 64, height: 44, borderRadius: 10,
          background: value,
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: textLight ? '#1a1a1a' : '#fff',
          fontSize: 11, fontWeight: 700,
          boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.05)',
          letterSpacing: 0.5,
        }}>
          {value.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>HEX 代码</label>
          <input
            value={value}
            onChange={(e) => {
              let v = e.target.value;
              if (!v.startsWith('#')) v = '#' + v;
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                onChange(v);
              }
            }}
            style={{ textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' }}
          />
        </div>
      </div>

      {(onConfirm || onCancel) && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%', marginTop: 4 }}>
          {onCancel && (
            <button className="btn-ghost" onClick={onCancel} type="button">取消</button>
          )}
          {onConfirm && (
            <button className="btn-primary" onClick={onConfirm} type="button">确定使用</button>
          )}
        </div>
      )}
    </div>
  );
}
