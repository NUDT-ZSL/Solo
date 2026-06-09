import { useEffect, useRef } from 'react';
import { PreferenceMap, TAG_HUES } from '../types';

interface Props {
  open: boolean;
  weights: PreferenceMap;
  allTags: string[];
  onClose: () => void;
  onReset: () => void;
}

function lerpColor(cold: string, warm: string, t: number): string {
  const parseHex = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parseHex(cold);
  const [r2, g2, b2] = parseHex(warm);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function PreferencePanel({
  open,
  weights,
  allTags,
  onClose,
  onReset,
}: Props) {
  const barRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!open) return;
    const map = barRefs.current;
    let rafId = 0;
    const start = performance.now();
    const duration = 500;

    const currentWidths = new Map<string, number>();
    for (const tag of allTags) {
      const el = map.get(tag);
      if (el) {
        const current = parseFloat(el.style.width || '0');
        currentWidths.set(tag, isNaN(current) ? 0 : current);
      }
    }

    const targetWidths = new Map<string, number>();
    for (const tag of allTags) {
      targetWidths.set(tag, (weights[tag] ?? 0) * 100);
    }

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = easeOut(p);

      for (const tag of allTags) {
        const el = map.get(tag);
        if (!el) continue;
        const from = currentWidths.get(tag) ?? 0;
        const to = targetWidths.get(tag) ?? 0;
        const w = from + (to - from) * eased;
        el.style.width = `${w}%`;
        const t = to / 100;
        el.style.background = `linear-gradient(90deg, ${lerpColor('#4A90D9', '#6B8AFF', t * 0.5)}, ${lerpColor('#4A90D9', '#FF6B6B', t)})`;
      }

      if (p < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [weights, allTags, open]);

  const setBarRef = (tag: string) => (el: HTMLDivElement | null) => {
    if (el) {
      barRefs.current.set(tag, el);
    } else {
      barRefs.current.delete(tag);
    }
  };

  const sortedTags = [...allTags].sort(
    (a, b) => (weights[b] ?? 0) - (weights[a] ?? 0)
  );

  return (
    <>
      <aside className={`preference-panel ${open ? 'open' : ''}`}>
        <div className="panel-header">
          <div className="panel-title">
            <h2>🎯 阅读偏好画像</h2>
            <span>标签权重可视化 · 范围 0~1</span>
          </div>
          <button className="panel-close" onClick={onClose} aria-label="关闭">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="panel-body">
          <button className="reset-btn" onClick={onReset}>
            ↻ 重置所有偏好
          </button>

          <div className="bar-chart">
            {sortedTags.map((tag) => {
              const w = weights[tag] ?? 0;
              const hue = TAG_HUES[tag] ?? 210;
              const initialColor = `hsl(${hue}, 55%, 55%)`;
              return (
                <div key={tag} className="bar-item">
                  <div className="bar-label-row">
                    <span className="bar-label">{tag}</span>
                    <span className="bar-value">{w.toFixed(2)}</span>
                  </div>
                  <div className="bar-track">
                    <div
                      ref={setBarRef(tag)}
                      className="bar-fill"
                      style={{
                        width: open ? `${w * 100}%` : '0%',
                        background: initialColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
