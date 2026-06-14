import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { StackFrame } from '../types';

interface CodePreviewProps {
  selectedFrame: StackFrame | null;
  sourceCode?: string;
  errorFrameId?: string;
  flashLine?: number;
}

const CodePreview: React.FC<CodePreviewProps> = ({ selectedFrame, sourceCode, errorFrameId, flashLine }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashingLineNumber, setFlashingLineNumber] = useState<number | null>(null);

  const codeData = useMemo(() => {
    let lines: string[] = [];
    let startLineNumber = 1;

    if (sourceCode) {
      lines = sourceCode.split('\n');
      startLineNumber = 1;
    } else if (selectedFrame) {
      const lineCount = 11;
      const centerLine = selectedFrame.lineNumber;
      startLineNumber = Math.max(1, centerLine - 5);

      for (let i = 0; i < lineCount; i++) {
        const currentLine = startLineNumber + i;
        if (currentLine === centerLine) {
          const funcName = selectedFrame.functionName !== '<anonymous>' ? selectedFrame.functionName : 'function';
          const indent = '  '.repeat(Math.min(i, 5));
          lines.push(`${indent}${funcName}(${selectedFrame.columnNumber > 10 ? 'args' : ''}) {`);
        } else if (currentLine < centerLine) {
          const indent = '  '.repeat(Math.max(0, 5 - (centerLine - currentLine)));
          lines.push(`${indent}// ${selectedFrame.fileName.split('/').pop()}:${currentLine}`);
        } else {
          const indent = '  '.repeat(Math.max(0, 5 - (currentLine - centerLine)));
          lines.push(`${indent}// ...`);
        }
      }
    }

    return { lines, startLineNumber };
  }, [selectedFrame, sourceCode]);

  const { lines, startLineNumber } = codeData;
  const highlightLineNumber = selectedFrame?.lineNumber || 0;
  const highlightIdx = sourceCode
    ? highlightLineNumber - startLineNumber
    : 5;

  useEffect(() => {
    if (containerRef.current && selectedFrame && highlightIdx >= 0 && highlightIdx < lines.length) {
      const targetCells = containerRef.current.querySelectorAll<HTMLElement>('.code-line-cell');
      const targetCell = targetCells[highlightIdx];
      if (targetCell) {
        requestAnimationFrame(() => {
          targetCell.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        });
      }
    }
  }, [selectedFrame, lines.length, highlightIdx]);

  useEffect(() => {
    if (flashLine !== undefined && selectedFrame && flashLine === selectedFrame.lineNumber) {
      const flashIdx = sourceCode
        ? flashLine - startLineNumber
        : 5;

      setFlashingLineNumber(flashIdx);
      setIsFlashing(true);

      const timer = setTimeout(() => {
        setIsFlashing(false);
        setFlashingLineNumber(null);
      }, 900);

      return () => clearTimeout(timer);
    }
  }, [flashLine, selectedFrame, sourceCode, startLineNumber]);

  if (!selectedFrame) {
    return (
      <div className="code-preview-panel">
        <div className="code-header">代码预览</div>
        <div className="empty-state" style={{ height: 'calc(100% - 45px)' }}>
          <div className="empty-state-icon">📄</div>
          <div className="empty-state-text">选择调用树节点查看代码</div>
        </div>
      </div>
    );
  }

  const gridItems: React.ReactNode[] = [];
  for (let idx = 0; idx < lines.length; idx++) {
    const actualLineNumber = startLineNumber + idx;
    const isHighlight = actualLineNumber === highlightLineNumber;
    const shouldFlash = isFlashing && flashingLineNumber === idx;

    gridItems.push(
      <div
        key={`num-${idx}`}
        className="code-line-number-cell"
      >
        {actualLineNumber}
      </div>
    );
    gridItems.push(
      <div
        key={`code-${idx}`}
        className={`code-line-cell ${isHighlight ? 'highlight' : ''} ${shouldFlash ? 'flash' : ''}`}
      >
        {lines[idx] || ' '}
      </div>
    );
  }

  return (
    <div className="code-preview-panel">
      <div className="code-header">
        {selectedFrame.fileName}:{selectedFrame.lineNumber}:{selectedFrame.columnNumber}
        {selectedFrame.originalLineNumber && selectedFrame.originalLineNumber !== selectedFrame.lineNumber && (
          <span style={{ marginLeft: 8, color: '#82aaff' }}>
            (原始: {selectedFrame.originalLineNumber}:{selectedFrame.originalColumnNumber})
          </span>
        )}
      </div>
      <div className="code-content" ref={containerRef}>
        {gridItems}
      </div>
    </div>
  );
};

export default CodePreview;
