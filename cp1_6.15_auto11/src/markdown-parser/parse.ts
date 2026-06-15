import { marked, Renderer } from 'marked';
import hljs from 'highlight.js';

const renderer = new Renderer();

renderer.code = function (code: string, infostring: string | undefined): string {
  const lang = infostring || '';
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  let highlighted: string;
  try {
    highlighted = hljs.highlight(code, { language }).value;
  } catch {
    highlighted = hljs.highlightAuto(code).value;
  }
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

marked.setOptions({
  breaks: true,
  gfm: true,
  renderer,
});

export interface Slide {
  id: number;
  content: string;
  hasSplit: boolean;
  rawContent: string;
}

const SPLIT_MARKER = ':split';

export function parseMarkdown(markdown: string): Slide[] {
  if (!markdown || markdown.trim() === '') {
    return [];
  }

  const slideContents = markdown.split(/^---\s*$/m);

  const slides: Slide[] = slideContents
    .map((content, index) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return null;
      }

      const hasSplit = trimmedContent.includes(SPLIT_MARKER);
      const processedContent = hasSplit
        ? trimmedContent.replace(new RegExp(SPLIT_MARKER, 'g'), '')
        : trimmedContent;

      const html = marked.parse(processedContent) as string;

      return {
        id: index,
        content: html,
        hasSplit,
        rawContent: trimmedContent,
      };
    })
    .filter((slide): slide is Slide => slide !== null);

  return slides;
}

export function parseSplitContent(markdown: string): { left: string; right: string } {
  const parts = markdown.split(SPLIT_MARKER);
  if (parts.length < 2) {
    return { left: markdown, right: '' };
  }
  return {
    left: parts[0].trim(),
    right: parts.slice(1).join(SPLIT_MARKER).trim(),
  };
}

export function renderMarkdownToHtml(markdown: string): string {
  return marked.parse(markdown) as string;
}
