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

const STATUS_CONFIG: Record<StatusKey, { label: string; icon: string; color: string; bg: string; border: string }> = {
  pending: { label: '未处理', icon: '●', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
  confirmed: { label: '待确认', icon: '▲', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  approved: { label: '已通过', icon: '✓', color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
  rejected: { label: '需修改', icon: '✕', color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5' },
};

const STATUS_ORDER: StatusKey[] = ['pending', 'confirmed', 'rejected', 'approved'];

const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

interface AnimatedIconProps {
  status: StatusKey;
  triggerKey: number;
  size?: number;
}

const AnimatedStatusIcon = ({ status, triggerKey, size = 16 }: AnimatedIconProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const DURATION = 200;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    void el.offsetWidth;

    startRef.current = performance.now();
    el.style.transform = 'scale(0.8)';

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const rawT = Math.min(elapsed / DURATION, 1);
      const eased = easeOutBack(rawT);
      const scale = 0.8 + 0.2 * eased;
      if (el) {
        el.style.transform = `scale(${scale})`;
      }
      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        if (el) el.style.transform = 'scale(1.0)';
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [status, triggerKey]);

  const cfg = STATUS_CONFIG[status];

  return (
    <div
      ref={ref}
      style={{
        width: size + 8,
        height: size + 8,
        borderRadius: 6,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontSize: size - 2,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        transformOrigin: 'center center',
        willChange: 'transform',
        userSelect: 'none',
      }}
    >
      {cfg.icon}
    </div>
  );
};

interface AnnotationCardProps {
  annotation: Annotation;
  isExpanded: boolean;
  onExpand: () => void;
  onUpdate: (data: { content?: string; status?: Annotation['status'] }) => void;
  onDelete: () => void;
  versionLabel?: string;
}

const AnnotationCard = ({ annotation, isExpanded, onExpand, onUpdate, onDelete, versionLabel }: AnnotationCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(annotation.content);
  const [animTrigger, setAnimTrigger] = useState(0);

  useEffect(() => {
    setEditValue(annotation.content);
  }, [annotation.content]);

  const handleStatusChange = (status: Annotation['status']) => {
    if (status === annotation.status) return;
    onUpdate({ status });
    setAnimTrigger((p) => p + 1);
  };

  const handleSaveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== annotation.content) {
      onUpdate({ content: trimmed });
    }
    setIsEditing(false);
  };

  const cfg = STATUS_CONFIG[annotation.status];

  return (
    <div
      onClick={onExpand}
      style={{
        background: '#fff',
        borderRadius: 8,
        border: isExpanded ? '1px solid #3b82f6' : '1px solid #e5e7eb',
        boxShadow: isExpanded ? '0 4px 12px rgba(59,130,246,0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
        padding: 12,
        transition: 'all 0.18s ease',
        cursor: 'pointer',
        animation: 'fadeIn 0.2s ease, slideUp 0.25s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = isExpanded ? '0 4px 12px rgba(59,130,246,0.12)' : '0 1px 2px rgba(0,0,0,0.04)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <AnimatedStatusIcon status={annotation.status} triggerKey={animTrigger} size={14} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span>{annotation.author}</span>
              <span>·</span>
              <span>行 {annotation.lineNumber}</span>
              {versionLabel && (
                <>
                  <span>·</span>
                  <span style={{ color: '#3b82f6' }}>{versionLabel}</span>
                </>
              )}
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
              {new Date(annotation.updatedAt).toLocaleString('zh-CN', { hour12: false })}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#d1d5db', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ▾
        </div>
      </div>

      {isEditing ? (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 10 }}>
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="在此输入批注内容"
            autoFocus
            style={{
              width: '100%',
              minHeight: 72,
              padding: 10,
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 13,
              lineHeight: 1.6,
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
            <button
              onClick={() => setIsEditing(false)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                color: '#6b7280',
                background: '#f3f4f6',
                borderRadius: 6,
                fontWeight: 500,
              }}
            >
              取消
            </button>
            <button
              onClick={handleSaveEdit}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                color: '#fff',
                background: '#3b82f6',
                borderRadius: 6,
                fontWeight: 500,
              }}
            >
              保存
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: '#374151',
            lineHeight: 1.6,
            maxHeight: isExpanded ? 'none' : 48,
            overflow: isExpanded ? 'visible' : 'hidden',
            WebkitLineClamp: isExpanded ? 'none' : 2,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
          }}
        >
          {annotation.content}
        </div>
      )}

      {isExpanded && !isEditing && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
          <div style={{ marginBottom: 10, fontSize: 11, color: '#6b7280', fontWeight: 500 }}>切换状态</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {STATUS_ORDER.map((s) => {
              const sc = STATUS_CONFIG[s];
              const active = annotation.status === s;
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 4px',
                    borderRadius: 6,
                    border: active ? `1px solid ${sc.border}` : '1px solid transparent',
                    background: active ? sc.bg : '#fafafa',
                    transition: 'all 0.15s ease',
                    fontSize: 10,
                    color: sc.color,
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = sc.bg;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = active ? sc.bg : '#fafafa';
                  }}
                >
                  <AnimatedStatusIcon status={s} triggerKey={active ? animTrigger : 0} size={12} />
                  <span>{sc.label}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                color: '#3b82f6',
                background: '#eff6ff',
                borderRadius: 6,
                fontWeight: 500,
              }}
            >
              编辑
            </button>
            <button
              onClick={() => {
                if (confirm('确认删除此批注？')) onDelete();
              }}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                color: '#dc2626',
                background: '#fef2f2',
                borderRadius: 6,
                fontWeight: 500,
              }}
            >
              删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function ReviewPanel({
  annotations,
  selectedLine,
  expandedAnnotationId,
  onCreateAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onExpandAnnotation,
  isMobile,
  isOpen,
  onClose,
}: ReviewPanelProps) {
  const [newContent, setNewContent] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const result: Record<StatusKey, Annotation[]> = {
      pending: [],
      confirmed: [],
      approved: [],
      rejected: [],
    };
    for (const a of annotations) {
      if (result[a.status]) result[a.status].push(a);
      else result.pending.push(a);
    }
    for (const k of STATUS_ORDER) {
      result[k].sort((a, b) => a.lineNumber - b.lineNumber || a.createdAt - b.createdAt);
    }
    return result;
  }, [annotations]);

  const handleSubmit = () => {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    onCreateAnnotation(trimmed);
    setNewContent('');
  };

  const panelWidth = isMobile ? '100%' : 300;

  return (
    <div
      style={
        isMobile
          ? {
              width: panelWidth as any,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: '#fff',
            }
          : {
              position: 'fixed',
              right: 16,
              top: 80,
              bottom: 16,
              width: panelWidth as any,
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 50,
              overflow: 'hidden',
              animation: 'fadeIn 0.25s ease, slideUp 0.3s ease',
            }
      }
    >
      <div style={{ padding: isMobile ? '8px 16px 12px' : '16px 16px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2332' }}>审核批注</div>
          {isMobile && isOpen && (
            <button
              onClick={onClose}
              style={{ fontSize: 18, color: '#9ca3af', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          )}
        </div>
        <div style={{ height: 1, background: '#f3f4f6' }} />
      </div>

      <div style={{ padding: '0 16px', marginBottom: 12, flexShrink: 0 }}>
        {selectedLine ? (
          <div onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: '6px 10px',
                background: '#eff6ff',
                borderRadius: 6,
                fontSize: 11,
                color: '#2563eb',
                fontWeight: 500,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>📍</span>
              <span>正在批注：第 {selectedLine.lineNumber} 行</span>
            </div>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="在此输入批注内容"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit();
              }}
              style={{
                width: '100%',
                minHeight: 64,
                padding: 10,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 13,
                lineHeight: 1.6,
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>Ctrl+Enter 提交</div>
              <button
                onClick={handleSubmit}
                disabled={!newContent.trim()}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  background: newContent.trim() ? '#3b82f6' : '#d1d5db',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 500,
                  transition: 'background 0.15s ease',
                  cursor: newContent.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                提交批注
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: 14,
              background: '#f9fafb',
              borderRadius: 8,
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: 12,
              border: '1px dashed #e5e7eb',
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>💬</div>
            点击左侧任意行开始添加批注
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px 16px' }}>
        {annotations.length === 0 ? (
          <div
            style={{
              padding: 30,
              textAlign: 'center',
              color: '#d1d5db',
              fontSize: 12,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            暂无批注
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STATUS_ORDER.map((statusKey) => {
              const items = grouped[statusKey];
              if (items.length === 0) return null;
              const sc = STATUS_CONFIG[statusKey];
              const isCollapsed = collapsed[statusKey] ?? false;
              return (
                <div key={statusKey} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div
                    onClick={() => setCollapsed((prev) => ({ ...prev, [statusKey]: !isCollapsed }))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      padding: '4px 0',
                      userSelect: 'none',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: '#9ca3af',
                        transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                        transition: 'transform 0.2s',
                        width: 10,
                      }}
                    >
                      ▾
                    </div>
                    <AnimatedStatusIcon status={statusKey} triggerKey={0} size={12} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: sc.color }}>{sc.label}</span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: sc.bg,
                        color: sc.color,
                        fontWeight: 600,
                      }}
                    >
                      {items.length}
                    </span>
                  </div>
                  {!isCollapsed && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        paddingLeft: 4,
                        animation: 'fadeIn 0.2s ease',
                      }}
                    >
                      {items.map((a) => (
                        <AnnotationCard
                          key={a.id}
                          annotation={a}
                          isExpanded={expandedAnnotationId === a.id}
                          onExpand={() => onExpandAnnotation(expandedAnnotationId === a.id ? null : a.id)}
                          onUpdate={(data) => onUpdateAnnotation(a.id, data)}
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
