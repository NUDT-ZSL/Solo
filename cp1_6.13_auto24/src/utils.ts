import React from 'react';

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  const years = Math.floor(months / 12);
  return `${years}年前`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(md: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  let buffer = '';
  const pushBuffer = () => {
    if (buffer) {
      result.push(buffer);
      buffer = '';
    }
  };

  while (i < md.length) {
    const c = md[i];

    if (c === '!' && md[i + 1] === '[') {
      const altEnd = md.indexOf(']', i + 2);
      if (altEnd !== -1 && md[altEnd + 1] === '(') {
        const urlEnd = md.indexOf(')', altEnd + 2);
        if (urlEnd !== -1) {
          pushBuffer();
          const alt = md.slice(i + 2, altEnd);
          const url = md.slice(altEnd + 2, urlEnd);
          result.push(
            React.createElement('img', {
              key: key++,
              src: url,
              alt: alt,
              style: { maxWidth: '100%', borderRadius: 4 },
            })
          );
          i = urlEnd + 1;
          continue;
        }
      }
    }

    if (c === '[') {
      const altEnd = md.indexOf(']', i + 1);
      if (altEnd !== -1 && md[altEnd + 1] === '(') {
        const urlEnd = md.indexOf(')', altEnd + 2);
        if (urlEnd !== -1) {
          pushBuffer();
          const text = md.slice(i + 1, altEnd);
          const url = md.slice(altEnd + 2, urlEnd);
          result.push(
            React.createElement(
              'a',
              {
                key: key++,
                href: url,
                target: '_blank',
                rel: 'noopener noreferrer',
                style: { color: '#3b82f6', textDecoration: 'underline' },
              },
              text
            )
          );
          i = urlEnd + 1;
          continue;
        }
      }
    }

    if (c === '`') {
      const codeEnd = md.indexOf('`', i + 1);
      if (codeEnd !== -1) {
        pushBuffer();
        const code = md.slice(i + 1, codeEnd);
        result.push(
          React.createElement(
            'code',
            {
              key: key++,
              style: {
                background: '#f1f5f9',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 13,
                color: '#7c3aed',
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              },
            },
            code
          )
        );
        i = codeEnd + 1;
        continue;
      }
    }

    if (c === '*' || c === '_') {
      const marker = c;
      if (md[i + 1] === marker) {
        const strongEnd = md.indexOf(marker + marker, i + 2);
        if (strongEnd !== -1) {
          pushBuffer();
          const text = md.slice(i + 2, strongEnd);
          result.push(
            React.createElement('strong', { key: key++, style: { fontWeight: 600, color: '#1e293b' } }, text)
          );
          i = strongEnd + 2;
          continue;
        }
      } else {
        const emRegex = new RegExp(`\\${marker}([^\\${marker}]+)\\${marker}`);
        const m = md.slice(i).match(emRegex);
        if (m && m.index === 0) {
          pushBuffer();
          result.push(
            React.createElement('em', { key: key++, style: { fontStyle: 'italic' } }, m[1])
          );
          i += m[0].length;
          continue;
        }
      }
    }

    buffer += c;
    i++;
  }
  pushBuffer();
  return result;
}

export function MarkdownRenderer({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      blocks.push(React.createElement('div', { key: key++, style: { height: 8 } }));
      i++;
      continue;
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push(
        React.createElement(
          'pre',
          {
            key: key++,
            style: {
              background: '#1e293b',
              color: '#e2e8f0',
              padding: 12,
              borderRadius: 6,
              overflowX: 'auto',
              fontSize: 13,
              lineHeight: 1.5,
              margin: '8px 0',
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            },
          },
          React.createElement('code', { 'data-lang': lang }, codeLines.join('\n'))
        )
      );
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      const hashMatch = line.match(/^(#+)\s+(.*)/);
      if (hashMatch) {
        const level = hashMatch[1].length;
        const content = hashMatch[2];
        const tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
        const sizeMap: Record<string, string> = {
          h1: '22px',
          h2: '19px',
          h3: '16px',
          h4: '15px',
          h5: '14px',
          h6: '14px',
        };
        blocks.push(
          React.createElement(
            tag,
            {
              key: key++,
              style: {
                fontSize: sizeMap[tag],
                fontWeight: level <= 2 ? 700 : 600,
                margin: `${16 - level}px 0 ${6 + level}px`,
                color: '#1e293b',
              },
            },
            renderInline(content)
          )
        );
        i++;
        continue;
      }
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      const listItems = items.map((it, idx) =>
        React.createElement('li', { key: idx, style: { marginLeft: 20, listStyle: 'disc', lineHeight: 1.7, color: '#475569' } }, renderInline(it))
      );
      blocks.push(React.createElement('ul', { key: key++, style: { margin: '8px 0' } }, listItems));
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      const listItems = items.map((it, idx) =>
        React.createElement('li', { key: idx, style: { marginLeft: 20, listStyle: 'decimal', lineHeight: 1.7, color: '#475569' } }, renderInline(it))
      );
      blocks.push(React.createElement('ol', { key: key++, style: { margin: '8px 0' } }, listItems));
      continue;
    }

    if (/^>\s?/.test(line)) {
      const qlines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        qlines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        React.createElement(
          'blockquote',
          {
            key: key++,
            style: {
              borderLeft: '3px solid #3b82f6',
              paddingLeft: 12,
              color: '#64748b',
              margin: '8px 0',
              lineHeight: 1.7,
            },
          },
          renderInline(qlines.join(' '))
        )
      );
      continue;
    }

    blocks.push(
      React.createElement(
        'p',
        { key: key++, style: { lineHeight: 1.7, color: '#475569', margin: '4px 0' } },
        renderInline(line)
      )
    );
    i++;
  }

  return React.createElement('div', { style: { fontSize: 14 } }, blocks);
}
