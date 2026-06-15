export interface ColorSwatch {
  name: string;
  value: string;
  type: 'primary' | 'secondary' | 'neutral';
}

export interface FontPair {
  heading: string;
  body: string;
  fallback: string;
  headingStack: string;
  bodyStack: string;
}

export interface TypographyLevel {
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
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
      { heading: 'Georgia', body: 'Times New Roman', fallback: 'serif', headingStack: "Georgia, 'Palatino Linotype', 'Book Antiqua', Palatino, serif", bodyStack: "'Times New Roman', Times, Georgia, serif" },
      { heading: 'Playfair Display', body: 'Crimson Text', fallback: 'serif', headingStack: "'Playfair Display', Georgia, 'Palatino Linotype', serif", bodyStack: "'Crimson Text', Georgia, 'Times New Roman', serif" },
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
      { heading: 'Inter', body: 'Inter', fallback: 'sans-serif', headingStack: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", bodyStack: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
      { heading: 'Poppins', body: 'Roboto', fallback: 'sans-serif', headingStack: "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Verdana, Arial, sans-serif", bodyStack: "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Verdana, Arial, sans-serif" },
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
      { heading: 'Helvetica Neue', body: 'Helvetica Neue', fallback: 'sans-serif', headingStack: "'Helvetica Neue', Helvetica, Arial, Verdana, sans-serif", bodyStack: "'Helvetica Neue', Helvetica, Arial, Verdana, sans-serif" },
      { heading: 'SF Pro Display', body: 'SF Pro Text', fallback: 'sans-serif', headingStack: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif", bodyStack: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif" },
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
      { heading: 'Cinzel', body: 'Cormorant Garamond', fallback: 'serif', headingStack: "Cinzel, Georgia, 'Palatino Linotype', 'Book Antiqua', serif", bodyStack: "'Cormorant Garamond', Georgia, 'Times New Roman', Garamond, serif" },
      { heading: 'UnifrakturMaguntia', body: 'EB Garamond', fallback: 'serif', headingStack: "'UnifrakturMaguntia', Georgia, 'Palatino Linotype', serif", bodyStack: "'EB Garamond', Garamond, Georgia, 'Times New Roman', serif" },
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
      { heading: 'Lora', body: 'Merriweather', fallback: 'serif', headingStack: "Lora, Georgia, 'Palatino Linotype', 'Book Antiqua', serif", bodyStack: "Merriweather, Georgia, 'Times New Roman', Garamond, serif" },
      { heading: 'Abril Fatface', body: 'Source Serif Pro', fallback: 'serif', headingStack: "'Abril Fatface', Georgia, 'Palatino Linotype', serif", bodyStack: "'Source Serif Pro', Georgia, 'Times New Roman', Garamond, serif" },
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
      { heading: 'Orbitron', body: 'Rajdhani', fallback: 'sans-serif', headingStack: "Orbitron, Verdana, Arial, 'Trebuchet MS', sans-serif", bodyStack: "Rajdhani, Verdana, Arial, Tahoma, sans-serif" },
      { heading: 'Space Grotesk', body: 'JetBrains Mono', fallback: 'monospace', headingStack: "'Space Grotesk', -apple-system, BlinkMacSystemFont, Verdana, Arial, sans-serif", bodyStack: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace" },
    ],
  },
];

const typographyPresets: TypographyLevel[] = [
  { tag: 'h1', fontSize: 3.052, fontWeight: 700, lineHeight: 1.125, letterSpacing: -0.025 },
  { tag: 'h2', fontSize: 2.441, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.02 },
  { tag: 'h3', fontSize: 1.953, fontWeight: 600, lineHeight: 1.25, letterSpacing: -0.015 },
  { tag: 'h4', fontSize: 1.563, fontWeight: 600, lineHeight: 1.3, letterSpacing: -0.01 },
  { tag: 'h5', fontSize: 1.25, fontWeight: 500, lineHeight: 1.4, letterSpacing: 0 },
  { tag: 'h6', fontSize: 1, fontWeight: 500, lineHeight: 1.5, letterSpacing: 0 },
];

const alternativeFonts: Record<string, string[]> = {
  heading: [
    'Georgia',
    'Helvetica Neue',
    'Verdana',
    'Trebuchet MS',
    'Palatino Linotype',
    'Garamond',
    'Inter',
    'Poppins',
    'Roboto',
    'Montserrat',
    'Open Sans',
    'Playfair Display',
  ],
  body: [
    'Georgia',
    'Times New Roman',
    'Verdana',
    'Arial',
    'Tahoma',
    'Garamond',
    'Inter',
    'Roboto',
    'Open Sans',
    'Source Sans Pro',
    'Lato',
    'Merriweather',
  ],
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
    typography: specs.filter(s => s.type === 'typography').map(s => 
      (s.typography || []).map(t => ({
        tag: t.tag,
        fontSize: t.fontSize,
        fontWeight: t.fontWeight,
        lineHeight: t.lineHeight,
        letterSpacing: t.letterSpacing,
      }))
    ),
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
      lines.push(`  --font-size-${t.tag}: ${t.fontSize}rem;`);
      lines.push(`  --font-weight-${t.tag}: ${t.fontWeight};`);
      lines.push(`  --line-height-${t.tag}: ${t.lineHeight};`);
      lines.push(`  --letter-spacing-${t.tag}: ${t.letterSpacing}em;`);
    });
  }

  lines.push('}');
  return lines.join('\n');
};
