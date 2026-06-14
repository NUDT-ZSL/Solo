import type { Token, TokenType, Language } from './tokenizer';

export interface ThemeConfig {
  name: string;
  gradient: string[];
  keywordColor: string;
  stringColor: string;
  commentColor: string;
  numberColor: string;
  functionColor: string;
  operatorColor: string;
  tagColor: string;
  attributeColor: string;
  selectorColor: string;
  propertyColor: string;
  valueColor: string;
  typeColor: string;
  decoratorColor: string;
  textColor: string;
  lineNumberColor: string;
}

export const themes: ThemeConfig[] = [
  {
    name: 'Cosmic Night',
    gradient: ['#0f0c29', '#302b63', '#24243e'],
    keywordColor: '#89b4fa',
    stringColor: '#a6e3a1',
    commentColor: '#6c7086',
    numberColor: '#fab387',
    functionColor: '#cba6f7',
    operatorColor: '#89dceb',
    tagColor: '#f38ba8',
    attributeColor: '#f9e2af',
    selectorColor: '#f38ba8',
    propertyColor: '#89dceb',
    valueColor: '#fab387',
    typeColor: '#f9e2af',
    decoratorColor: '#f9e2af',
    textColor: '#cdd6f4',
    lineNumberColor: '#6c7086',
  },
  {
    name: 'Sunset Drift',
    gradient: ['#1a1a2e', '#16213e', '#0f3460'],
    keywordColor: '#e94560',
    stringColor: '#a6e3a1',
    commentColor: '#585b70',
    numberColor: '#fab387',
    functionColor: '#f9e2af',
    operatorColor: '#89dceb',
    tagColor: '#e94560',
    attributeColor: '#cba6f7',
    selectorColor: '#e94560',
    propertyColor: '#89dceb',
    valueColor: '#fab387',
    typeColor: '#cba6f7',
    decoratorColor: '#f9e2af',
    textColor: '#cdd6f4',
    lineNumberColor: '#585b70',
  },
  {
    name: 'Forest Depths',
    gradient: ['#0d1b2a', '#1b2838', '#1a3a2a'],
    keywordColor: '#94e2d5',
    stringColor: '#a6e3a1',
    commentColor: '#6c7086',
    numberColor: '#fab387',
    functionColor: '#74c7ec',
    operatorColor: '#a6adc8',
    tagColor: '#f38ba8',
    attributeColor: '#f9e2af',
    selectorColor: '#f38ba8',
    propertyColor: '#94e2d5',
    valueColor: '#fab387',
    typeColor: '#f9e2af',
    decoratorColor: '#f9e2af',
    textColor: '#cdd6f4',
    lineNumberColor: '#6c7086',
  },
  {
    name: 'Ember Glow',
    gradient: ['#2d1b3d', '#3d1f2e', '#2d2d1b'],
    keywordColor: '#f38ba8',
    stringColor: '#a6e3a1',
    commentColor: '#6c7086',
    numberColor: '#fab387',
    functionColor: '#f9e2af',
    operatorColor: '#bac2de',
    tagColor: '#fab387',
    attributeColor: '#cba6f7',
    selectorColor: '#f38ba8',
    propertyColor: '#89dceb',
    valueColor: '#fab387',
    typeColor: '#cba6f7',
    decoratorColor: '#f9e2af',
    textColor: '#cdd6f4',
    lineNumberColor: '#6c7086',
  },
];

export interface RenderConfig {
  theme: ThemeConfig;
  padding: number;
  borderRadius: number;
  shadow: string;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  showLineNumbers: boolean;
  showHeader: boolean;
  language: Language;
}

const DEFAULT_CONFIG: RenderConfig = {
  theme: themes[0],
  padding: 32,
  borderRadius: 16,
  shadow: '0 8px 32px rgba(0,0,0,0.4)',
  fontSize: 14,
  lineHeight: 1.6,
  fontFamily: 'Fira Code, monospace',
  showLineNumbers: true,
  showHeader: false,
  language: 'javascript',
};

