import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-markup';

interface EditorPanelProps {
  code: string;
  language: string;
  onChange: (code: string) => void;
  highlightLine: number | null;
}

const prismLanguageMap: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  html: 'markup',
};

export default function EditorPanel({ code, language, onChange, highlightLine }: EditorPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const prismLang = prismLanguageMap[language] || 'javascript';
  const grammar = Prism.languages[prismLang];

  const highlightedCode = useMemo(() => {
    if (!grammar) return code;
    return Prism.highlight(code, grammar, prismLang);
  }, [code, grammar, prismLang]);

  const lines = code.split('\n');
  const lineCount = lines.length;

  useEffect(() => {
    const ta = textareaRef.current;
    const pre = preRef.current;
    if (!ta || !pre) return;
    const handleScroll = () => {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = ta.scrollTop;
      }
      if (highlightRef.current) {
        highlightRef.current.scrollTop = ta.scrollTop;
      }
    };
    ta.addEventListener('scroll', handleScroll);
    return () => ta.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (highlightLine === null) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const lineHeight = 21;
    const targetScroll = (highlightLine - 1) * lineHeight - ta.clientHeight / 2 + lineHeight / 2;
    ta.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    if (preRef.current) {
      preRef.current.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, [highlightLine]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }, [onChange]);

  const highlightStyle: React.CSSProperties = highlightLine !== null
    ? {
        position: 'absolute',
        top: 0,
        left: 50,
        right: 0,
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1,
      }
    : { display: 'none' };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#1a1a2e',
        display: 'flex',
        fontFamily: 'var(--font-code)',
        fontSize: 14,
        lineHeight: '21px',
      }}
    >
      <div
        ref={lineNumbersRef}
        style={{
          width: 50,
          flexShrink: 0,
          background: '#151528',
          borderRight: '1px solid #2a2a4a',
          overflow: 'hidden',
          paddingTop: 10,
          paddingLeft: 8,
          textAlign: 'right',
          color: '#555',
          fontSize: 12,
          lineHeight: '21px',
          userSelect: 'none',
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i}
            style={{
              height: 21,
              background: highlightLine === i + 1 ? '#ffff0030' : 'transparent',
              transition: 'background 0.3s ease-in-out',
              paddingRight: 4,
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          position: 'relative',
          minHeight: 320,
        }}
      >
        <div ref={highlightRef} style={highlightStyle}>
          {highlightLine !== null && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 21,
                top: 10 + (highlightLine - 1) * 21,
                background: '#ffff0035',
                borderRadius: 2,
                animation: 'highlightLine 3s ease-in-out forwards',
              }}
            />
          )}
        </div>

        <pre
          ref={preRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            padding: '10px 12px',
            background: 'transparent',
            color: '#e0e0e0',
            fontFamily: 'var(--font-code)',
            fontSize: 14,
            lineHeight: '21px',
            overflow: 'auto',
            whiteSpace: 'pre',
            wordWrap: 'normal',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <code
            className={`language-${prismLang}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode + '\n' }}
          />
        </pre>

        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            padding: '10px 12px',
            background: 'transparent',
            color: 'transparent',
            caretColor: '#00a8ff',
            fontFamily: 'var(--font-code)',
            fontSize: 14,
            lineHeight: '21px',
            border: 'none',
            outline: 'none',
            resize: 'none',
            overflow: 'auto',
            whiteSpace: 'pre',
            wordWrap: 'normal',
            zIndex: 3,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}
