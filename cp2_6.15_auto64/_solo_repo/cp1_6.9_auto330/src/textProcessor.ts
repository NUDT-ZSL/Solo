export interface CharInfo {
  char: string;
  index: number;
  origX: number;
  origY: number;
  lineIndex: number;
  lineCharIndex: number;
}

export interface TextLayout {
  chars: CharInfo[];
  totalWidth: number;
  totalHeight: number;
  lines: string[];
  lineHeights: number[];
}

export class TextProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fontSize: number = 26;
  private lineHeightRatio: number = 1.7;
  private maxWidth: number = 500;
  private centerX: number = 0;
  private centerY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.updateDimensions();
  }

  updateDimensions(): void {
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    const isMobile = Math.min(this.canvas.width, this.canvas.height) < 500;
    this.maxWidth = isMobile ? 300 : Math.min(500, this.canvas.width * 0.7);
    this.fontSize = isMobile ? 22 : 26;
  }

  private splitIntoLines(text: string): string[] {
    const chars = Array.from(text);
    const lines: string[] = [];
    let currentLine = '';
    this.ctx.save();
    this.ctx.font = `${this.fontSize}px 'Patrick Hand SC', 'Ma Shan Zheng', cursive`;

    for (const char of chars) {
      const testLine = currentLine + char;
      const metrics = this.ctx.measureText(testLine);
      if (metrics.width > this.maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    this.ctx.restore();
    return lines;
  }

  process(text: string): TextLayout {
    const cleanText = text.trim();
    const lines = this.splitIntoLines(cleanText);
    const lineHeight = this.fontSize * this.lineHeightRatio;
    const totalHeight = lines.length * lineHeight;
    const startY = this.centerY - totalHeight / 2 + this.fontSize;

    const chars: CharInfo[] = [];
    const lineHeights: number[] = [];
    let totalMaxWidth = 0;

    this.ctx.save();
    this.ctx.font = `${this.fontSize}px 'Patrick Hand SC', 'Ma Shan Zheng', cursive`;
    this.ctx.textBaseline = 'middle';

    lines.forEach((line, lineIndex) => {
      const metrics = this.ctx.measureText(line);
      const lineWidth = metrics.width;
      totalMaxWidth = Math.max(totalMaxWidth, lineWidth);
      lineHeights.push(lineWidth);

      const lineChars = Array.from(line);
      const startX = this.centerX - lineWidth / 2;
      let cursorX = startX;

      lineChars.forEach((char, charIndex) => {
        const charMetrics = this.ctx.measureText(char);
        const charWidth = charMetrics.width;
        const charCenterX = cursorX + charWidth / 2;
        const charCenterY = startY + lineIndex * lineHeight;

        chars.push({
          char,
          index: chars.length,
          origX: charCenterX,
          origY: charCenterY,
          lineIndex,
          lineCharIndex: charIndex,
        });

        cursorX += charWidth;
      });
    });

    this.ctx.restore();

    return {
      chars,
      totalWidth: totalMaxWidth,
      totalHeight,
      lines,
      lineHeights,
    };
  }

  shuffleChars(chars: CharInfo[]): CharInfo[] {
    const shuffled = [...chars];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getOrbitRadius(isMobile: boolean, index: number, total: number): number {
    const baseRadius = isMobile ? 120 : 160;
    const variance = isMobile ? 30 : 40;
    const offset = ((index / total) * variance * 2) - variance;
    return baseRadius + offset + (Math.random() * 20 - 10);
  }

  getFontSize(): number {
    return this.fontSize;
  }

  getCenterX(): number {
    return this.centerX;
  }

  getCenterY(): number {
    return this.centerY;
  }
}
