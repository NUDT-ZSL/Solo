import { useMemo, useState } from 'react';
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

const diffCache = new Map<string, DiffResult>();

const computeDiff = (oldContent: string, newContent: string): DiffResult => {
  const cacheKey = `${oldContent.length}-${oldContent.slice(0, 100)}-${newContent.length}-${newContent.slice(0, 100)}`;
  if (diffCache.has(cacheKey)) {
    return diffCache.get(cacheKey)!;
  }

  const changes = diffLines(oldContent, newContent);
  const leftLines: DiffLine[] = [];
  const rightLines: DiffLine[] = [];
  let leftLineNum = 1;
  let rightLineNum = 1;
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  const pendingChanges: Change[] = [];

  const flushPending = () => {
    if (pendingChanges.length === 0) return;
    const removed = pendingChanges.filter((c) => c.removed);
    const added = pendingChanges.filter((c) => c.added);
    const unchanged = pendingChanges.filter((c) => !c.added && !c.removed);

    for (const c of unchanged) {
      const lines = c.value.split('\n').filter((_, i, arr) => i < arr.length - 1 || arr[i] !== '');
      for (const line of lines) {
        leftLines.push({ type: 'unchanged', content: line, leftLineNumber: leftLineNum, rightLineNumber: rightLineNum });
        rightLines.push({ type: 'unchanged', content: line, leftLineNumber: leftLineNum, rightLineNumber: rightLineNum });
        leftLineNum++;
        rightLineNum++;
      }
    }

    const maxLen = Math.max(removed.length, added.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < removed.length) {
        const lines = removed[i].value.split('\n').filter((_, idx, arr) => idx < arr.length - 1 || arr[idx] !== '');
        for (const line of lines) {
          const isModified = i < added.length;
          leftLines.push({
            type: isModified ? 'modified' : 'removed',
            content: line,
            leftLineNumber: leftLineNum,
            rightLineNumber: null,
          });
          rightLines.push({
            type: isModified ? 'modified' : 'removed',
            content: '',
            leftLineNumber: null,
            rightLineNumber: null,
          });
          if (isModified) modifiedCount++;
          else removedCount++;
          leftLineNum++;
        }
      }
      if (i < added.length) {
        const lines = added[i].value.split('\n').filter((_, idx, arr) => idx < arr.length - 1 || arr[idx] !== '');
        for (const line of lines) {
          const isModified = i < removed.length;
          leftLines.push({
            type: isModified ? 'modified' : 'added',
            content: '',
            leftLineNumber: null,
            rightLineNumber: null,
          });
          rightLines.push({
            type: isModified ? 'modified' : 'added',
            content: line,
            leftLineNumber: null,
            rightLineNumber: rightLineNum,
          });
          if (!isModified) addedCount++;
          rightLineNum++;
        }
      }
    }

    pendingChanges.length = 0;
  };

  for (const change of changes) {
    if (change.added || change.removed) {
      pendingChanges.push(change);
    } else {
      flushPending();
      pendingChanges.push(change);
      flushPending();
    }
  }
  flushPending();

  const result: DiffResult = { leftLines, rightLines, addedCount, removedCount, modifiedCount };
  diffCache.set(cacheKey, result);
  if (diffCache.size > 50) {
    const firstKey = diffCache.keys().next().value;
    if (firstKey) diffCache.delete(firstKey);
  }
  return result;
};

const getLineStyles = (type: DiffLine['type']): { bg: string; border: string; tagBg: string; tagColor: string; tagText: string } => {
  switch (type) {
    case 'added':
      return { bg: '#e6ffe6', border: '#22c55e', tagBg: '#dcfce7', tagColor: '#15803d', tagText: '+' };
    case 'removed':
      return { bg: '#ffe6e6', border: '#ef4444', tagBg: '#fee2e2', tagColor: '#b91c1c', tagText: '-' };
    case 'modified':
      return { bg: '#ffffcc', border: '#eab308', tagBg: '#fef9c3', tagColor: '#a16207', tagText: '~' };
    default:
      return { bg: '#ffffff', border: 'transparent', tagBg: 'transparent', tagColor: '#9ca3af', tagText: '' };
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
  const diffResult = useMemo(() => computeDiff(oldVersion.content, newVersion.content), [oldVersion.content, newVersion.content]);

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
          background: styles.bg,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          cursor: lineNumber !== null ? 'pointer' : 'default',
          position: 'relative',
          transition: 'box-shadow 0.15s ease',
          boxShadow: isSelected ? 'inset 2px 0 0 0 #3b82f6' : isHovered ? 'inset 2px 0 0 0 rgba(59,130,246,0.3)' : 'none',
        }}
      >
        {line.type !== 'unchanged' && (
          <div
            style={{
              position: 'absolute',
              left: 44,
              top: 2,
              width: 18,
              height: 18,
              borderRadius: 4,
              background: styles.tagBg,
              color: styles.tagColor,
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              opacity: line.content ? 1 : 0,
              userSelect: 'none',
            }}
          >
            {styles.tagText}
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
            background: line.type !== 'unchanged' ? styles.border + '10' : 'transparent',
            borderLeft: `3px solid ${styles.border}`,
          }}
        >
          {lineNumber || ''}
        </div>
        <div
          style={{
            flex: 1,
            paddingLeft: styles.tagText && line.content ? 28 : 12,
            paddingRight: 48,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            color: line.content ? '#1a2332' : 'transparent',
          }}
        >
          {line.content || ' '}
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
            {lineAnns.map((ann) => {
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
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.transform = 'scale(1)')}
                  >
                    {lineAnns.indexOf(ann) + 1}
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
          gap: 16,
          padding: 16,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          animation: 'fadeIn 0.3s ease',
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
            {oldVersion.version}
          </div>
          <div style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', background: '#f9fafb' }}>
            {newVersion.version}
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
