import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface EditorProps {
  code: string;
  onChange: (code: string) => void;
  language: string;
  readOnly?: boolean;
}

const KEYWORDS: Record<string, string[]> = {
  JavaScript: [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'class', 'import', 'export', 'default', 'new', 'this', 'async', 'await',
    'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'switch',
    'case', 'break', 'continue', 'true', 'false', 'null', 'undefined',
    'void', 'delete', 'do', 'in', 'of', 'super', 'static', 'extends',
    'with', 'yield', 'from', 'as', 'set', 'get', 'arguments', 'Promise',
    'Object', 'Array', 'String', 'Number', 'Boolean', 'Map', 'Set', 'Symbol',
    'JSON', 'parseFloat', 'parseInt', 'Math', 'Date', 'console', 'window',
    'document', 'require', 'module', 'exports'
  ],
  TypeScript: [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'class', 'import', 'export', 'default', 'new', 'this', 'async', 'await',
    'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'switch',
    'case', 'break', 'continue', 'true', 'false', 'null', 'undefined',
    'void', 'delete', 'do', 'in', 'of', 'super', 'static', 'extends',
    'with', 'yield', 'from', 'as', 'set', 'get', 'interface', 'type', 'enum',
    'implements', 'public', 'private', 'protected', 'readonly', 'is',
    'namespace', 'declare', 'abstract', 'override', 'satisfies', 'never',
    'any', 'unknown', 'object', 'keyof', 'infer', 'typeof', 'readonly',
    'Promise', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Map', 'Set',
    'Symbol', 'JSON', 'Math', 'Date', 'console', 'window', 'document'
  ],
  Python: [
    'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import',
    'from', 'as', 'try', 'except', 'finally', 'with', 'raise', 'yield',
    'lambda', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is',
    'True', 'False', 'None', 'self', 'async', 'await', 'print', 'global',
    'nonlocal', 'del', 'assert', 'exec', 'eval', 'match', 'case', 'type',
    'int', 'str', 'float', 'list', 'dict', 'set', 'tuple', 'bool', 'bytes',
    'range', 'len', 'open', 'input', 'min', 'max', 'sum', 'sorted',
    'abs', 'round', 'map', 'filter', 'zip', 'enumerate', 'iter', 'next',
    'super', 'classmethod', 'staticmethod', 'property', 'Exception',
    'ValueError', 'TypeError', 'KeyError', 'IndexError', 'RuntimeError'
  ],
  HTML: [
    'html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'li', 'ol',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'form',
    'input', 'button', 'select', 'option', 'textarea', 'script', 'style',
    'link', 'meta', 'title', 'header', 'footer', 'nav', 'section', 'article',
    'main', 'aside', 'figure', 'figcaption', 'details', 'summary', 'mark',
    'small', 'strong', 'em', 'del', 'ins', 'sub', 'sup', 'pre', 'code',
    'blockquote', 'hr', 'br', 'label', 'fieldset', 'legend', 'textarea',
    'canvas', 'svg', 'video', 'audio', 'source', 'track', 'iframe', 'base'
  ],
  CSS: [
    'color', 'background', 'background-color', 'background-image',
    'background-size', 'background-position', 'background-repeat',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-radius', 'border-color', 'border-style', 'border-width',
    'display', 'position', 'top', 'right', 'bottom', 'left',
    'flex', 'flex-direction', 'flex-wrap', 'flex-basis', 'flex-grow',
    'flex-shrink', 'justify-content', 'align-items', 'align-content',
    'grid', 'grid-template-columns', 'grid-template-rows', 'grid-gap', 'gap',
    'grid-column', 'grid-row', 'grid-area',
    'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'font', 'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'text-align', 'text-decoration',
    'text-transform', 'text-indent', 'white-space', 'word-break', 'word-wrap',
    'transform', 'transform-origin', 'translate', 'rotate', 'scale',
    'transition', 'transition-property', 'transition-duration',
    'transition-timing-function', 'transition-delay',
    'animation', 'animation-name', 'animation-duration', 'animation-delay',
    'animation-iteration-count', 'animation-direction', 'animation-timing-function',
    'animation-fill-mode', 'animation-play-state',
    'opacity', 'overflow', 'overflow-x', 'overflow-y', 'visibility',
    'z-index', 'box-shadow', 'outline', 'outline-color', 'outline-style',
    'outline-width', 'cursor', 'pointer-events', 'user-select',
    'float', 'clear', 'content', 'quotes', 'list-style', 'vertical-align',
    'important', 'none', 'auto', 'inherit', 'initial', 'revert', 'unset',
    'block', 'inline', 'inline-block', 'flex', 'grid', 'table', 'none',
    'relative', 'absolute', 'fixed', 'sticky', 'static',
    'flex-start', 'flex-end', 'center', 'space-between', 'space-around',
    'space-evenly', 'stretch', 'baseline',
    'bold', 'normal', 'italic', 'oblique', 'underline', 'overline',
    'line-through', 'uppercase', 'lowercase', 'capitalize',
    'solid', 'dashed', 'dotted', 'double', 'hidden', 'visible', 'scroll',
    'scrollbar', 'rgba', 'rgb', 'hsl', 'hsla',
    'hover', 'focus', 'active', 'visited', 'link', 'checked', 'disabled',
    'enabled', 'required', 'optional', 'before', 'after',
    'first-child', 'last-child', 'nth-child', 'not', 'placeholder',
    'selection', 'root', 'media', 'keyframes', 'supports', 'charset',
    'import', 'font-face', 'page', 'supports'
  ]
};