function getTokenColor(type: TokenType, theme: ThemeConfig): string {
  switch (type) {
    case 'keyword': return theme.keywordColor;
    case 'string': return theme.stringColor;
    case 'comment': return theme.commentColor;
    case 'number': return theme.numberColor;
    case 'function': return theme.functionColor;
    case 'operator': return theme.operatorColor;
    case 'tag': return theme.tagColor;
    case 'attribute': return theme.attributeColor;
    case 'selector': return theme.selectorColor;
    case 'property': return theme.propertyColor;
    case 'value': return theme.valueColor;
    case 'type': return theme.typeColor;
    case 'decorator': return theme.decoratorColor;
    default: return theme.textColor;
  }
}

function measureTextWidth(ctx: CanvasRenderingContext2D, text: string, config: RenderConfig): number {
  ctx.font = `${config.fontSize}px ${config.fontFamily}`;
  return ctx.measureText(text).width;
}

export class SnapshotRenderer {
  static render(tokenLines: Token[][], config: Partial<RenderConfig> = {}): HTMLCanvasElement {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    ctx.font = `${cfg.fontSize}px ${cfg.fontFamily}`;

    const lineNumWidth = cfg.showLineNumbers
      ? measureTextWidth(ctx, String(tokenLines.length), cfg) + 24
      : 0;

    const headerHeight = cfg.showHeader ? 40 : 0;
    const maxLineWidth = Math.max(
      ...tokenLines.map((line) =>
        line.reduce((w, t) => w + measureTextWidth(ctx, t.value, cfg), 0)
      ),
      200
    );

    const contentWidth = lineNumWidth + maxLineWidth + cfg.padding * 2;
    const contentHeight =
      tokenLines.length * cfg.fontSize * cfg.lineHeight +
      cfg.padding * 2 +
      headerHeight;

    canvas.width = (contentWidth + 16) * dpr;
    canvas.height = (contentHeight + 16) * dpr;
    canvas.style.width = `${contentWidth + 16}px`;
    canvas.style.height = `${contentHeight + 16}px`;

    ctx.scale(dpr, dpr);

    this.drawBackground(ctx, cfg, contentWidth + 16, contentHeight + 16);
    this.drawContent(ctx, tokenLines, cfg, lineNumWidth, headerHeight, contentWidth + 16, contentHeight + 16);

    return canvas;
  }

