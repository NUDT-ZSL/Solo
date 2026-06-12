import { useMemo, useState, useRef } from 'react';
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

interface LRUNode {
  key: string;
  value: DiffResult;
  prev?: LRUNode;
  next?: LRUNode;
}

class LRUCache {
  private capacity: number;
  private map: Map<string, LRUNode>;
  private head: LRUNode | undefined;
  private tail: LRUNode | undefined;

  constructor(capacity = 100) {
    this.capacity = capacity;
    this.map = new Map();
  }

  private hashContent(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash) + '-' + str.length;
  }

  makeKey(oldContent: string, newContent: string): string {
    return this.hashContent(oldContent) + ':' + this.hashContent(newContent);
  }

  get(key: string): DiffResult | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.moveToFront(node);
    return node.value;
  }

  set(key: string, value: DiffResult): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToFront(existing);
      return;
    }
    if (this.map.size >= this.capacity) {
      this.evictLRU();
    }
    const node: LRUNode = { key, value };
    this.map.set(key, node);
    this.addToFront(node);
  }

  private addToFront(node: LRUNode): void {
    node.next = this.head;
    node.prev = undefined;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private moveToFront(node: LRUNode): void {
    if (node === this.head) return;
    this.detach(node);
    this.addToFront(node);
  }

  private detach(node: LRUNode): void {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
  }

  private evictLRU(): void {
    if (!this.tail) return;
    this.map.delete(this.tail.key);
    this.detach(this.tail);
  }

  get size(): number {
    return this.map.size;
  }
}

const diffCache = new LRUCache(100);

const computeDiff = (oldContent: string, newContent: string): DiffResult => {
  const cacheKey = diffCache.makeKey(oldContent, newContent);
  const cached = diffCache.get(cacheKey);
  if (cached) return cached;

  const changes = diffLines(oldContent, newContent, { newlineIsToken: false });
  const leftLines: DiffLine[] = [];
  const rightLines: DiffLine[] = [];
  let leftLineNum = 1;
  let rightLineNum = 1;
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  const splitToLines = (value: string): string[] => {
    const split = value.split('\n');
    if (split.length > 1 && split[split.length - 1] === '') {
      split.pop();
    }
    return split;
  };

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const nextChange = changes[i + 1];

    if (!change.added && !change.removed) {
      const lines = splitToLines(change.value);
      for (const line of lines) {
        leftLines.push({ type: 'unchanged', content: line, leftLineNumber: leftLineNum, rightLineNumber: rightLineNum });
        rightLines.push({ type: 'unchanged', content: line, leftLineNumber: leftLineNum, rightLineNumber: rightLineNum });
        leftLineNum++;
        rightLineNum++;
      }
      continue;
    }

    if (change.removed && nextChange && nextChange.added) {
      const removedLines = splitToLines(change.value);
      const addedLines = splitToLines(nextChange.value);
      const maxLen = Math.max(removedLines.length, addedLines.length);

      for (let j = 0; j < maxLen; j++) {
        if (j < removedLines.length) {
          leftLines.push({
            type: 'modified',
            content: removedLines[j],
            leftLineNumber: leftLineNum,
            rightLineNumber: null,
          });
          removedCount++;
          modifiedCount++;
          leftLineNum++;
        } else {
          leftLines.push({
            type: 'modified',
            content: '',
            leftLineNumber: null,
            rightLineNumber: null,
          });
        }

        if (j < addedLines.length) {
          rightLines.push({
            type: 'modified',
            content: addedLines[j],
            leftLineNumber: null,
            rightLineNumber: rightLineNum,
          });
          addedCount++;
          rightLineNum++;
        } else {
          rightLines.push({
            type: 'modified',
            content: '',
            leftLineNumber: null,
            rightLineNumber: null,
          });
        }
      }
      i++;
      continue;
    }

    if (change.removed) {
      const lines = splitToLines(change.value);
      for (const line of lines) {
        leftLines.push({
          type: 'removed',
          content: line,
          leftLineNumber: leftLineNum,
          rightLineNumber: null,
        });
        rightLines.push({
          type: 'removed',
          content: '',
          leftLineNumber: null,
          rightLineNumber: null,
        });
        removedCount++;
        leftLineNum++;
      }
      continue;
    }

    if (change.added) {
      const lines = splitToLines(change.value);
      for (const line of lines) {
        leftLines.push({
          type: 'added',
          content: '',
          leftLineNumber: null,
          rightLineNumber: null,
        });
        rightLines.push({
          type: 'added',
          content: line,
          leftLineNumber: null,
          rightLineNumber: rightLineNum,
        });
        addedCount++;
        rightLineNum++;
      }
      continue;
    }
  }

  const result: DiffResult = { leftLines, rightLines, addedCount, removedCount, modifiedCount };
  diffCache.set(cacheKey, result);
  return result;
};

