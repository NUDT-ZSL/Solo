import { useMemo, useState, useRef, useEffect } from 'react';
import { diffLines, Change } from 'diff';
import { ContractVersion, Annotation, DiffLine, DiffResult } from '../services/api';

interface VersionDiffProps {
  oldVersion: ContractVersion;
  newVersion: ContractVersion;
  annotations: Annotation[];
  selectedLine: { versionId: string; lineNumber: number } | null;
  onLineSelect: (line: { versionId: string; lineNumber: number } | null) => void;
  expandedAnnotationId: string | null;
  onAnnotationExpand: (id: string | null) => void;
}

/* ===================== 双重哈希 + 双向链表 LRU 缓存 ===================== */

interface LRUNode<K, V> {
  key: K;
  value: V;
  prev: LRUNode<K, V> | null;
  next: LRUNode<K, V> | null;
}

class DoublyLinkedLRU<K, V> {
  private capacity: number;
  private map: Map<K, LRUNode<K, V>>;
  private head: LRUNode<K, V> | null = null;
  private tail: LRUNode<K, V> | null = null;
  private hits = 0;
  private misses = 0;

  constructor(capacity = 64) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get stats() {
    const total = this.hits + this.misses;
    return {
      size: this.map.size,
      capacity: this.capacity,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }

  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
  }

  private addToHead(node: LRUNode<K, V>): void {
    node.next = this.head;
    node.prev = null;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  get(key: K): V | null {
    const node = this.map.get(key);
    if (!node) {
      this.misses++;
      return null;
    }
    this.hits++;
    this.removeNode(node);
    this.addToHead(node);
    return node.value;
  }

  put(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.removeNode(existing);
      this.addToHead(existing);
      return;
    }
    if (this.map.size >= this.capacity && this.tail) {
      this.map.delete(this.tail.key);
      this.removeNode(this.tail);
    }
    const node: LRUNode<K, V> = { key, value, prev: null, next: null };
    this.map.set(key, node);
    this.addToHead(node);
  }

  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }
}

/* DJB2 Hash */
const hashDJB2 = (str: string): string => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
};

/* SDBM Hash (双重hash确保唯一性) */
const hashSDBM = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
    hash |= 0;
  }
  return hash.toString(36);
};

const makeCacheKey = (a: string, b: string): string => {
  const lenA = a.length.toString(36);
  const lenB = b.length.toString(36);
  return `${lenA}:${hashDJB2(a)}${hashSDBM(a)}:${lenB}:${hashDJB2(b)}${hashSDBM(b)}`;
};

const DIFF_CACHE = new DoublyLinkedLRU<string, DiffResult>(64);

/* ===================== Diff 计算引擎 ===================== */

