export interface ColorSwatch {
  name: string;
  value: string;
  type: 'primary' | 'secondary' | 'neutral';
}

export interface FontPair {
  heading: string;
  body: string;
  fallback: string;
}

export interface TypographyLevel {
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
}

export interface DesignSpec {
  id: string;
  type: 'colors' | 'fonts' | 'typography';
  colors?: ColorSwatch[];
  fonts?: FontPair;
  typography?: TypographyLevel[];
  title: string;
}

export interface StylePreset {
  id: string;
  label: string;
  colorPalettes: ColorSwatch[][];
  fontPairs: FontPair[];
}

const stylePresets: StylePreset[] = [
  {
    id: 'classic',
    label: '古典',
    colorPalettes: [
      [
        { name: '主色', value: '#8B4513', type: 'primary' },
        { name: '辅色', value: '#D4AF37', type: 'secondary' },
        { name: '浅灰', value: '#F5F5DC', type: 'neutral' },
        { name: '中灰', value: '#8B7355', type: 'neutral' },
        { name: '深灰', value: '#3D2914', type: 'neutral' },
      ],
      [
        { name: '主色', value: '#654321', type: 'primary' },
        { name: '辅色', value: '#CD853F', type: 'secondary' },
        { name: '浅灰', value: '#FAF0E6', type: 'neutral' },
        { name: '中灰', value: '#A0522D', type: 'neutral' },
        { name: '深灰', value: '#3E2723', type: 'neutral' },
      ],
    ],
    fontPairs: [
      { heading: 'Georgia', body: 'Times New Roman', fallback: 'serif' },
      { heading: 'Playfair Display', body: 'Crimson Text', fallback: 'serif' },
    ],
  },
  {
    id: 'modern',
    label: '现代',
    colorPalettes: [
      [
        { name: '主色', value: '#4361EE', type: 'primary' },
        { name: '辅色', value: '#F72585', type: 'secondary' },
        { name: '浅灰', value: '#F8F9FA', type: 'neutral' },
        { name: '中灰', value: '#6C757D', type: 'neutral' },
        { name: '深灰', value: '#212529', type: 'neutral' },
      ],
      [
        { name: '主色', value: '#06D6A0', type: 'primary' },
        { name: '辅色', value: '#EF476F', type: 'secondary' },
        { name: '浅灰', value: '#F1FAEE', type: 'neutral' },
        { name: '中灰', value: '#457B9D', type: 'neutral' },
        { name: '深灰', value: '#1D3557', type: 'neutral' },
      ],
    ],
    fontPairs: [
      { heading: 'Inter', body: 'Inter', fallback: 'sans-serif' },
      { heading: 'Poppins', body: 'Roboto', fallback: 'sans-serif' },
    ],
  },
  {
    id: 'minimal',
    label: '极简',
    colorPalettes: [
      [
        { name: '主色', value: '#000000', type: 'primary' },
        { name: '辅色', value: '#FFFFFF', type: 'secondary' },
        { name: '浅灰', value: '#FAFAFA', type: 'neutral' },
        { name: '中灰', value: '#9CA3AF', type: 'neutral' },
        { name: '深灰', value: '#374151', type: 'neutral' },
      ],
      [
        { name: '主色', value: '#1F2937', type: 'primary' },
        { name: '辅色', value: '#E5E7EB', type: 'secondary' },
        { name: '浅灰', value: '#F9FAFB', type: 'neutral' },
        { name: '中灰', value: '#9CA3AF', type: 'neutral' },
        { name: '深灰', value: '#111827', type: 'neutral' },
      ],
    ],
    fontPairs: [
      { heading: 'Helvetica Neue', body: 'Helvetica Neue', fallback: 'sans-serif' },
      { heading: 'SF Pro Display', body: 'SF Pro Text', fallback: 'sans-serif' },
    ],
  },
  {
    id: 'gothic',
    label: '哥特',
    colorPalettes: [
      [
        { name: '主色', value: '#1A1A2E', type: 'primary' },
        { name: '辅色', value: '#E94560', type: 'secondary' },
        { name: '浅灰', value: '#EAEAEA', type: 'neutral' },
        { name: '中灰', value: '#533483', type: 'neutral' },
        { name: '深灰', value: '#0F0F23', type: 'neutral' },
      ],
      [
        { name: '主色', value: '#2C003E', type: 'primary' },
        { name: '辅色', value: '#C3073F', type: 'secondary' },
        { name: '浅灰', value: '#D4D4D4', type: 'neutral' },
        { name: '中灰', value: '#6F2232', type: 'neutral' },
        { name: '深灰', value: '#1A1A1D', type: 'neutral' },
      ],
    ],
    fontPairs: [
      { heading: 'Cinzel', body: 'Cormorant Garamond', fallback: 'serif' },
      { heading: 'UnifrakturMaguntia', body: 'EB Garamond', fallback: 'serif' },
    ],
  },
  {
    id: 'nature',
    label: '自然',
    colorPalettes: [
      [
        { name: '主色', value: '#2D6A4F', type: 'primary' },
        { name: '辅色', value: '#DDA15E', type: 'secondary' },
        { name: '浅灰', value: '#FEFAE0', type: 'neutral' },
        { name: '中灰', value: '#606C38', type: 'neutral' },
        { name: '深灰', value: '#283618', type: 'neutral' },
      ],
      [
        { name: '主色', value: '#386641', type: 'primary' },
        { name: '辅色', value: '#BC6C25', type: 'secondary' },
        { name: '浅灰', value: '#F2E8CF', type: 'neutral' },
        { name: '中灰', value: '#6A994E', type: 'neutral' },
        { name: '深灰', value: '#344E41', type: 'neutral' },
      ],
    ],
    fontPairs: [
      { heading: 'Lora', body: 'Merriweather', fallback: 'serif' },
      { heading: 'Abril Fatface', body: 'Source Serif Pro', fallback: 'serif' },
    ],
  },
  {
    id: 'tech',
    label: '科技',
    colorPalettes: [
      [
        { name: '主色', value: '#00B4D8', type: 'primary' },
        { name: '辅色', value: '#7209B7', type: 'secondary' },
        { name: '浅灰', value: '#F8F9FA', type: 'neutral' },
        { name: '中灰', value: '#495057', type: 'neutral' },
        { name: '深灰', value: '#212529', type: 'neutral' },
      ],
      [
        { name: '主色', value: '#00FF87', type: 'primary' },
        { name: '辅色', value: '#FF0080', type: 'secondary' },
        { name: '浅灰', value: '#E5E5E5', type: 'neutral' },
        { name: '中灰', value: '#333333', type: 'neutral' },
        { name: '深灰', value: '#0A0A0A', type: 'neutral' },
      ],
    ],
    fontPairs: [
      { heading: 'Orbitron', body: 'Rajdhani', fallback: 'sans-serif' },
      { heading: 'Space Grotesk', body: 'JetBrains Mono', fallback: 'monospace' },
    ],
  },
];