const getLineStyles = (type: DiffLine['type']): {
  bg: string; border: string; tagBg: string; tagColor: string; tagText: string;
  leftIndicator: string;
} => {
  switch (type) {
    case 'added':
      return {
        bg: '#e6ffe6', border: '#22c55e', tagBg: '#dcfce7', tagColor: '#15803d', tagText: '+',
        leftIndicator: '#22c55e',
      };
    case 'removed':
      return {
        bg: '#ffe6e6', border: '#ef4444', tagBg: '#fee2e2', tagColor: '#b91c1c', tagText: '-',
        leftIndicator: '#ef4444',
      };
    case 'modified':
      return {
        bg: '#ffffcc', border: '#eab308', tagBg: '#fef3c7', tagColor: '#a16207', tagText: '~',
        leftIndicator: '#eab308',
      };
    default:
      return {
        bg: '#ffffff', border: 'transparent', tagBg: 'transparent', tagColor: '#9ca3af', tagText: '',
        leftIndicator: 'transparent',
      };
  }
};

export default function VersionDiff({
  oldVersion,
  newVersion,
  annotations,
  selectedLine,
  onLineSelect,
  expandedAnnotationId,
  onAnnotationExpand,
}: VersionDiffProps) {
  const [hoveredLine, setHoveredLine] = useState<{ side: 'left' | 'right'; index: number } | null>(null);
  const computeStartRef = useRef<number>(0);
  const perfRef = useRef<{ computed: boolean; time: number }>({ computed: false, time: 0 });

  computeStartRef.current = performance.now();
  const diffResult = useMemo(() => {
    const start = performance.now();
    const r = computeDiff(oldVersion.content, newVersion.content);
    perfRef.current = { computed: true, time: performance.now() - start };
    return r;
  }, [oldVersion.content, newVersion.content]);

  const getLineAnnotations = (versionId: string, lineNumber: number | null): Annotation[] => {
    if (lineNumber === null) return [];
    return annotations.filter((a) => a.versionId === versionId && a.lineNumber === lineNumber);
  };

  const renderLine = (
    line: DiffLine,
    index: number,
    side: 'left' | 'right',
    versionId: string
  ) => {
    const styles = getLineStyles(line.type);
    const lineNumber = side === 'left' ? line.leftLineNumber : line.rightLineNumber;
    const lineAnns = getLineAnnotations(versionId, lineNumber);
    const isSelected = selectedLine?.versionId === versionId && selectedLine?.lineNumber === lineNumber;
    const isHovered = hoveredLine?.side === side && hoveredLine?.index === index;
    const hasContent = line.content !== '' && line.content != null;

    let actualBg = styles.bg;
    let actualTag = styles.tagText;
    let actualTagBg = styles.tagBg;
    let actualTagColor = styles.tagColor;

    if (line.type === 'modified') {
      if (side === 'left' && hasContent) {
        actualBg = '#ffe6e6';
        actualTag = '-';
        actualTagBg = '#fee2e2';
        actualTagColor = '#b91c1c';
      } else if (side === 'right' && hasContent) {
        actualBg = '#e6ffe6';
        actualTag = '+';
        actualTagBg = '#dcfce7';
        actualTagColor = '#15803d';
      } else {
        actualBg = '#ffffcc';
        actualTag = '';
      }
    }

    return (
      <div
        key={`${side}-${index}`}
        onClick={() => {
          if (lineNumber !== null) {
            onLineSelect(isSelected ? null : { versionId, lineNumber });
          }
        }}
        onMouseEnter={() => setHoveredLine({ side, index })}
        onMouseLeave={() => setHoveredLine(null)}
        style={{
          display: 'flex',
          minHeight: 26,
          lineHeight: '26px',
          background: hasContent ? actualBg : line.type === 'modified' ? '#ffffcc' : '#fafafa',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          cursor: lineNumber !== null ? 'pointer' : 'default',
          position: 'relative',
          transition: 'box-shadow 0.15s ease',
          boxShadow: isSelected ? 'inset 2px 0 0 0 #3b82f6' : isHovered ? 'inset 2px 0 0 0 rgba(59,130,246,0.3)' : 'none',
        }}
      >
        {actualTag && hasContent && (
          <div
            style={{
              position: 'absolute',
              left: 44,
              top: 4,
              width: 18,
              height: 18,
              borderRadius: 4,
              background: actualTagBg,
              color: actualTagColor,
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              userSelect: 'none',
              lineHeight: '18px',
            }}
          >
            {actualTag}
          </div>
        )}
        <div
          style={{
            width: 40,
            flexShrink: 0,
            textAlign: 'right',
            paddingRight: 8,
            color: '#9ca3af',
            fontSize: 12,
            userSelect: 'none',
            borderRight: '1px solid #f3f4f6',
            background: line.type !== 'unchanged' ? (line.type === 'modified' ? 'rgba(234, 179, 8, 0.08)' : styles.border + '15') : 'transparent',
            borderLeft: `3px solid ${line.type === 'modified' ? styles.leftIndicator : styles.leftIndicator}`,
          }}
        >
          {lineNumber || ''}
        </div>
        <div
          style={{
            flex: 1,
            paddingLeft: hasContent && actualTag ? 30 : 12,
            paddingRight: 48,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            color: hasContent ? '#1a2332' : 'transparent',
            opacity: hasContent ? 1 : 0.3,
          }}
        >
          {hasContent ? line.content : '　'}
        </div>
        {lineAnns.length > 0 && (
          <div
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: 2,
              zIndex: 2,
            }}
          >
            {lineAnns.map((ann, idx) => {
              const isExpanded = expandedAnnotationId === ann.id;
              return (
                <div key={ann.id} style={{ position: 'relative' }}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnnotationExpand(isExpanded ? null : ann.id);
                    }}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#3b82f6',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(59,130,246,0.35)',
                      transition: 'transform 0.15s ease',
                      lineHeight: '22px',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.transform = 'scale(1)')}
                  >
                    {idx + 1}
                  </div>
                  {isExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 28,
                        width: 280,
                        background: '#fff',
                        borderRadius: 10,
                        padding: 14,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        zIndex: 100,
                        animation: 'fadeIn 0.15s ease, slideUp 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                          {ann.author} · 行 {ann.lineNumber}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                          {new Date(ann.createdAt).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, padding: '8px 0' }}>
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

  const maxLines = Math.max(diffResult.leftLines.length, diffResult.rightLines.length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 差异摘要 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          padding: 16,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          animation: 'fadeIn 0.3s ease',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#dcfce7', borderRadius: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>新增 {diffResult.addedCount} 行</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#fee2e2', borderRadius: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#b91c1c' }}>删除 {diffResult.removedCount} 行</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#fef9c3', borderRadius: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#a16207' }}>修改 {diffResult.modifiedCount} 行</span>
        </div>
      </div>

      {/* 修改说明 */}
      {diffResult.modifiedCount > 0 && (
        <div
          style={{
            padding: '10px 14px',
            background: '#fffbeb',
            borderLeft: '3px solid #eab308',
            borderRadius: 6,
            fontSize: 12,
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14 }}>💡</span>
          <span>修改行：左侧显示删除内容（红色背景+黄色竖线），右侧显示新增内容（绿色背景+黄色竖线）</span>
        </div>
      )}

      {/* 版本标题 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div
          style={{
            padding: '12px 16px',
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>旧版本</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2332', marginTop: 2 }}>{oldVersion.version}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{oldVersion.submitter} · {new Date(oldVersion.createdAt).toLocaleDateString('zh-CN')}</div>
        </div>
        <div
          style={{
            padding: '12px 16px',
            background: '#fff',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>新版本</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2332', marginTop: 2 }}>{newVersion.version}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{newVersion.submitter} · {new Date(newVersion.createdAt).toLocaleDateString('zh-CN')}</div>
        </div>
      </div>

      {/* 对比内容 */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', background: '#f9fafb', borderRight: '1px solid #e5e7eb' }}>
            {oldVersion.version}（删除侧）
          </div>
          <div style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', background: '#f9fafb' }}>
            {newVersion.version}（新增侧）
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', maxHeight: 'calc(100vh - 420px)', overflow: 'auto' }}>
          <div style={{ borderRight: '1px solid #e5e7eb' }}>
            {Array.from({ length: maxLines }).map((_, i) =>
              i < diffResult.leftLines.length
                ? renderLine(diffResult.leftLines[i], i, 'left', oldVersion.id)
                : <div key={`left-empty-${i}`} style={{ minHeight: 26, background: '#fafafa' }} />
            )}
          </div>
          <div>
            {Array.from({ length: maxLines }).map((_, i) =>
              i < diffResult.rightLines.length
                ? renderLine(diffResult.rightLines[i], i, 'right', newVersion.id)
                : <div key={`right-empty-${i}`} style={{ minHeight: 26, background: '#fafafa' }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
