export type TextureType = 'parchment' | 'vintage-lined' | 'blank-white';

export type FontStyle = 'handwriting' | 'typewriter' | 'elegant';

export interface LetterConfig {
  texture: TextureType;
  font: FontStyle;
  speed: number;
}

export interface LetterSegment {
  char: string;
  visible: boolean;
  delay: number;
}

const TEXTURE_STYLES: Record<TextureType, React.CSSProperties> = {
  parchment: {
    background: `linear-gradient(135deg, #f5e6c8 0%, #e8d5a3 25%, #f0deb4 50%, #e2c992 75%, #f5e6c8 100%)`,
    backgroundImage: `
      linear-gradient(135deg, #f5e6c8 0%, #e8d5a3 25%, #f0deb4 50%, #e2c992 75%, #f5e6c8 100%),
      repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(139,109,63,0.06) 28px, rgba(139,109,63,0.06) 29px)
    `,
    color: '#4a3728',
  },
  'vintage-lined': {
    background: `linear-gradient(180deg, #faf6ed 0%, #f5eed8 100%)`,
    backgroundImage: `
      linear-gradient(180deg, #faf6ed 0%, #f5eed8 100%),
      repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(139,109,63,0.15) 31px, rgba(139,109,63,0.15) 32px),
      linear-gradient(90deg, transparent 59px, rgba(139,109,63,0.1) 59px, rgba(139,109,63,0.1) 60px, transparent 60px)
    `,
    color: '#3d2b1f',
  },
  'blank-white': {
    background: `linear-gradient(180deg, #ffffff 0%, #fafafa 100%)`,
    color: '#2c2c2c',
  },
};

const FONT_MAP: Record<FontStyle, { fontFamily: string; label: string }> = {
  handwriting: { fontFamily: "'Ma Shan Zheng', cursive", label: '手写体' },
  typewriter: { fontFamily: "'ZCOOL QingKe HuangYou', monospace", label: '打字机体' },
  elegant: { fontFamily: "'Noto Serif SC', serif", label: '优雅花体' },
};

const TEXTURE_LABELS: Record<TextureType, string> = {
  parchment: '羊皮纸',
  'vintage-lined': '复古横格纸',
  'blank-white': '空白雪白纸',
};

export class LetterEngine {
  private config: LetterConfig;
  private segments: LetterSegment[] = [];
  private animationTimer: ReturnType<typeof setTimeout> | null = null;
  private currentCharIndex = 0;
  private onCharReveal: ((index: number) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private isAnimating = false;

  constructor(config?: Partial<LetterConfig>) {
    this.config = {
      texture: config?.texture ?? 'parchment',
      font: config?.font ?? 'handwriting',
      speed: config?.speed ?? 80,
    };
  }

  getTextureStyle(): React.CSSProperties {
    return TEXTURE_STYLES[this.config.texture];
  }

  getFontStyle(): React.CSSProperties {
    return { fontFamily: FONT_MAP[this.config.font].fontFamily };
  }

  getFontFamily(): string {
    return FONT_MAP[this.config.font].fontFamily;
  }

  setTexture(texture: TextureType): void {
    this.config.texture = texture;
  }

  setFont(font: FontStyle): void {
    this.config.font = font;
  }

  setSpeed(speed: number): void {
    this.config.speed = speed;
  }

  getSpeed(): number {
    return this.config.speed;
  }

  getConfig(): LetterConfig {
    return { ...this.config };
  }

  static getTextureLabel(texture: TextureType): string {
    return TEXTURE_LABELS[texture];
  }

  static getFontLabel(font: FontStyle): string {
    return FONT_MAP[font].label;
  }

  static getAllTextures(): { value: TextureType; label: string }[] {
    return (Object.entries(TEXTURE_LABELS) as [TextureType, string][]).map(
      ([value, label]) => ({ value, label })
    );
  }

  static getAllFonts(): { value: FontStyle; label: string }[] {
    return (Object.entries(FONT_MAP) as [FontStyle, { fontFamily: string; label: string }][]).map(
      ([value, { label }]) => ({ value, label })
    );
  }

  segmentText(text: string): LetterSegment[] {
    this.segments = [];
    let delay = 0;
    for (let i = 0; i < text.length; i++) {
      this.segments.push({
        char: text[i],
        visible: false,
        delay,
      });
      if (text[i] === '\n') {
        delay += this.config.speed * 3;
      } else {
        delay += this.config.speed;
      }
    }
    return [...this.segments];
  }

  startTypewriter(
    text: string,
    onCharReveal: (index: number) => void,
    onComplete: () => void
  ): void {
    this.stopTypewriter();
    this.segmentText(text);
    this.onCharReveal = onCharReveal;
    this.onComplete = onComplete;
    this.currentCharIndex = 0;
    this.isAnimating = true;
    this.revealNext();
  }

  private revealNext(): void {
    if (!this.isAnimating || this.currentCharIndex >= this.segments.length) {
      this.isAnimating = false;
      this.onComplete?.();
      return;
    }

    this.segments[this.currentCharIndex].visible = true;
    this.onCharReveal?.(this.currentCharIndex);
    this.currentCharIndex++;

    const char = this.segments[this.currentCharIndex - 1].char;
    const delay = char === '\n'
      ? this.config.speed * 3
      : char === '，' || char === '。' || char === '！' || char === '？' || char === '；' || char === '：'
        ? this.config.speed * 2
        : this.config.speed;

    this.animationTimer = setTimeout(() => this.revealNext(), delay);
  }

  stopTypewriter(): void {
    if (this.animationTimer !== null) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
    this.isAnimating = false;
  }

  revealAll(text: string): LetterSegment[] {
    this.stopTypewriter();
    this.segmentText(text);
    this.segments.forEach((s) => { s.visible = true; });
    return [...this.segments];
  }

  getSegments(): LetterSegment[] {
    return [...this.segments];
  }

  getIsAnimating(): boolean {
    return this.isAnimating;
  }

  reset(): void {
    this.stopTypewriter();
    this.segments = [];
    this.currentCharIndex = 0;
    this.onCharReveal = null;
    this.onComplete = null;
  }
}
