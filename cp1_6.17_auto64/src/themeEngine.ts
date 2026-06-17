export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface ExtractedColor {
  hex: string;
  rgb: RGB;
}

export interface ThemeAdjustments {
  hueOffset: number;
  saturation: number;
  lightness: number;
}

export interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  highlight: string;
  buttonHover: string;
}

export interface ThemeVariables {
  '--color-primary': string;
  '--color-secondary': string;
  '--color-accent': string;
  '--color-background': string;
  '--color-surface': string;
  '--color-text': string;
  '--color-text-secondary': string;
  '--color-border': string;
  '--color-highlight': string;
  '--color-button-hover': string;
}

export const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 128, g: 128, b: 128 };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

export const rgbToHsl = (rgb: RGB): HSL => {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

export const hslToRgb = (hsl: HSL): RGB => {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
};

export const adjustColor = (hex: string, adjustments: ThemeAdjustments): string => {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  
  hsl.h = (hsl.h + adjustments.hueOffset) % 360;
  hsl.s = Math.max(0, Math.min(100, hsl.s * (adjustments.saturation / 100)));
  hsl.l = Math.max(0, Math.min(100, hsl.l * (adjustments.lightness / 100)));
  
  const newRgb = hslToRgb(hsl);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
};

export const adjustBrightness = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  const factor = 1 + percent / 100;
  return rgbToHex(
    Math.max(0, Math.min(255, rgb.r * factor)),
    Math.max(0, Math.min(255, rgb.g * factor)),
    Math.max(0, Math.min(255, rgb.b * factor))
  );
};

export const getLuminance = (rgb: RGB): number => {
  const a = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

export const getContrastRatio = (color1: string, color2: string): number => {
  const lum1 = getLuminance(hexToRgb(color1));
  const lum2 = getLuminance(hexToRgb(color2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
};

export const isLightColor = (hex: string): boolean => {
  const rgb = hexToRgb(hex);
  const luminance = getLuminance(rgb);
  return luminance > 0.5;
};

export const generateTheme = (
  colors: ExtractedColor[],
  adjustments: ThemeAdjustments = { hueOffset: 0, saturation: 100, lightness: 100 }
): Theme => {
  const adjustedColors = colors.map(c => adjustColor(c.hex, adjustments));
  
  const primary = adjustedColors[0];
  const secondary = adjustedColors[1];
  const accent = adjustedColors[2];
  
  const isLight = isLightColor(primary);
  const background = isLight ? '#F9F9F9' : '#1A1A1A';
  const surface = isLight ? '#FFFFFF' : '#2D2D2D';
  const text = isLight ? '#1A1A1A' : '#F0F0F0';
  const textSecondary = isLight ? '#666666' : '#A0A0A0';
  const border = isLight ? '#E0E0E0' : '#404040';
  const highlight = adjustedColors[3];
  const buttonHover = adjustBrightness(primary, 15);

  return {
    primary,
    secondary,
    accent,
    background,
    surface,
    text,
    textSecondary,
    border,
    highlight,
    buttonHover
  };
};

export const themeToVariables = (theme: Theme): ThemeVariables => {
  return {
    '--color-primary': theme.primary,
    '--color-secondary': theme.secondary,
    '--color-accent': theme.accent,
    '--color-background': theme.background,
    '--color-surface': theme.surface,
    '--color-text': theme.text,
    '--color-text-secondary': theme.textSecondary,
    '--color-border': theme.border,
    '--color-highlight': theme.highlight,
    '--color-button-hover': theme.buttonHover
  };
};

export const applyThemeToDocument = (theme: Theme): void => {
  const variables = themeToVariables(theme);
  const root = document.documentElement;
  
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
};

export const generateThemeFromColor = (
  baseColor: string,
  adjustments: ThemeAdjustments = { hueOffset: 0, saturation: 100, lightness: 100 }
): Theme => {
  const rgb = hexToRgb(baseColor);
  const hsl = rgbToHsl(rgb);
  
  const color1 = hslToRgb({ h: (hsl.h + 30) % 360, s: hsl.s, l: hsl.l });
  const color2 = hslToRgb({ h: (hsl.h + 180) % 360, s: hsl.s, l: hsl.l });
  const color3 = hslToRgb({ h: hsl.h, s: Math.min(100, hsl.s + 20), l: Math.min(100, hsl.l + 20) });
  const color4 = hslToRgb({ h: hsl.h, s: Math.max(0, hsl.s - 20), l: Math.max(0, hsl.l - 20) });
  
  const colors: ExtractedColor[] = [
    { hex: baseColor, rgb },
    { hex: rgbToHex(color1.r, color1.g, color1.b), rgb: color1 },
    { hex: rgbToHex(color2.r, color2.g, color2.b), rgb: color2 },
    { hex: rgbToHex(color3.r, color3.g, color3.b), rgb: color3 },
    { hex: rgbToHex(color4.r, color4.g, color4.b), rgb: color4 }
  ];
  
  return generateTheme(colors, adjustments);
};