const computeDiff = (oldContent: string, newContent: string): DiffResult => {
  const cacheKey = makeCacheKey(oldContent, newContent);
  const cached = DIFF_CACHE.get(cacheKey);
  if (cached) return cached;

  const changes = diffLines(oldContent, newContent, { newlineIsToken: false });
  const leftLines: DiffLine[] = [];
  const rightLines: DiffLine[] = [];
  let leftLineNum = 1;
  let rightLineNum = 1;
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  const splitNL = (value: string): string[] => {
    const parts = value.split('\n');
    if (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
    return parts;
  };

  for (let i = 0; i < changes.length; i++) {
    const c = changes[i];
    const next = changes[i + 1];

    if (!c.added && !c.removed) {
      for (const line of splitNL(c.value)) {
        leftLines.push({ type: 'unchanged', content: line, leftLineNumber: leftLineNum, rightLineNumber: rightLineNum });
        rightLines.push({ type: 'unchanged', content: line, leftLineNumber: leftLineNum, rightLineNumber: rightLineNum });
        leftLineNum++; rightLineNum++;
      }
      continue;
    }

    if (c.removed && next && next.added) {
      const rmLines = splitNL(c.value);
      const addLines = splitNL(next.value);
      const max = Math.max(rmLines.length, addLines.length);
      modifiedCount += Math.max(rmLines.length, addLines.length);
      for (let j = 0; j < max; j++) {
        if (j < rmLines.length) {
          leftLines.push({ type: 'modified', content: rmLines[j], leftLineNumber: leftLineNum, rightLineNumber: null });
          removedCount++;
          leftLineNum++;
        } else {
          leftLines.push({ type: 'modified', content: '', leftLineNumber: null, rightLineNumber: null });
        }
        if (j < addLines.length) {
          rightLines.push({ type: 'modified', content: addLines[j], leftLineNumber: null, rightLineNumber: rightLineNum });
          addedCount++;
          rightLineNum++;
        } else {
          rightLines.push({ type: 'modified', content: '', leftLineNumber: null, rightLineNumber: null });
        }
      }
      i++;
      continue;
    }

    if (c.removed) {
      for (const line of splitNL(c.value)) {
        leftLines.push({ type: 'removed', content: line, leftLineNumber: leftLineNum, rightLineNumber: null });
        rightLines.push({ type: 'removed', content: '', leftLineNumber: null, rightLineNumber: null });
        removedCount++;
        leftLineNum++;
      }
      continue;
    }

    if (c.added) {
      for (const line of splitNL(c.value)) {
        leftLines.push({ type: 'added', content: '', leftLineNumber: null, rightLineNumber: null });
        rightLines.push({ type: 'added', content: line, leftLineNumber: null, rightLineNumber: rightLineNum });
        addedCount++;
        rightLineNum++;
      }
      continue;
    }
  }

  const result: DiffResult = { leftLines, rightLines, addedCount, removedCount, modifiedCount };
  DIFF_CACHE.put(cacheKey, result);
  return result;
};

/* ===================== 行样式定义 ===================== */

interface LineStyleCfg {
  lineBg: string;        // 行背景色
  gutterBg: string;      // 行号列背景色
  leftBar: string;       // 左侧竖线颜色
  tagBg: string;         // 标签背景
  tagColor: string;      // 标签文字色
  tagText: string;       // 标签符号 + / - / ~
  tagLabel: string;      // 标签提示文字
}

const styleFor = (type: DiffLine['type'], side: 'left' | 'right', hasContent: boolean): LineStyleCfg => {
  switch (type) {
    case 'unchanged':
      return { lineBg: '#ffffff', gutterBg: '#fafafa', leftBar: 'transparent', tagBg: 'transparent', tagColor: 'transparent', tagText: '', tagLabel: '' };
    case 'added':
      return {
        lineBg: '#e6ffe6', gutterBg: 'rgba(34, 197, 94, 0.08)',
        leftBar: '#22c55e',
        tagBg: '#dcfce7', tagColor: '#15803d', tagText: '+', tagLabel: '新增',
      };
    case 'removed':
      return {
        lineBg: '#ffe6e6', gutterBg: 'rgba(239, 68, 68, 0.08)',
        leftBar: '#ef4444',
        tagBg: '#fee2e2', tagColor: '#b91c1c', tagText: '-', tagLabel: '删除',
      };
    case 'modified': {
      /* 核心修改：modified类型都带黄色竖线 */
      if (side === 'left' && hasContent) {
        return {
          lineBg: '#ffe6e6', gutterBg: 'rgba(234, 179, 8, 0.12)',
          leftBar: '#eab308',           /* 黄色竖线 */
          tagBg: '#fef3c7', tagColor: '#a16207', tagText: '~', tagLabel: '修改（删除）',
        };
      }
      if (side === 'right' && hasContent) {
        return {
          lineBg: '#e6ffe6', gutterBg: 'rgba(234, 179, 8, 0.12)',
          leftBar: '#eab308',           /* 黄色竖线 */
          tagBg: '#fef3c7', tagColor: '#a16207', tagText: '~', tagLabel: '修改（新增）',
        };
      }
      /* 修改块的占位行（padding对齐） */
      return {
        lineBg: '#ffffcc', gutterBg: 'rgba(234, 179, 8, 0.08)',
        leftBar: '#eab308',           /* 黄色竖线保持对齐 */
        tagBg: 'transparent', tagColor: 'transparent', tagText: '', tagLabel: '修改占位',
      };
    }
  }
};

/* ===================== 组件主体 ===================== */

export default function VersionDiff({
  oldVersion, newVersion, annotations, selectedLine, onLineSelect, expandedAnnotationId, onAnnotationExpand,
}: VersionDiffProps) {
  const [hoveredIdx, setHoveredIdx] = useState<{ side: 'left' | 'right'; idx: number } | null>(null);
  const startRef = useRef<number>(0);
  const [perfMs, setPerfMs] = useState<number>(0);

  startRef.current = performance.now();
  const diff = useMemo(() => {
    const s = performance.now();
    const r = computeDiff(oldVersion.content, newVersion.content);
    setPerfMs(performance.now() - s);
    return r;
    /* eslint-disable-next-line */
  }, [oldVersion.id, newVersion.id, oldVersion.content.length, newVersion.content.length]);

  const findAnns = (vid: string, ln: number | null): Annotation[] =>
    ln == null ? [] : annotations.filter(a => a.versionId === vid && a.lineNumber === ln);

  const renderLine = (line: DiffLine, idx: number, side: 'left' | 'right', vid: string) => {
    const hasContent = line.content !== '' && line.content != null;
    const cfg = styleFor(line.type, side, hasContent);
    const ln = side === 'left' ? line.leftLineNumber : line.rightLineNumber;
    const anns = findAnns(vid, ln);
    const sel = selectedLine?.versionId === vid && selectedLine?.lineNumber === ln;
    const hov = hoveredIdx?.side === side && hoveredIdx.idx === idx;

    return (
      <div
        key={`${side}-${idx}`}
        onClick={() => ln != null && onLineSelect(sel ? null : { versionId: vid, lineNumber: ln })}
        onMouseEnter={() => setHoveredIdx({ side, idx })}
        onMouseLeave={() => setHoveredIdx(null)}
        title={cfg.tagLabel || undefined}
        style={{
          display: 'flex', minHeight: 26, lineHeight: '26px',
          background: hasContent ? cfg.lineBg : cfg.lineBg,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
          cursor: ln != null ? 'pointer' : 'default',
          position: 'relative',
          transition: 'box-shadow 0.12s ease',
          boxShadow: sel
            ? 'inset 3px 0 0 0 #3b82f6'
            : hov ? 'inset 3px 0 0 0 rgba(59,130,246,0.35)' : 'none',
        }}
      >
        {/* 左侧竖线（通过 borderLeft 渲染） */}
        {/* 行号列 */}
        <div
          style={{
            width: 44, flexShrink: 0,
            textAlign: 'right', padding: '0 8px 0 0',
            color: '#9ca3af', fontSize: 12,
            userSelect: 'none',
            borderRight: '1px solid #f3f4f6',
            borderLeft: `3px solid ${cfg.leftBar}`,
            background: cfg.gutterBg,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          }}
        >
          {ln ?? ''}
        </div>

        {/* 符号标签 */}
        {cfg.tagText && hasContent && (
          <div
            style={{
              position: 'absolute',
              left: 50, top: 4, zIndex: 2,
              width: 18, height: 18, borderRadius: 4,
              background: cfg.tagBg, color: cfg.tagColor,
              fontSize: 12, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: '18px', userSelect: 'none',
              letterSpacing: 0,
            }}
          >
            {cfg.tagText}
          </div>
        )}

        {/* 文本内容 */}
        <div
          style={{
            flex: 1,
            paddingLeft: cfg.tagText && hasContent ? 28 : 12,
            paddingRight: 48,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            color: hasContent ? '#1a2332' : 'transparent',
            opacity: hasContent ? 1 : 0.25,
            overflow: 'hidden',
          }}
        >
          {hasContent ? line.content : '　'}
        </div>

        {/* 批注小圆点 */}
        {anns.length > 0 && (
          <div
            style={{
              position: 'absolute', right: 8, top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex', gap: 2, zIndex: 3,
            }}
          >
            {anns.map((ann, i) => {
              const expanded = expandedAnnotationId === ann.id;
              return (
                <div key={ann.id} style={{ position: 'relative' }}>
                  <div
                    onClick={(e) => { e.stopPropagation(); onAnnotationExpand(expanded ? null : ann.id); }}
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#3b82f6', color: '#fff',
                      fontSize: 11, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', lineHeight: '22px',
                      boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
                      transition: 'transform 0.12s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.12)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {i + 1}
                  </div>
                  {expanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute', right: 0, top: 28,
                        width: 280, background: '#fff', borderRadius: 10,
                        padding: 14, boxShadow: '0 10px 28px rgba(0,0,0,0.14)',
                        zIndex: 200,
                        animation: 'fadeIn 0.14s ease, slideUp 0.18s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                          {ann.author} · 行 {ann.lineNumber}
                        </span>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>
                          {new Date(ann.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, paddingTop: 4 }}>
                        {ann.content}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const maxN = Math.max(diff.leftLines.length, diff.rightLines.length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 摘要 */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, padding: 16,
        background: '#fff', borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        animation: 'fadeIn 0.25s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#dcfce7', borderRadius: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>新增 {diff.addedCount} 行</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fee2e2', borderRadius: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c' }}>删除 {diff.removedCount} 行</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fef9c3', borderRadius: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#a16207' }}>修改 {diff.modifiedCount} 行</span>
        </div>
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: '#9ca3af',
        }}>
          <span>⚡</span>
          <span>Diff {perfMs.toFixed(0)}ms · 缓存命中 {DIFF_CACHE.stats.hits}</span>
        </div>
      </div>

      {/* 修改行图例说明 */}
      {diff.modifiedCount > 0 && (
        <div style={{
          padding: '10px 14px', background: '#fffbeb',
          borderLeft: '3px solid #eab308',
          borderRadius: 6, fontSize: 12, color: '#92400e',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span>🔔 <b>修改行标识说明：</b></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 3, height: 14, background: '#eab308', borderRadius: 2 }} />
            <span>黄色竖线 = 修改</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ padding: '1px 6px', background: '#fef3c7', color: '#a16207', borderRadius: 3, fontSize: 11, fontWeight: 700 }}>~</span>
            <span>波浪号 = 修改内容</span>
          </span>
          <span style={{ color: '#b45309' }}>左列=删除内容（红底+黄线），右列=新增内容（绿底+黄线）</span>
        </div>
      )}

      {/* 版本元信息 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{
          padding: '12px 16px', background: '#fff', borderRadius: 10,
          border: '1px solid #fee2e2', borderTop: '3px solid #ef4444',
        }}>
          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            旧版本 · 删除侧
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2332', marginTop: 2 }}>{oldVersion.version}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {oldVersion.submitter} · {new Date(oldVersion.createdAt).toLocaleDateString('zh-CN')}
          </div>
        </div>
        <div style={{
          padding: '12px 16px', background: '#fff', borderRadius: 10,
          border: '1px solid #dcfce7', borderTop: '3px solid #22c55e',
        }}>
          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            新版本 · 新增侧
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2332', marginTop: 2 }}>{newVersion.version}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {newVersion.submitter} · {new Date(newVersion.createdAt).toLocaleDateString('zh-CN')}
          </div>
        </div>
      </div>

      {/* diff 表格 */}
      <div style={{
        background: '#fff', borderRadius: 12, overflow: 'hidden',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{
            padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#b91c1c',
            background: '#fff1f2', borderRight: '1px solid #e5e7eb',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }} />
            {oldVersion.version}
          </div>
          <div style={{
            padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#15803d',
            background: '#f0fdf4',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#22c55e' }} />
            {newVersion.version}
          </div>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          maxHeight: 'calc(100vh - 460px)', overflow: 'auto',
        }}>
          <div style={{ borderRight: '1px solid #e5e7eb' }}>
            {Array.from({ length: maxN }).map((_, i) =>
              i < diff.leftLines.length
                ? renderLine(diff.leftLines[i], i, 'left', oldVersion.id)
                : <div key={`l-e-${i}`} style={{ minHeight: 26, background: '#fafafa' }} />
            )}
          </div>
          <div>
            {Array.from({ length: maxN }).map((_, i) =>
              i < diff.rightLines.length
                ? renderLine(diff.rightLines[i], i, 'right', newVersion.id)
                : <div key={`r-e-${i}`} style={{ minHeight: 26, background: '#fafafa' }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