  private static drawBackground(
    ctx: CanvasRenderingContext2D,
    cfg: RenderConfig,
    width: number,
    height: number
  ): void {
    const r = cfg.borderRadius;

    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(width - r, 0);
    ctx.quadraticCurveTo(width, 0, width, r);
    ctx.lineTo(width, height - r);
    ctx.quadraticCurveTo(width, height, width - r, height);
    ctx.lineTo(r, height);
    ctx.quadraticCurveTo(0, height, 0, height - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.clip();

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    cfg.theme.gradient.forEach((color, i) => {
      gradient.addColorStop(i / (cfg.theme.gradient.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private static drawContent(
    ctx: CanvasRenderingContext2D,
    tokenLines: Token[][],
    cfg: RenderConfig,
    lineNumWidth: number,
    headerHeight: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    ctx.font = `${cfg.fontSize}px ${cfg.fontFamily}`;
    ctx.textBaseline = 'top';

    if (cfg.showHeader) {
      const langLabel = cfg.language.charAt(0).toUpperCase() + cfg.language.slice(1);
      ctx.fillStyle = cfg.theme.keywordColor;
      ctx.font = `600 ${cfg.fontSize}px ${cfg.fontFamily}`;
      ctx.fillText(`● ${langLabel}`, cfg.padding, cfg.padding);
      ctx.font = `${cfg.fontSize}px ${cfg.fontFamily}`;
    }

    const codeStartY = cfg.padding + headerHeight;
    const lineHeightPx = cfg.fontSize * cfg.lineHeight;
    const codeStartX = cfg.padding + lineNumWidth;

    tokenLines.forEach((line, lineIndex) => {
      const y = codeStartY + lineIndex * lineHeightPx;

      if (cfg.showLineNumbers) {
        const lineNum = String(lineIndex + 1);
        ctx.fillStyle = cfg.theme.lineNumberColor;
        ctx.textAlign = 'right';
        ctx.fillText(lineNum, cfg.padding + lineNumWidth - 12, y);
        ctx.textAlign = 'left';
      }

      let x = codeStartX;
      for (const token of line) {
        ctx.fillStyle = getTokenColor(token.type, cfg.theme);
        ctx.fillText(token.value, x, y);
        x += ctx.measureText(token.value).width;
      }
    });
  }

  static renderAsync(
    tokenLines: Token[][],
    config: Partial<RenderConfig> = {},
    chunkSize: number = 300
  ): Promise<HTMLCanvasElement> {
    if (tokenLines.length <= chunkSize) {
      return Promise.resolve(SnapshotRenderer.render(tokenLines, config));
    }

    return new Promise((resolve) => {
      const cfg = { ...DEFAULT_CONFIG, ...config };
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;

      ctx.font = `${cfg.fontSize}px ${cfg.fontFamily}`;

      const lineNumWidth = cfg.showLineNumbers
        ? measureTextWidth(ctx, String(tokenLines.length), cfg) + 24
        : 0;

      const headerHeight = cfg.showHeader ? 40 : 0;
      const maxLineWidth = Math.max(
        ...tokenLines.map((line) =>
          line.reduce((w, t) => w + measureTextWidth(ctx, t.value, cfg), 0)
        ),
        200
      );

      const contentWidth = lineNumWidth + maxLineWidth + cfg.padding * 2;
      const contentHeight =
        tokenLines.length * cfg.fontSize * cfg.lineHeight +
        cfg.padding * 2 +
        headerHeight;

      canvas.width = (contentWidth + 16) * dpr;
      canvas.height = (contentHeight + 16) * dpr;
      canvas.style.width = `${contentWidth + 16}px`;
      canvas.style.height = `${contentHeight + 16}px`;

      ctx.scale(dpr, dpr);

      SnapshotRenderer.drawBackground(ctx, cfg, contentWidth + 16, contentHeight + 16);

      const lineHeightPx = cfg.fontSize * cfg.lineHeight;
      const codeStartX = cfg.padding + lineNumWidth;
      const codeStartY = cfg.padding + headerHeight;

      let processed = 0;

      const renderChunk = () => {
        const end = Math.min(processed + chunkSize, tokenLines.length);

        for (let i = processed; i < end; i++) {
          const y = codeStartY + i * lineHeightPx;

          if (cfg.showLineNumbers) {
            ctx.font = `${cfg.fontSize}px ${cfg.fontFamily}`;
            ctx.fillStyle = cfg.theme.lineNumberColor;
            ctx.textAlign = 'right';
            ctx.fillText(String(i + 1), cfg.padding + lineNumWidth - 12, y);
            ctx.textAlign = 'left';
          }

          let x = codeStartX;
          for (const token of tokenLines[i]) {
            ctx.fillStyle = getTokenColor(token.type, cfg.theme);
            ctx.fillText(token.value, x, y);
            x += ctx.measureText(token.value).width;
          }
        }

        processed = end;

        if (processed < tokenLines.length) {
          setTimeout(renderChunk, 0);
        } else {
          resolve(canvas);
        }
      };

      if (cfg.showHeader) {
        const langLabel = cfg.language.charAt(0).toUpperCase() + cfg.language.slice(1);
        ctx.fillStyle = cfg.theme.keywordColor;
        ctx.font = `600 ${cfg.fontSize}px ${cfg.fontFamily}`;
        ctx.fillText(`● ${langLabel}`, cfg.padding, cfg.padding);
        ctx.font = `${cfg.fontSize}px ${cfg.fontFamily}`;
      }

      renderChunk();
    });
  }

  static canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob from canvas'));
      }, 'image/png');
    });
  }

  static downloadAsPng(canvas: HTMLCanvasElement, filename: string = 'pixelproof-screenshot.png'): void {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  static async copyToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
    try {
      const blob = await SnapshotRenderer.canvasToBlob(canvas);
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  static generateShareLink(code: string, language: Language, themeIndex: number): string {
    const payload = {
      c: btoa(encodeURIComponent(code)),
      l: language,
      t: themeIndex,
    };
    const hash = btoa(JSON.stringify(payload));
    return `${window.location.origin}${window.location.pathname}#share=${hash}`;
  }
}
