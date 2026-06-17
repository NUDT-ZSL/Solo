export interface TypographyParams {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  backgroundColor: string;
  textColor: string;
}

export const FONT_OPTIONS: { value: string; label: string; fallback: string }[] = [
  { value: 'Inter', label: 'Inter', fallback: 'sans-serif' },
  { value: 'Playfair Display', label: 'Playfair Display', fallback: 'serif' },
  { value: 'Roboto Mono', label: 'Roboto Mono', fallback: 'monospace' },
  { value: 'Pacifico', label: 'Pacifico', fallback: 'cursive' },
  { value: 'Lora', label: 'Lora', fallback: 'serif' },
];

export function generateCSS(params: TypographyParams): string {
  const font = FONT_OPTIONS.find((f) => f.value === params.fontFamily);
  const family = font ? `'${font.value}', ${font.fallback}` : params.fontFamily;

  return `font-family: ${family};
font-weight: ${params.fontWeight};
font-size: ${params.fontSize}px;
line-height: ${params.lineHeight};
letter-spacing: ${params.letterSpacing}em;
color: ${params.textColor};
background-color: ${params.backgroundColor};`;
}

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: number | null = null;
  return (...args: Parameters<T>) => {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

export const SAMPLE_TEXT =
  '字体排印是一门关于文字排列与设计的艺术与技术。优秀的排版能够提升阅读体验，传达信息的层次与情感。通过调整字重、字号、行高与字间距，我们可以塑造出完全不同的视觉节奏——紧凑的字间距带来现代感，宽松的行高则带来呼吸感。衬线体适合长文本阅读，无衬线体更具现代气息，等宽字体常用于代码展示。选择恰当的字体组合与色彩搭配，是每个设计师必须掌握的基本功。在数字时代，网页排版更需要考虑不同设备、不同屏幕下的可读性与美感，这正是我们今天所要探索的内容。';
