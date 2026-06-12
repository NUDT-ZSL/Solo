import { useMemo, useState } from 'react';
import { diffWords, diffLines, type Change } from 'diff';
import { Columns2, Rows3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VersionDiffProps {
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
}

type ViewMode = 'side-by-side' | 'unified';

interface WordDiff {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface LineData {
  oldLineNum: number | null;
  newLineNum: number | null;
  type: 'added' | 'removed' | 'unchanged' | 'empty';
  content: string;
  wordDiffs: WordDiff[];
}

const CONTEXT_LINES = 3;
const LARGE_CONTENT_THRESHOLD = 10000;

function splitIntoLines(text: string): string[] {
  if (!text) return [];
  return text.replace(/\n$/, '').split('\n');
}

function computeWordDiffs(oldLine: string, newLine: string, type: 'added' | 'removed' | 'unchanged'): WordDiff[] {
  if (type === 'added') {
    const diffs = diffWords('', newLine);
    return diffs.map((d) => ({ value: d.value, added: true }));
  }
  if (type === 'removed') {
    const diffs = diffWords(oldLine, '');
    return diffs.map((d) => ({ value: d.value, removed: true }));
  }
  return [{ value: newLine, added: undefined, removed: undefined }];
}

function buildLineData(
  lineChanges: Change[],
  oldLines: string[],
  newLines: string[],
  largeContent: boolean
): { lines: LineData[]; visibleIndices: Set<number> } {
  const lines: LineData[] = [];
  let oldNum = 0;
  let newNum = 0;
  const changeIndices: number[] = [];

  lineChanges.forEach((change) => {
    const changeLines = splitIntoLines(change.value);

    if (change.added) {
      changeLines.forEach((line) => {
        newNum++;
        const idx = lines.length;
        lines.push({
          oldLineNum: null,
          newLineNum: newNum,
          type: 'added',
          content: line,
          wordDiffs: computeWordDiffs('', line, 'added'),
        });
        changeIndices.push(idx);
      });
    } else if (change.removed) {
      changeLines.forEach((line) => {
        oldNum++;
        const idx = lines.length;
        lines.push({
          oldLineNum: oldNum,
          newLineNum: null,
          type: 'removed',
          content: line,
          wordDiffs: computeWordDiffs(line, '', 'removed'),
        });
        changeIndices.push(idx);
      });
    } else {
      changeLines.forEach((line, i) => {
        oldNum++;
        newNum++;
        lines.push({
          oldLineNum: oldNum,
          newLineNum: newNum,
          type: 'unchanged',
          content: line,
          wordDiffs: computeWordDiffs(line, line, 'unchanged'),
        });
      });
    }
  });

  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].type === 'removed' && lines[i + 1].type === 'added') {
      const removedLine = oldLines[(lines[i].oldLineNum ?? 1) - 1] ?? '';
      const addedLine = newLines[(lines[i + 1].newLineNum ?? 1) - 1] ?? '';
      const wordDiffs = diffWords(removedLine, addedLine);

      lines[i].wordDiffs = wordDiffs
        .filter((w) => !w.added)
        .map((w) => ({ value: w.value, removed: w.removed, added: undefined }));

      lines[i + 1].wordDiffs = wordDiffs
        .filter((w) => !w.removed)
        .map((w) => ({ value: w.value, added: w.added, removed: undefined }));
    }
  }

  const visibleIndices = new Set<number>();
  if (largeContent && changeIndices.length > 0) {
    changeIndices.forEach((ci) => {
      for (let offset = -CONTEXT_LINES; offset <= CONTEXT_LINES; offset++) {
        const idx = ci + offset;
        if (idx >= 0 && idx < lines.length) {
          visibleIndices.add(idx);
        }
      }
    });
  } else {
    for (let i = 0; i < lines.length; i++) {
      visibleIndices.add(i);
    }
  }

  return { lines, visibleIndices };
}

function buildSideBySideData(allLines: LineData[]): {
  leftLines: (LineData | null)[];
  rightLines: (LineData | null)[];
} {
  const leftLines: (LineData | null)[] = [];
  const rightLines: (LineData | null)[] = [];

  let i = 0;
  while (i < allLines.length) {
    const cur = allLines[i];
    const next = allLines[i + 1];

    if (cur.type === 'removed' && next && next.type === 'added') {
      leftLines.push(cur);
      rightLines.push(next);
      i += 2;
    } else if (cur.type === 'added') {
      leftLines.push(null);
      rightLines.push(cur);
      i++;
    } else if (cur.type === 'removed') {
      leftLines.push(cur);
      rightLines.push(null);
      i++;
    } else {
      leftLines.push(cur);
      rightLines.push(cur);
      i++;
    }
  }

  return { leftLines, rightLines };
}

function WordSpan({ diff }: { diff: WordDiff }) {
  const baseClass = 'inline whitespace-pre-wrap';
  if (diff.added) {
    return (
      <span
        className={cn(baseClass, 'bg-[#DCFCE7] text-green-800')}
      >
        {diff.value}
      </span>
    );
  }
  if (diff.removed) {
    return (
      <span
        className={cn(baseClass, 'bg-[#FEE2E2] text-red-800')}
      >
        {diff.value}
      </span>
    );
  }
  return <span className={baseClass}>{diff.value}</span>;
}

