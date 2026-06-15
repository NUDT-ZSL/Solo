import { marked, Renderer, Tokens, Lexer } from 'marked';
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
  leftHtml?: string;
  rightHtml?: string;
  leftTokens?: Tokens.Generic[];
  rightTokens?: Tokens.Generic[];
}

const SPLIT_MARKER = ':split';

function splitTokensAtMarker(
  tokens: Tokens.Generic[]
): { left: Tokens.Generic[]; right: Tokens.Generic[] } | null {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'code' || token.type === 'codespan') {
      continue;
    }

    if (token.type === 'paragraph') {
      const paraToken = token as Tokens.Paragraph;
      const text = paraToken.text;

      if (text.includes(SPLIT_MARKER)) {
        const splitIndex = text.indexOf(SPLIT_MARKER);
        const beforeText = text.slice(0, splitIndex).trim();
        const afterText = text.slice(splitIndex + SPLIT_MARKER.length).trim();

        const leftTokens: Tokens.Generic[] = [];
        const rightTokens: Tokens.Generic[] = [];

        for (let j = 0; j < i; j++) {
          leftTokens.push(tokens[j]);
        }

        if (beforeText) {
          leftTokens.push({
            type: 'paragraph',
            raw: beforeText,
            text: beforeText,
            tokens: [{ type: 'text', raw: beforeText, text: beforeText }],
          } as Tokens.Paragraph);
        }

        if (afterText) {
          rightTokens.push({
            type: 'paragraph',
            raw: afterText,
            text: afterText,
            tokens: [{ type: 'text', raw: afterText, text: afterText }],
          } as Tokens.Paragraph);
        }

        for (let j = i + 1; j < tokens.length; j++) {
          rightTokens.push(tokens[j]);
        }

        return { left: leftTokens, right: rightTokens };
      }
    }

    if ('tokens' in token && Array.isArray(token.tokens) && token.tokens.length > 0) {
      const hasCodeBlock = token.tokens.some(
        (t: Tokens.Generic) => t.type === 'code' || t.type === 'codespan'
      );

      if (hasCodeBlock) {
        continue;
      }

      const childResult = splitTokensAtMarker(token.tokens as Tokens.Generic[]);
      if (childResult) {
        const leftTokens: Tokens.Generic[] = [];
        const rightTokens: Tokens.Generic[] = [];

        for (let j = 0; j < i; j++) {
          leftTokens.push(tokens[j]);
        }

        const leftToken = { ...token, tokens: childResult.left } as Tokens.Generic;
        const rightToken = { ...token, tokens: childResult.right } as Tokens.Generic;

        if (childResult.left.length > 0) {
          leftTokens.push(leftToken);
        }
        if (childResult.right.length > 0) {
          rightTokens.push(rightToken);
        }

        for (let j = i + 1; j < tokens.length; j++) {
          rightTokens.push(tokens[j]);
        }

        return { left: leftTokens, right: rightTokens };
      }
    }
  }

  return null;
}

function renderTokens(tokens: Tokens.Generic[]): string {
  const parser = new marked.Parser({
    renderer,
    breaks: true,
    gfm: true,
  });

  return parser.parse(tokens as any);
}

export function parseMarkdown(markdown: string): Slide[] {
  if (!markdown || markdown.trim() === '') {
    return [];
  }

  const slideContents = markdown.split(/^---\s*$/m);

  const slides: (Slide | null)[] = slideContents
    .map((content, index) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return null;
      }

      const lexer = new Lexer({
        breaks: true,
        gfm: true,
      });
      const tokens = lexer.lex(trimmedContent) as Tokens.Generic[];

      const splitResult = splitTokensAtMarker(tokens);

      if (splitResult) {
        const leftHtml = renderTokens(splitResult.left);
        const rightHtml = renderTokens(splitResult.right);

        const slide: Slide = {
          id: index,
          content: marked.parse(trimmedContent.replace(new RegExp(SPLIT_MARKER, 'g'), '')) as string,
          hasSplit: true,
          rawContent: trimmedContent,
          leftHtml,
          rightHtml,
          leftTokens: splitResult.left,
          rightTokens: splitResult.right,
        };
        return slide;
      }

      const slide: Slide = {
        id: index,
        content: marked.parse(trimmedContent) as string,
        hasSplit: false,
        rawContent: trimmedContent,
      };
      return slide;
    });

  return slides.filter((slide): slide is Slide => slide !== null);
}

export function parseSplitContent(markdown: string): { left: string; right: string } {
  const lexer = new Lexer({
    breaks: true,
    gfm: true,
  });
  const tokens = lexer.lex(markdown) as Tokens.Generic[];
  const splitResult = splitTokensAtMarker(tokens);

  if (!splitResult) {
    return { left: markdown, right: '' };
  }

  const leftLines: string[] = [];
  const rightLines: string[] = [];

  for (const token of splitResult.left) {
    if (token.raw) {
      leftLines.push(token.raw.trimEnd());
    }
  }
  for (const token of splitResult.right) {
    if (token.raw) {
      rightLines.push(token.raw.trimEnd());
    }
  }

  return {
    left: leftLines.join('\n').trim(),
    right: rightLines.join('\n').trim(),
  };
}

export function renderMarkdownToHtml(markdown: string): string {
  return marked.parse(markdown) as string;
}

export function getSplitHtml(
  markdown: string
): { leftHtml: string; rightHtml: string } | null {
  const lexer = new Lexer({
    breaks: true,
    gfm: true,
  });
  const tokens = lexer.lex(markdown) as Tokens.Generic[];
  const splitResult = splitTokensAtMarker(tokens);

  if (!splitResult) {
    return null;
  }

  return {
    leftHtml: renderTokens(splitResult.left),
    rightHtml: renderTokens(splitResult.right),
  };
}
