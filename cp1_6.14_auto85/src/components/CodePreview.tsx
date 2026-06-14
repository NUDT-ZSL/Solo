import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StackFrame } from '../types';

interface CodePreviewProps {
  selectedFrame: StackFrame | null;
  sourceCode?: string;
  errorFrameId?: string;
  flashLine?: number;
}

const CodePreview: React.FC<CodePreviewProps> = ({ selectedFrame, sourceCode, errorFrameId, flashLine }) => {
  const codeLinesRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashingLineNumber, setFlashingLineNumber] = useState<number | null>(null);

  const getCodeLines = useCallback((): string[] => {
    if (sourceCode) {
      return sourceCode.split('\n');
    }

    if (!selectedFrame) return [];

    const lineCount = 11;
    const centerLine = selectedFrame.lineNumber;
    const startLine = Math.max(1, centerLine - 5);
    const lines: string[] = [];

    for (let i = 0; i < lineCount; i++) {
      const currentLine = startLine + i;
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

    return lines;
  }, [selectedFrame, sourceCode]);

  const codeLines = getCodeLines();
  const centerLineNumber = selectedFrame?.lineNumber || 0;
  const startLineNumber = sourceCode ? 1 : Math.max(1, centerLineNumber - 5);

  const handleScroll = useCallback(() => {
    if (codeLinesRef.current && lineNumbersRef.current) {
      requestAnimationFrame(() => {
        if (lineNumbersRef.current && codeLinesRef.current) {
          lineNumbersRef.current.scrollTop = codeLinesRef.current.scrollTop;
          lineNumbersRef.current.scrollLeft = codeLinesRef.current.scrollLeft;
        }
      });
    }
  }, []);

  useEffect(() => {
    if (codeLinesRef.current && selectedFrame) {
      const highlightLine = sourceCode 
        ? selectedFrame.lineNumber - startLineNumber
        : 5;

      if (highlightLine >= 0 && highlightLine < codeLines.length) {
        const lineElements = codeLinesRef.current.querySelectorAll('.code-line');
        if (lineElements[highlightLine]) {
          requestAnimationFrame(() => {
            lineElements[highlightLine]?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          });
        }
      }
    }
  }, [selectedFrame, codeLines.length, sourceCode, startLineNumber]);

  useEffect(() => {
    if (flashLine !== undefined && selectedFrame && flashLine === selectedFrame.lineNumber) {
      const highlightLine = sourceCode
        ? flashLine - startLineNumber
        : 5;

      setFlashingLineNumber(highlightLine);
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
      <div className="code-content" onScroll={handleScroll}>
        <div className="line-numbers" ref={lineNumbersRef}>
          {codeLines.map((_, idx) => (
            <span key={idx} className="line-number">
              {startLineNumber + idx}
            </span>
          ))}
        </div>
        <div className="code-lines" ref={codeLinesRef}>
          {codeLines.map((line, idx) => {
            const actualLineNumber = startLineNumber + idx;
            const isHighlight = actualLineNumber === selectedFrame.lineNumber;
            const shouldFlash = isFlashing && flashingLineNumber === idx;

            return (
              <span
                key={idx}
                className={`code-line ${isHighlight ? 'highlight' : ''} ${shouldFlash ? 'flash' : ''}`}
              >
                {line || ' '}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CodePreview;