const typographyPresets: TypographyLevel[] = [
  { tag: 'h1', fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
  { tag: 'h2', fontSize: '2rem', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' },
  { tag: 'h3', fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' },
  { tag: 'h4', fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '0' },
  { tag: 'h5', fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.4, letterSpacing: '0' },
  { tag: 'h6', fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.5, letterSpacing: '0' },
];

const alternativeFonts: Record<string, string[]> = {
  heading: ['Inter', 'Poppins', 'Roboto', 'Montserrat', 'Open Sans', 'Playfair Display', 'Georgia', 'Helvetica Neue'],
  body: ['Inter', 'Roboto', 'Open Sans', 'Source Sans Pro', 'Lato', 'Georgia', 'Times New Roman', 'Merriweather'],
};

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generateId = (): string => Math.random().toString(36).substring(2, 9);

export const generateSpec = (_projectName: string, _description: string, styles: string[]): DesignSpec[] => {
  const selectedPresets = styles.length > 0
    ? stylePresets.filter(p => styles.includes(p.id))
    : [getRandomItem(stylePresets)];

  const colors: DesignSpec[] = [];
  const fonts: DesignSpec[] = [];
  const typography: DesignSpec[] = [];

  selectedPresets.forEach((preset, index) => {
    const palette = getRandomItem(preset.colorPalettes);
    const fontPair = getRandomItem(preset.fontPairs);

    colors.push({
      id: generateId(),
      type: 'colors',
      title: `${preset.label}配色${selectedPresets.length > 1 ? ` #${index + 1}` : ''}`,
      colors: palette,
    });

    fonts.push({
      id: generateId(),
      type: 'fonts',
      title: `${preset.label}字体${selectedPresets.length > 1 ? ` #${index + 1}` : ''}`,
      fonts: fontPair,
    });

    typography.push({
      id: generateId(),
      type: 'typography',
      title: `${preset.label}排版${selectedPresets.length > 1 ? ` #${index + 1}` : ''}`,
      typography: typographyPresets,
    });
  });

  return [...colors, ...fonts, ...typography];
};

export const getStylePresets = (): StylePreset[] => stylePresets;

export const getAlternativeFonts = (fontType: 'heading' | 'body'): string[] => {
  return alternativeFonts[fontType];
};

export const exportToJSON = (specs: DesignSpec[]): string => {
  const exportData = {
    exportTime: new Date().toISOString(),
    colors: specs.filter(s => s.type === 'colors').flatMap(s => s.colors || []),
    fonts: specs.filter(s => s.type === 'fonts').map(s => s.fonts),
    typography: specs.filter(s => s.type === 'typography').map(s => s.typography),
  };
  return JSON.stringify(exportData, null, 2);
};

export const exportToCSSVars = (specs: DesignSpec[]): string => {
  const lines: string[] = [':root {'];
  
  const allColors = specs.filter(s => s.type === 'colors').flatMap(s => s.colors || []);
  const colorMap = new Map<string, string>();
  
  allColors.forEach((color, index) => {
    const prefix = color.type === 'primary' ? 'primary' 
      : color.type === 'secondary' ? 'secondary' 
      : `neutral-${index % 5}`;
    const key = `--${prefix}`;
    if (!colorMap.has(key)) {
      colorMap.set(key, color.value);
      lines.push(`  ${key}: ${color.value};`);
    }
  });

  const fontSpec = specs.find(s => s.type === 'fonts');
  if (fontSpec?.fonts) {
    lines.push(`  --font-heading: '${fontSpec.fonts.heading}', ${fontSpec.fonts.fallback};`);
    lines.push(`  --font-body: '${fontSpec.fonts.body}', ${fontSpec.fonts.fallback};`);
  }

  const typeSpec = specs.find(s => s.type === 'typography');
  if (typeSpec?.typography) {
    typeSpec.typography.forEach(t => {
      lines.push(`  --font-size-${t.tag}: ${t.fontSize};`);
      lines.push(`  --font-weight-${t.tag}: ${t.fontWeight};`);
      lines.push(`  --line-height-${t.tag}: ${t.lineHeight};`);
    });
  }

  lines.push('}');
  return lines.join('\n');
};
