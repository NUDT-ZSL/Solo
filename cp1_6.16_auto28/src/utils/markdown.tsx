import React from 'react';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function parseInline(text: string): string {
  let html = escapeHtml(text);

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  html = html.replace(/\[(.+?)\]\((https?:\/\/[^\s]+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  return html;
}

interface ParsedLine {
  type: 'text' | 'list-item';
  content: string;
}

function parseBlock(text: string): ParsedLine[] {
  const lines = text.split('\n');
  const result: ParsedLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*]\s+/.test(trimmed)) {
      result.push({
        type: 'list-item',
        content: trimmed.replace(/^[-*]\s+/, ''),
      });
    } else {
      result.push({
        type: 'text',
        content: line,
      });
    }
  }

  return result;
}

interface MarkdownProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

export const MarkdownTitle: React.FC<MarkdownProps> = ({ text, className, style }) => {
  if (!text) {
    return null;
  }

  const html = parseInline(text);

  return (
    <span
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export const MarkdownContent: React.FC<MarkdownProps> = ({ text, className, style }) => {
  if (!text) {
    return null;
  }

  const blocks = parseBlock(text);

  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listIndex = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listIndex}`} style={{ margin: '4px 0', paddingLeft: '20px' }}>
          {listItems}
        </ul>
      );
      listItems = [];
      listIndex++;
    }
  };

  blocks.forEach((block, idx) => {
    if (block.type === 'list-item') {
      listItems.push(
        <li
          key={`li-${idx}`}
          style={{ margin: '2px 0' }}
          dangerouslySetInnerHTML={{ __html: parseInline(block.content) }}
        />
      );
    } else {
      flushList();
      if (block.content) {
        elements.push(
          <div
            key={`p-${idx}`}
            style={{ margin: '2px 0' }}
            dangerouslySetInnerHTML={{ __html: parseInline(block.content) }}
          />
        );
      } else {
        elements.push(<div key={`br-${idx}`} style={{ height: '0.5em' }} />);
      }
    }
  });

  flushList();

  return (
    <div className={className} style={style}>
      {elements}
    </div>
  );
};

export { parseInline, parseBlock };
