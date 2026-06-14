import { Highlight } from './highlight-engine';
import { Note } from './note-engine';

export interface SummaryContent {
  highlights: Highlight[];
  notes: Array<{ note: Note; highlight: Highlight }>;
  articleTitle: string;
  generatedAt: Date;
}

export interface GeneratedSummary {
  html: string;
  text: string;
  cardHtml: string;
}

export function generateSummary(
  selectedHighlights: Highlight[],
  selectedNotes: Array<{ note: Note; highlight: Highlight }>,
  articleTitle: string = '未命名文章'
): GeneratedSummary {
  const generatedAt = new Date();
  const sortedHighlights = [...selectedHighlights].sort((a, b) => a.startOffset - b.startOffset);
  const sortedNotes = [...selectedNotes].sort((a, b) => 
    a.highlight.startOffset - b.highlight.startOffset
  );

  const html = generateHtml(sortedHighlights, sortedNotes, articleTitle, generatedAt);
  const text = generatePlainText(sortedHighlights, sortedNotes, articleTitle, generatedAt);
  const cardHtml = generateCardHtml(sortedHighlights, sortedNotes, articleTitle, generatedAt);

  return { html, text, cardHtml };
}

function generateHtml(
  highlights: Highlight[],
  notes: Array<{ note: Note; highlight: Highlight }>,
  articleTitle: string,
  generatedAt: Date
): string {
  const highlightQuotes = highlights.map(h => 
    `<blockquote class="quote-block">${escapeHtml(h.text)}</blockquote>`
  ).join('');

  const noteQuotes = notes.map(({ note, highlight }) => `
    <div class="note-item">
      <blockquote class="quote-block">${escapeHtml(highlight.text)}</blockquote>
      <p class="note-content">${escapeHtml(note.content)}</p>
    </div>
  `).join('');

  return `
    <div style="font-family: serif; line-height: 1.8; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${highlightQuotes}
      ${noteQuotes}
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
        <p>来源：${escapeHtml(articleTitle)}</p>
        <p>生成时间：${formatDate(generatedAt)}</p>
      </div>
    </div>
  `;
}

function generatePlainText(
  highlights: Highlight[],
  notes: Array<{ note: Note; highlight: Highlight }>,
  articleTitle: string,
  generatedAt: Date
): string {
  const lines: string[] = [];

  highlights.forEach(h => {
    lines.push(`"${h.text}"`);
    lines.push('');
  });

  notes.forEach(({ note, highlight }) => {
    lines.push(`"${highlight.text}"`);
    lines.push(`笔记：${note.content}`);
    lines.push('');
  });

  lines.push(`---`);
  lines.push(`来源：${articleTitle}`);
  lines.push(`生成时间：${formatDate(generatedAt)}`);

  return lines.join('\n');
}

function generateCardHtml(
  highlights: Highlight[],
  notes: Array<{ note: Note; highlight: Highlight }>,
  articleTitle: string,
  generatedAt: Date
): string {
  const allContent = [...highlights.map(h => ({ text: h.text, type: 'highlight' })), 
                      ...notes.map(({ note, highlight }) => ({ 
                        text: highlight.text, 
                        note: note.content, 
                        type: 'note' as const 
                      }))];

  const quoteContent = allContent.map(item => {
    if (item.type === 'note') {
      return `
        <div class="quote-block">"${escapeHtml(item.text)}"</div>
        <p style="font-size: 13px; color: #713f12; margin: 8px 0 16px 0; padding-left: 16px;">📝 ${escapeHtml(item.note)}</p>
      `;
    }
    return `<div class="quote-block">"${escapeHtml(item.text)}"</div>`;
  }).join('');

  return `
    <div class="summary-card" style="width: 360px; border-radius: 16px; background: linear-gradient(135deg, #fef08a 0%, #fde047 100%); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12); padding: 24px;">
      ${quoteContent}
      <div class="source-info" style="font-size: 12px; color: #a16207; margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">
        <span>📖 ${escapeHtml(articleTitle)}</span>
        <span>${formatDate(generatedAt)}</span>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      } catch {
        document.body.removeChild(textarea);
        return false;
      }
    });
}

export default {
  generateSummary,
  copyToClipboard,
};
