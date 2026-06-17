import hljs from 'highlight.js';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import xml from 'highlight.js/lib/languages/xml';
import { Language, SyntaxToken, TokenType, HIGHLIGHT_COLORS } from '../types';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('html', xml);

const TOKEN_TYPE_MAP: Record<string, TokenType> = {
  keyword: 'keyword',
  'keyword.type': 'keyword',
  'keyword.flow': 'keyword',
  'keyword.operator': 'keyword',
  'keyword.declaration': 'keyword',
  'keyword.return': 'keyword',
  'keyword.function': 'keyword',
  'function': 'function',
  'function.call': 'function',
  'function.def': 'function',
  'title.function': 'function',
  'title.function.invoke': 'function',
  string: 'string',
  'string.quoted': 'string',
  'string.quoted.single': 'string',
  'string.quoted.double': 'string',
  'string.quoted.backtick': 'string',
  'string.template': 'string',
  comment: 'comment',
  'comment.line': 'comment',
  'comment.block': 'comment',
  'comment.documentation': 'comment',
  'meta.comment': 'comment',
};

const getTokenType = (className: string): TokenType => {
  const types = className.split(' ');
  for (const t of types) {
    if (TOKEN_TYPE_MAP[t]) return TOKEN_TYPE_MAP[t];
    const parts = t.split('.');
    for (let i = parts.length; i > 0; i--) {
      const key = parts.slice(0, i).join('.');
      if (TOKEN_TYPE_MAP[key]) return TOKEN_TYPE_MAP[key];
    }
  }
  return 'default';
};

const mapLanguage = (lang: Language): string => {
  switch (lang) {
    case 'javascript': return 'javascript';
    case 'python': return 'python';
    case 'html': return 'html';
  }
};

export const highlightCode = (code: string, language: Language): string => {
  if (!code.trim()) return '';
  try {
    const result = hljs.highlight(code, { language: mapLanguage(language) });
    return result.value;
  } catch {
    return escapeHtml(code);
  }
};

export const parseToTokens = (code: string, language: Language): SyntaxToken[][] => {
  const lines = code.split('\n');
  const result: SyntaxToken[][] = [];

  for (const line of lines) {
    if (!line) {
      result.push([]);
      continue;
    }

    try {
      const highlighted = hljs.highlight(line, { language: mapLanguage(language) });
      const tokens = parseHtmlToTokens(highlighted.value);
      result.push(tokens);
    } catch {
      result.push([{ type: 'default', value: line, color: HIGHLIGHT_COLORS.default }]);
    }
  }

  return result;
};

const parseHtmlToTokens = (html: string): SyntaxToken[] => {
  const tokens: SyntaxToken[] = [];
  const regex = /<span class="([^"]*)">([^<]*)<\/span>|([^<]+)/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    if (match[3]) {
      tokens.push({
        type: 'default',
        value: match[3],
        color: HIGHLIGHT_COLORS.default,
      });
    } else {
      const className = match[1];
      const value = match[2];
      const type = getTokenType(className);
      tokens.push({
        type,
        value,
        color: HIGHLIGHT_COLORS[type],
      });
    }
  }

  return tokens;
};

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const detectLanguage = (code: string): Language => {
  const jsKeywords = ['function', 'const', 'let', 'var', '=>', 'console\\.log', 'import', 'export', 'class'];
  const pyKeywords = ['def ', 'import ', 'print\\(', 'class ', 'if __name__', 'elif', 'except', 'lambda'];
  const htmlKeywords = ['<html', '<div', '<span', '<script', '<style', '<!DOCTYPE', '<body'];

  const codeLower = code.toLowerCase();

  for (const kw of htmlKeywords) {
    if (new RegExp(kw, 'i').test(codeLower)) return 'html';
  }
  for (const kw of jsKeywords) {
    if (new RegExp(kw, 'i').test(code)) return 'javascript';
  }
  for (const kw of pyKeywords) {
    if (new RegExp(kw, 'i').test(code)) return 'python';
  }

  return 'javascript';
};

export const generateHighlightStyles = (): string => {
  return `
    .hljs-keyword,
    .hljs-keyword-type,
    .hljs-keyword-flow,
    .hljs-keyword-operator,
    .hljs-keyword-declaration,
    .hljs-keyword-return,
    .hljs-keyword-function {
      color: ${HIGHLIGHT_COLORS.keyword};
    }
    .hljs-function,
    .hljs-function-call,
    .hljs-function-def,
    .hljs-title-function,
    .hljs-title-function-invoke {
      color: ${HIGHLIGHT_COLORS.function};
    }
    .hljs-string,
    .hljs-string-quoted,
    .hljs-string-quoted-single,
    .hljs-string-quoted-double,
    .hljs-string-quoted-backtick,
    .hljs-string-template {
      color: ${HIGHLIGHT_COLORS.string};
    }
    .hljs-comment,
    .hljs-comment-line,
    .hljs-comment-block,
    .hljs-comment-documentation,
    .hljs-meta-comment {
      color: ${HIGHLIGHT_COLORS.comment};
    }
  `;
};
