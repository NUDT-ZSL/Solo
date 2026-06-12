import React, { useState, useRef, useCallback, useEffect } from 'react';

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  language: string;
  readOnly?: boolean;
}

const KEYWORDS: Record<string, string[]> = {
  JavaScript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'new', 'this', 'async', 'await', 'try', 'catch', 'throw', 'typeof', 'instanceof', 'switch', 'case', 'break', 'continue', 'true', 'false', 'null', 'undefined'],
  TypeScript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'new', 'this', 'async', 'await', 'try', 'catch', 'throw', 'typeof', 'instanceof', 'interface', 'type', 'enum', 'extends', 'implements', 'public', 'private', 'protected', 'readonly', 'as', 'is', 'switch', 'case', 'break', 'continue', 'true', 'false', 'null', 'undefined'],
  Python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'raise', 'yield', 'lambda', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'self', 'async', 'await', 'print'],
  HTML: ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'li', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'select', 'option', 'textarea', 'script', 'style', 'link', 'meta', 'title', 'header', 'footer', 'nav', 'section', 'article', 'main'],
  CSS: ['color', 'background', 'margin', 'padding', 'border', 'display', 'position', 'flex', 'grid', 'width', 'height', 'font', 'text', 'align', 'justify', 'transform', 'transition', 'animation', 'opacity', 'overflow', 'z-index', 'box-shadow', 'border-radius', 'cursor', 'outline', 'none', 'important', 'hover', 'focus', 'active', 'before', 'after'],
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightCode(code: string, language: string): string {
  const lines = code.split('\n');
  const keywords = KEYWORDS[language] || KEYWORDS['JavaScript'];
  const kwSet = new Set(keywords);

  return lines.map((line) => {
    let result = '';
    let i = 0;
    const chars = line;

    while (i < chars.length) {
      if (chars[i] === '/' && chars[i + 1] === '/') {
        result += `<span style="color:#6b7280;font-style:italic">${escapeHtml(chars.slice(i))}</span>`;
        i = chars.length;
        continue;
      }
      if (chars[i] === '#') {
        result += `<span style="color:#6b7280;font-style:italic">${escapeHtml(chars.slice(i))}</span>`;
        i = chars.length;
        continue;
      }
      if (chars[i] === '"' || chars[i] === "'" || chars[i] === '`') {
        const quote = chars[i];
        let j = i + 1;
        while (j < chars.length && chars[j] !== quote) {
          if (chars[j] === '\\') j++;
          j++;
        }
        j = Math.min(j + 1, chars.length);
        result += `<span style="color:#059669">${escapeHtml(chars.slice(i, j))}</span>`;
        i = j;
        continue;
      }
      if (/[a-zA-Z_$]/.test(chars[i])) {
        let j = i;
        while (j < chars.length && /[a-zA-Z0-9_$]/.test(chars[j])) j++;
        const word = chars.slice(i, j);
        if (kwSet.has(word)) {
          result += `<span style="color:#7c3aed;font-weight:600">${escapeHtml(word)}</span>`;
        } else if (/^[A-Z]/.test(word)) {
          result += `<span style="color:#2563eb">${escapeHtml(word)}</span>`;
        } else {
          result += escapeHtml(word);
        }
        i = j;
        continue;
      }
      if (/[0-9]/.test(chars[i])) {
        let j = i;
        while (j < chars.length && /[0-9.xXa-fA-F]/.test(chars[j])) j++;
        result += `<span style="color:#ea580c">${escapeHtml(chars.slice(i, j))}</span>`;
        i = j;
        continue;
      }
      if (chars[i] === '<' && (language === 'HTML' || language === 'TypeScript' || language === 'JavaScript')) {
        let j = i;
        while (j < chars.length && chars[j] !== '>') j++;
        if (j < chars.length) j++;
        result += `<span style="color:#0891b2">${escapeHtml(chars.slice(i, j))}</span>`;
        i = j;
        continue;
      }
      result += escapeHtml(chars[i]);
      i++;
    }
    return result;
  }).join('\n');
}

const Editor: React.FC<EditorProps> = ({ code, onChange, language, readOnly }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const lineCount = code ? code.split('\n').length : 1;

  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      setScrollTop(textareaRef.current.scrollTop);
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
    }
  }, []);

  useEffect(() => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 300,
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      overflow: 'hidden',
      background: '#1e293b',
      display: 'flex',
    }}>
      <div
        ref={lineNumbersRef}
        style={{
          width: 48,
          background: '#1e293b',
          color: '#64748b',
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          lineHeight: 1.6,
          padding: '12px 8px 12px 12px',
          textAlign: 'right',
          userSelect: 'none',
          overflow: 'hidden',
          flexShrink: 0,
          borderRight: '1px solid #334155',
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} style={{ height: '1.6em' }}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        readOnly={readOnly}
        spellCheck={false}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent',
          color: '#e2e8f0',
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          lineHeight: 1.6,
          padding: 12,
          border: 'none',
          outline: 'none',
          resize: 'none',
          caretColor: '#60a5fa',
          tabSize: 2,
          whiteSpace: 'pre',
          overflow: 'auto',
        }}
      />
      {!readOnly && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 48,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            lineHeight: 1.6,
            padding: 12,
            whiteSpace: 'pre',
            overflow: 'hidden',
            color: 'transparent',
          }}
          dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
        />
      )}
    </div>
  );
};

export default Editor;

export function HighlightedCode({ code, language }: { code: string; language: string }) {
  const highlighted = highlightCode(code, language);
  const lines = code.split('\n');

  return (
    <div style={{
      background: '#1e293b',
      borderRadius: 8,
      overflow: 'auto',
      border: '1px solid #334155',
    }}>
      <div style={{ display: 'flex' }}>
        <div style={{
          width: 48,
          padding: '12px 8px 12px 12px',
          color: '#64748b',
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          lineHeight: 1.6,
          textAlign: 'right',
          userSelect: 'none',
          borderRight: '1px solid #334155',
          flexShrink: 0,
        }}>
          {lines.map((_, i) => (
            <div key={i} style={{ height: '1.6em' }}>{i + 1}</div>
          ))}
        </div>
        <pre style={{
          margin: 0,
          padding: 12,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          lineHeight: 1.6,
          color: '#e2e8f0',
          overflow: 'visible',
          flex: 1,
        }}>
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  );
}