type TokenType =
  | 'text'
  | 'keyword'
  | 'identifier'
  | 'number'
  | 'string'
  | 'comment'
  | 'tag'
  | 'attribute'
  | 'property'
  | 'operator'
  | 'type';

interface Token {
  type: TokenType;
  value: string;
}

const COLORS: Record<TokenType, string> = {
  text: '#e2e8f0',
  keyword: '#7c3aed',
  identifier: '#e2e8f0',
  number: '#ea580c',
  string: '#059669',
  comment: '#6b7280',
  tag: '#0891b2',
  attribute: '#f59e0b',
  property: '#38bdf8',
  operator: '#f472b6',
  type: '#2563eb',
};

function tokenizeLine(line: string, language: string, inBlockComment: boolean): { tokens: Token[]; inBlockComment: boolean } {
  const tokens: Token[] = [];
  const kwSet = new Set(KEYWORDS[language] || KEYWORDS['JavaScript']);
  let i = 0;
  let remaining = line;

  if (inBlockComment) {
    const endIdx = remaining.indexOf('*/');
    if (endIdx === -1) {
      tokens.push({ type: 'comment', value: remaining });
      return { tokens, inBlockComment: true };
    } else {
      tokens.push({ type: 'comment', value: remaining.slice(0, endIdx + 2) });
      i = endIdx + 2;
      remaining = remaining.slice(i);
      inBlockComment = false;
    }
  }

  while (remaining.length > 0) {
    let matched = false;

    if (language === 'CSS') {
      const propMatch = remaining.match(/^([a-zA-Z-]+)(\s*:)/);
      if (propMatch && propMatch.index === 0 && /^[a-z-]+$/.test(propMatch[1])) {
        tokens.push({ type: 'property', value: propMatch[1] });
        tokens.push({ type: 'operator', value: propMatch[2] });
        remaining = remaining.slice(propMatch[0].length);
        matched = true;
        continue;
      }
      const selMatch = remaining.match(/^([.#][a-zA-Z_-][\w-]*)/);
      if (selMatch && selMatch.index === 0) {
        tokens.push({ type: selMatch[1][0] === '#' ? 'attribute' : 'tag', value: selMatch[1] });
        remaining = remaining.slice(selMatch[0].length);
        matched = true;
        continue;
      }
    }

    if (language === 'HTML') {
      const tagMatch = remaining.match(/^<\/?[a-zA-Z][a-zA-Z0-9-]*/);
      if (tagMatch && tagMatch.index === 0) {
        tokens.push({ type: 'tag', value: tagMatch[0] });
        remaining = remaining.slice(tagMatch[0].length);
        matched = true;
        continue;
      }
      const attrMatch = remaining.match(/^\s+([a-zA-Z-]+)=/);
      if (attrMatch && attrMatch.index === 0) {
        tokens.push({ type: 'text', value: attrMatch[0].slice(0, attrMatch[0].length - attrMatch[1].length - 1) });
        tokens.push({ type: 'attribute', value: attrMatch[1] });
        tokens.push({ type: 'operator', value: '=' });
        remaining = remaining.slice(attrMatch[0].length);
        matched = true;
        continue;
      }
      const closeTagMatch = remaining.match(/^\/?>/);
      if (closeTagMatch && closeTagMatch.index === 0) {
        tokens.push({ type: 'tag', value: closeTagMatch[0] });
        remaining = remaining.slice(closeTagMatch[0].length);
        matched = true;
        continue;
      }
    }

    if ((language === 'JavaScript' || language === 'TypeScript' || language === 'HTML') && remaining.startsWith('/*')) {
      const endIdx = remaining.indexOf('*/', 2);
      if (endIdx === -1) {
        tokens.push({ type: 'comment', value: remaining });
        remaining = '';
        inBlockComment = true;
      } else {
        tokens.push({ type: 'comment', value: remaining.slice(0, endIdx + 2) });
        remaining = remaining.slice(endIdx + 2);
      }
      matched = true;
      continue;
    }

    if ((language === 'JavaScript' || language === 'TypeScript') && remaining.startsWith('//')) {
      tokens.push({ type: 'comment', value: remaining });
      remaining = '';
      matched = true;
      continue;
    }

    if ((language === 'Python') && remaining.startsWith('#')) {
      tokens.push({ type: 'comment', value: remaining });
      remaining = '';
      matched = true;
      continue;
    }

    if ((language === 'CSS') && remaining.startsWith('/*')) {
      const endIdx = remaining.indexOf('*/', 2);
      if (endIdx === -1) {
        tokens.push({ type: 'comment', value: remaining });
        remaining = '';
        inBlockComment = true;
      } else {
        tokens.push({ type: 'comment', value: remaining.slice(0, endIdx + 2) });
        remaining = remaining.slice(endIdx + 2);
      }
      matched = true;
      continue;
    }

    const strMatch = remaining.match(/^("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)/);
    if (strMatch && strMatch.index === 0) {
      tokens.push({ type: 'string', value: strMatch[0] });
      remaining = remaining.slice(strMatch[0].length);
      matched = true;
      continue;
    }

    const numMatch = remaining.match(/^(0[xX][0-9a-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?[jJ]?)/);
    if (numMatch && numMatch.index === 0) {
      tokens.push({ type: 'number', value: numMatch[0] });
      remaining = remaining.slice(numMatch[0].length);
      matched = true;
      continue;
    }

    const idMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
    if (idMatch && idMatch.index === 0) {
      const word = idMatch[0];
      if (kwSet.has(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (/^[A-Z]/.test(word) && (language === 'TypeScript' || language === 'JavaScript')) {
        tokens.push({ type: 'type', value: word });
      } else if (language === 'Python' && kwSet.has(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else {
        tokens.push({ type: 'identifier', value: word });
      }
      remaining = remaining.slice(word.length);
      matched = true;
      continue;
    }

    const opMatch = remaining.match(/^(\+\+|--|===|!==|==|!=|<=|>=|=>|->|&&|\|\||\*\*|\/\/|<<|>>|>>>|@|@@|[+\-*/%=<>!&|^~?:.])/);
    if (opMatch && opMatch.index === 0) {
      tokens.push({ type: 'operator', value: opMatch[0] });
      remaining = remaining.slice(opMatch[0].length);
      matched = true;
      continue;
    }

    if (!matched) {
      tokens.push({ type: 'text', value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return { tokens, inBlockComment };
}

function buildHighlightedElements(code: string, language: string): React.ReactElement {
  const lines = code.split('\n');
  const lineElements: React.ReactElement[] = [];
  let inBlockComment = false;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    const { tokens, inBlockComment: nextInBlock } = tokenizeLine(line, language, inBlockComment);
    inBlockComment = nextInBlock;

    const spanElements: React.ReactNode[] = tokens.map((tok, idx) =>
      React.createElement('span', { key: idx, style: { color: COLORS[tok.type] } }, tok.value)
    );

    lineElements.push(
      React.createElement('div', {
        key: l,
        style: { height: '1.6em', whiteSpace: 'pre' },
      }, spanElements)
    );
  }

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' } }, lineElements);
}

const Editor: React.FC<EditorProps> = ({ code, onChange, language, readOnly }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const lineCount = code ? code.split('\n').length : 1;

  const highlightedOverlay = useMemo(
    () => buildHighlightedElements(code, language),
    [code, language]
  );

  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      setScrollTop(textareaRef.current.scrollTop);
    }
  }, []);

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
          marginTop: 0,
          transform: `translateY(${-scrollTop}px)`,
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          React.createElement('div', { key: i, style: { height: '1.6em' } }, i + 1)
        ))}
      </div>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            lineHeight: 1.6,
            padding: 12,
            whiteSpace: 'pre',
            color: 'transparent',
            overflow: 'auto',
            pointerEvents: 'none',
            transform: `translateY(${-scrollTop}px)`,
          }}
        >
          {highlightedOverlay}
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          readOnly={readOnly}
          spellCheck={false}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            background: 'transparent',
            color: 'transparent',
            caretColor: '#60a5fa',
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            lineHeight: 1.6,
            padding: 12,
            border: 'none',
            outline: 'none',
            resize: 'none',
            tabSize: 2,
            whiteSpace: 'pre',
            overflow: 'auto',
            zIndex: 1,
          }}
        />
      </div>
    </div>
  );
};

export default Editor;

export function HighlightedCode({ code, language }: { code: string; language: string }) {
  const lines = code.split('\n');
  const lineElements: React.ReactElement[] = [];
  let inBlockComment = false;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    const { tokens, inBlockComment: nextInBlock } = tokenizeLine(line, language, inBlockComment);
    inBlockComment = nextInBlock;

    const spanElements: React.ReactNode[] = tokens.map((tok, idx) =>
      React.createElement('span', { key: idx, style: { color: COLORS[tok.type] } }, tok.value)
    );

    lineElements.push(
      React.createElement('div', {
        key: l,
        style: { whiteSpace: 'pre' },
      }, spanElements)
    );
  }

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
          {lines.map((_, i) =>
            React.createElement('div', { key: i, style: { height: '1.6em' } }, i + 1)
          )}
        </div>
        {React.createElement('pre', {
          style: {
            margin: 0,
            padding: 12,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            lineHeight: 1.6,
            color: '#e2e8f0',
            overflow: 'visible',
            flex: 1,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }
        }, lineElements)}
      </div>
    </div>
  );
}
