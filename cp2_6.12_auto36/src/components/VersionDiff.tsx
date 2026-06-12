import { useMemo, useState } from 'react';
import { diffLines } from 'diff';
import { Columns2, Rows3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VersionDiffProps {
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
}

type ViewMode = 'side-by-side' | 'unified';

export default function VersionDiff({
  oldContent,
  newContent,
  oldLabel = '历史版本',
  newLabel = '当前版本',
}: VersionDiffProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const changes = useMemo(() => diffLines(oldContent, newContent), [oldContent, newContent]);

  const renderLine = (
    content: string,
    type: 'added' | 'removed' | 'unchanged',
    lineNum: number
  ) => (
    <div
      key={`${type}-${lineNum}`}
      className={cn(
        'px-3 py-0.5 font-mono text-sm leading-[1.6] whitespace-pre-wrap border-l-2',
        type === 'added' && 'bg-diff-added border-l-green-500 text-green-800',
        type === 'removed' && 'bg-diff-deleted border-l-red-500 text-red-800',
        type === 'unchanged' && 'bg-white border-l-transparent text-text'
      )}
    >
      <span className="inline-block w-8 text-right mr-3 text-slate-400 select-none text-xs">
        {lineNum}
      </span>
      <span className="mr-1 select-none">
        {type === 'added' ? '+' : type === 'removed' ? '-' : ' '}
      </span>
      {content}
    </div>
  );

  const sideBySide = useMemo(() => {
    const leftLines: { content: string; type: 'removed' | 'unchanged'; lineNum: number }[] = [];
    const rightLines: { content: string; type: 'added' | 'unchanged'; lineNum: number }[] = [];
    let leftNum = 0;
    let rightNum = 0;

    changes.forEach((change) => {
      const lines = change.value.replace(/\n$/, '').split('\n');
      lines.forEach((line) => {
        if (change.added) {
          rightNum++;
          rightLines.push({ content: line, type: 'added', lineNum: rightNum });
        } else if (change.removed) {
          leftNum++;
          leftLines.push({ content: line, type: 'removed', lineNum: leftNum });
        } else {
          leftNum++;
          rightNum++;
          leftLines.push({ content: line, type: 'unchanged', lineNum: leftNum });
          rightLines.push({ content: line, type: 'unchanged', lineNum: rightNum });
        }
      });
    });

    return { leftLines, rightLines };
  }, [changes]);

  const unified = useMemo(() => {
    const lines: { content: string; type: 'added' | 'removed' | 'unchanged'; lineNum: number }[] = [];
    let num = 0;
    changes.forEach((change) => {
      const splitLines = change.value.replace(/\n$/, '').split('\n');
      splitLines.forEach((line) => {
        num++;
        lines.push({
          content: line,
          type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
          lineNum: num,
        });
      });
    });
    return lines;
  }, [changes]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-slate-50/50">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mr-2">
          版本对比
        </span>
        <div className="flex rounded-md border border-slate-200 overflow-hidden">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-xs transition-colors',
              viewMode === 'side-by-side'
                ? 'bg-primary text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            )}
          >
            <Columns2 className="w-3.5 h-3.5" />
            左右对比
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-xs transition-colors',
              viewMode === 'unified'
                ? 'bg-primary text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'
            )}
          >
            <Rows3 className="w-3.5 h-3.5" />
            统一视图
          </button>
        </div>
      </div>

      <div
        className={cn(
          'flex-1 overflow-auto transition-all duration-300',
          viewMode === 'side-by-side' ? 'flex' : 'block'
        )}
      >
        {viewMode === 'side-by-side' ? (
          <>
            <div className="flex-1 overflow-auto border-r border-slate-200">
              <div className="sticky top-0 px-3 py-1.5 bg-slate-100 text-xs font-medium text-slate-500 border-b border-slate-200 z-10">
                {oldLabel}
              </div>
              {sideBySide.leftLines.map((l, i) => renderLine(l.content, l.type, l.lineNum))}
            </div>
            <div className="flex-1 overflow-auto">
              <div className="sticky top-0 px-3 py-1.5 bg-slate-100 text-xs font-medium text-slate-500 border-b border-slate-200 z-10">
                {newLabel}
              </div>
              {sideBySide.rightLines.map((l, i) => renderLine(l.content, l.type, l.lineNum))}
            </div>
          </>
        ) : (
          <div>
            {unified.map((l, i) => renderLine(l.content, l.type, l.lineNum))}
          </div>
        )}
      </div>
    </div>
  );
}