function LineContent({ line }: { line: LineData | null }) {
  if (!line) {
    return <div className="px-3 py-0.5 h-[1.6em] bg-slate-50" />;
  }

  const bgClass =
    line.type === 'added'
      ? 'bg-[#DCFCE7]/30'
      : line.type === 'removed'
      ? 'bg-[#FEE2E2]/30'
      : 'bg-transparent';

  return (
    <div className={cn('px-3 py-0.5 font-mono text-sm leading-[1.6] whitespace-pre-wrap', bgClass)}>
      {line.wordDiffs.map((wd, idx) => (
        <WordSpan key={idx} diff={wd} />
      ))}
    </div>
  );
}

function UnifiedLineContent({ line }: { line: LineData }) {
  const prefix =
    line.type === 'added' ? (
      <span className="select-none text-green-700 font-bold mr-1">+</span>
    ) : line.type === 'removed' ? (
      <span className="select-none text-red-700 font-bold mr-1">-</span>
    ) : (
      <span className="select-none text-slate-300 mr-1"> </span>
    );

  const bgClass =
    line.type === 'added'
      ? 'bg-[#DCFCE7]/30'
      : line.type === 'removed'
      ? 'bg-[#FEE2E2]/30'
      : 'bg-transparent';

  return (
    <div className={cn('px-3 py-0.5 font-mono text-sm leading-[1.6] whitespace-pre-wrap', bgClass)}>
      {prefix}
      {line.wordDiffs.map((wd, idx) => (
        <WordSpan key={idx} diff={wd} />
      ))}
    </div>
  );
}

function LineNumber({ num, align = 'right' }: { num: number | null; align?: 'left' | 'right' }) {
  return (
    <span
      className={cn(
        'inline-block w-10 px-2 py-0.5 text-xs text-slate-400 select-none bg-slate-50 border-r border-slate-200 shrink-0',
        align === 'right' ? 'text-right' : 'text-left'
      )}
    >
      {num ?? ''}
    </span>
  );
}

export default function VersionDiff({
  oldContent,
  newContent,
  oldLabel = '历史版本',
  newLabel = '当前版本',
}: VersionDiffProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [isAnimating, setIsAnimating] = useState(false);

  const { allLines, visibleIndices, sideBySide } = useMemo(() => {
    const largeContent =
      oldContent.length > LARGE_CONTENT_THRESHOLD || newContent.length > LARGE_CONTENT_THRESHOLD;
    const oldLines = splitIntoLines(oldContent);
    const newLines = splitIntoLines(newContent);
    const lineChanges = diffLines(oldContent, newContent);
    const { lines, visibleIndices } = buildLineData(lineChanges, oldLines, newLines, largeContent);
    const sideBySide = buildSideBySideData(lines);
    return { allLines: lines, visibleIndices, sideBySide };
  }, [oldContent, newContent]);

  const handleViewChange = (mode: ViewMode) => {
    if (mode === viewMode) return;
    setIsAnimating(true);
    setTimeout(() => {
      setViewMode(mode);
      setTimeout(() => setIsAnimating(false), 10);
    }, 150);
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50/50">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          版本对比
        </span>
        <div className="flex rounded-md border border-slate-200 overflow-hidden bg-white">
          <button
            onClick={() => handleViewChange('side-by-side')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-xs transition-colors',
              viewMode === 'side-by-side'
                ? 'text-[#2563EB] bg-blue-50'
                : 'text-slate-500 hover:bg-slate-50'
            )}
          >
            <Columns2
              className={cn(
                'w-3.5 h-3.5',
                viewMode === 'side-by-side' ? 'text-[#2563EB]' : 'text-slate-500'
              )}
            />
            左右对比
          </button>
          <button
            onClick={() => handleViewChange('unified')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-xs transition-colors border-l border-slate-200',
              viewMode === 'unified'
                ? 'text-[#2563EB] bg-blue-50'
                : 'text-slate-500 hover:bg-slate-50'
            )}
          >
            <Rows3
              className={cn(
                'w-3.5 h-3.5',
                viewMode === 'unified' ? 'text-[#2563EB]' : 'text-slate-500'
              )}
            />
            统一视图
          </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div
          className={cn(
            'absolute inset-0 flex transition-all duration-300 ease',
            isAnimating ? 'opacity-0' : 'opacity-100'
          )}
          style={{
            transform: isAnimating
              ? viewMode === 'side-by-side'
                ? 'translateX(20px)'
                : 'translateX(-20px)'
              : 'translateX(0)',
          }}
        >
          {viewMode === 'side-by-side' ? (
            <>
              <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
                <div className="sticky top-0 z-10 px-3 py-1.5 bg-slate-100 text-xs font-medium text-slate-500 border-b border-slate-200 shrink-0">
                  {oldLabel}
                </div>
                <div className="flex-1 overflow-auto">
                  {sideBySide.leftLines.map((line, i) => (
                    <div key={i} className="flex">
                      <LineNumber num={line?.oldLineNum ?? null} />
                      <div className="flex-1 min-w-0">
                        <LineContent line={line} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="sticky top-0 z-10 px-3 py-1.5 bg-slate-100 text-xs font-medium text-slate-500 border-b border-slate-200 shrink-0">
                  {newLabel}
                </div>
                <div className="flex-1 overflow-auto">
                  {sideBySide.rightLines.map((line, i) => (
                    <div key={i} className="flex">
                      <LineNumber num={line?.newLineNum ?? null} />
                      <div className="flex-1 min-w-0">
                        <LineContent line={line} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-auto">
              <div className="flex-1">
                {allLines.map((line, i) =>
                  visibleIndices.has(i) ? (
                    <div key={i} className="flex">
                      <LineNumber num={line.oldLineNum} />
                      <LineNumber num={line.newLineNum} />
                      <div className="flex-1 min-w-0">
                        <UnifiedLineContent line={line} />
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
