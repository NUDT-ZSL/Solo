import { useState, useRef, useEffect, useMemo } from 'react';
import { Annotation } from '../services/api';

interface ReviewPanelProps {
  annotations: Annotation[];
  selectedLine: { versionId: string; lineNumber: number } | null;
  expandedAnnotationId: string | null;
  onCreateAnnotation: (content: string) => void;
  onUpdateAnnotation: (id: string, data: { content?: string; status?: Annotation['status'] }) => void;
  onDeleteAnnotation: (id: string) => void;
  onExpandAnnotation: (id: string | null) => void;
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

type StatusKey = Annotation['status'];

const STATUS: Record<StatusKey, { label: string; icon: string; color: string; bg: string; border: string; hex: string }> = {
  pending:   { label: '未处理', icon: '●', color: '#4b5563', bg: '#f3f4f6', border: '#d1d5db', hex: '#6b7280' },
  confirmed: { label: '待确认', icon: '▲', color: '#b45309', bg: '#fffbeb', border: '#fcd34d', hex: '#d97706' },
  rejected:  { label: '需修改', icon: '✕', color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', hex: '#dc2626' },
  approved:  { label: '已通过', icon: '✓', color: '#15803d', bg: '#f0fdf4', border: '#86efac', hex: '#22c55e' },
};

const STATUS_ORDER: StatusKey[] = ['pending', 'confirmed', 'rejected', 'approved'];

/* ============= requestAnimationFrame + 强制重排 缩放弹跳动画 ============= */

interface AnimatedIconProps {
  status: StatusKey;
  trigger: number;  // 每次变更+1，强制重新触发动画
  size?: number;
}

const AnimatedStatusIcon = ({ status, trigger, size = 14 }: AnimatedIconProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const DURATION = 200;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    el.style.transform = 'scale(0.8)';

    // 关键：读取 offsetHeight 强制重排，确保浏览器已应用初始 0.8 状态
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _reflow = el.offsetHeight;
    // @ts-ignore
    void _reflow;

    startTimeRef.current = performance.now();

    const easeOutBack = (t: number): number => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const frame = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const raw = Math.min(elapsed / DURATION, 1);
      const eased = easeOutBack(raw);
      const scale = 0.8 + 0.2 * eased;

      if (el) el.style.transform = `scale(${scale})`;

      if (raw < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        if (el) el.style.transform = 'scale(1.0)';
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [status, trigger]);

  const s = STATUS[status];
  return (
    <div
      ref={wrapRef}
      style={{
        width: size + 8,
        height: size + 8,
        borderRadius: 6,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        fontSize: Math.max(size - 3, 9),
        fontWeight: 800,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        transformOrigin: '50% 50%',
        willChange: 'transform',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {s.icon}
    </div>
  );
};

/* ========================= Annotation 卡片 ========================= */

interface CardProps {
  ann: Annotation;
  expanded: boolean;
  onExpand: () => void;
  onUpdate: (data: { content?: string; status?: Annotation['status'] }) => void;
  onDelete: () => void;
  versionLabel?: string;
}

const AnnotationCard = ({ ann, expanded, onExpand, onUpdate, onDelete, versionLabel }: CardProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ann.content);
  const [statusTick, setStatusTick] = useState(0);

  useEffect(() => { setDraft(ann.content); }, [ann.content]);

  const changeStatus = (ns: StatusKey) => {
    if (ns === ann.status) return;
    onUpdate({ status: ns });
    setStatusTick(p => p + 1);
  };

  const saveEdit = () => {
    const t = draft.trim();
    if (t && t !== ann.content) onUpdate({ content: t });
    setEditing(false);
  };

  const s = STATUS[ann.status];

  return (
    <div
      onClick={onExpand}
      style={{
        background: '#fff',
        borderRadius: 8,
        border: expanded ? '1px solid #3b82f6' : '1px solid #e5e7eb',
        boxShadow: expanded ? '0 4px 12px rgba(59,130,246,0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
        padding: 12,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'pointer',
        animation: 'fadeIn 0.2s ease, slideUp 0.25s ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = expanded ? '0 4px 12px rgba(59,130,246,0.12)' : '0 1px 2px rgba(0,0,0,0.04)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AnimatedStatusIcon status={ann.status} trigger={statusTick} size={12} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <span>{ann.author}</span>
            <span>·</span>
            <span>行 {ann.lineNumber}</span>
            {versionLabel && (<><span>·</span><span style={{ color: '#2563eb' }}>{versionLabel}</span></>)}
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
            {new Date(ann.updatedAt).toLocaleString('zh-CN', { hour12: false })}
          </div>
        </div>
        <div style={{
          fontSize: 12, color: '#c1c7cf',
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
          flexShrink: 0,
        }}>▾</div>
      </div>

      {editing ? (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 10 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="在此输入批注内容"
            autoFocus
            style={{
              width: '100%', minHeight: 72, padding: 10,
              borderRadius: 6, border: '1px solid #d1d5db',
              fontSize: 13, lineHeight: 1.6, resize: 'vertical',
              fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
            <button onClick={() => setEditing(false)}
              style={{ padding: '6px 12px', fontSize: 12, color: '#6b7280', background: '#f3f4f6', borderRadius: 6, fontWeight: 500 }}>取消</button>
            <button onClick={saveEdit}
              style={{ padding: '6px 12px', fontSize: 12, color: '#fff', background: '#3b82f6', borderRadius: 6, fontWeight: 500 }}>保存</button>
          </div>
        </div>
      ) : (
        <div style={{
          marginTop: 8, fontSize: 13, color: '#374151', lineHeight: 1.6,
          maxHeight: expanded ? 'none' : 48, overflow: expanded ? 'visible' : 'hidden',
          display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2,
          WebkitBoxOrient: 'vertical', wordBreak: 'break-word',
        }}>
          {ann.content}
        </div>
      )}

      {expanded && !editing && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
          <div style={{ marginBottom: 10, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>切换状态</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {STATUS_ORDER.map((k) => {
              const cfg = STATUS[k];
              const active = ann.status === k;
              // 为每个按钮的图标创建独立 trigger，激活项使用全局 statusTick，其他用 0
              const iconTick = active ? statusTick : 0;
              return (
                <button
                  key={k}
                  onClick={() => changeStatus(k)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '8px 4px', borderRadius: 6,
                    border: active ? `1px solid ${cfg.border}` : '1px solid transparent',
                    background: active ? cfg.bg : '#fafafa',
                    transition: 'background 0.12s ease',
                    fontSize: 10, color: cfg.color, fontWeight: 600,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = cfg.bg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = active ? cfg.bg : '#fafafa')}
                >
                  <AnimatedStatusIcon status={k} trigger={iconTick} size={11} />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
            <button onClick={() => setEditing(true)}
              style={{ padding: '6px 12px', fontSize: 12, color: '#2563eb', background: '#eff6ff', borderRadius: 6, fontWeight: 500 }}>编辑</button>
            <button onClick={() => { if (confirm('确认删除此批注？')) onDelete(); }}
              style={{ padding: '6px 12px', fontSize: 12, color: '#dc2626', background: '#fef2f2', borderRadius: 6, fontWeight: 500 }}>删除</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ========================= 面板主体 ========================= */

export default function ReviewPanel({
  annotations, selectedLine, expandedAnnotationId,
  onCreateAnnotation, onUpdateAnnotation, onDeleteAnnotation, onExpandAnnotation,
  isMobile, isOpen, onClose,
}: ReviewPanelProps) {
  const [draft, setDraft] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const g: Record<StatusKey, Annotation[]> = { pending: [], confirmed: [], approved: [], rejected: [] };
    for (const a of annotations) {
      if (g[a.status]) g[a.status].push(a); else g.pending.push(a);
    }
    for (const k of STATUS_ORDER) g[k].sort((a, b) => a.lineNumber - b.lineNumber || a.createdAt - b.createdAt);
    return g;
  }, [annotations]);

  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    onCreateAnnotation(t);
    setDraft('');
  };

  const w = isMobile ? '100%' : 300;

  return (
    <div style={
      isMobile
        ? { width: w as any, height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }
        : {
          position: 'fixed', right: 16, top: 80, bottom: 16,
          width: w as any, background: '#fff', borderRadius: 8,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column', zIndex: 50,
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease, slideUp 0.3s ease',
        }
    }>
      {/* 标题栏 */}
      <div style={{ padding: isMobile ? '6px 16px 10px' : '14px 16px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2332' }}>审核批注</div>
          {isMobile && isOpen && (
            <button onClick={onClose}
              style={{ fontSize: 18, color: '#9ca3af', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          )}
        </div>
        <div style={{ height: 1, background: '#f3f4f6', marginTop: isMobile ? 4 : 10 }} />
      </div>

      {/* 新增批注区 */}
      <div style={{ padding: '8px 16px', marginBottom: 4, flexShrink: 0 }}>
        {selectedLine ? (
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '5px 10px', background: '#eff6ff', borderRadius: 6,
              fontSize: 11, color: '#2563eb', fontWeight: 600, marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span>📍</span><span>正在批注：第 {selectedLine.lineNumber} 行</span>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="在此输入批注内容"
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit(); }}
              style={{
                width: '100%', minHeight: 60, padding: 10,
                borderRadius: 6, border: '1px solid #d1d5db',
                fontSize: 13, lineHeight: 1.6, resize: 'none',
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>Ctrl+Enter 提交</div>
              <button
                onClick={submit}
                disabled={!draft.trim()}
                style={{
                  padding: '7px 14px', borderRadius: 6,
                  background: draft.trim() ? '#3b82f6' : '#d1d5db',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  transition: 'background 0.15s',
                  cursor: draft.trim() ? 'pointer' : 'not-allowed',
                }}
              >提交批注</button>
            </div>
          </div>
        ) : (
          <div style={{
            padding: 14, background: '#f9fafb', borderRadius: 8,
            textAlign: 'center', color: '#9ca3af', fontSize: 12,
            border: '1px dashed #e5e7eb',
          }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>💬</div>
            点击左侧任意行开始添加批注
          </div>
        )}
      </div>

      {/* 列表区 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
        {annotations.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#d1d5db', fontSize: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            暂无批注
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STATUS_ORDER.map((k) => {
              const items = grouped[k];
              if (items.length === 0) return null;
              const cfg = STATUS[k];
              const col = collapsed[k] ?? false;
              return (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    onClick={() => setCollapsed(p => ({ ...p, [k]: !col }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', padding: '4px 0', userSelect: 'none',
                    }}
                  >
                    <div style={{
                      fontSize: 10, color: '#9ca3af',
                      transform: col ? 'rotate(-90deg)' : 'none',
                      transition: 'transform 0.2s', width: 10,
                    }}>▾</div>
                    <AnimatedStatusIcon status={k} trigger={0} size={10} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                    <span style={{
                      marginLeft: 'auto', fontSize: 11, padding: '2px 8px',
                      borderRadius: 10, background: cfg.bg, color: cfg.color, fontWeight: 700,
                    }}>{items.length}</span>
                  </div>
                  {!col && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 4,
                      animation: 'fadeIn 0.2s ease',
                    }}>
                      {items.map(a => (
                        <AnnotationCard
                          key={a.id}
                          ann={a}
                          expanded={expandedAnnotationId === a.id}
                          onExpand={() => onExpandAnnotation(expandedAnnotationId === a.id ? null : a.id)}
                          onUpdate={(d) => onUpdateAnnotation(a.id, d)}
                          onDelete={() => onDeleteAnnotation(a.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
