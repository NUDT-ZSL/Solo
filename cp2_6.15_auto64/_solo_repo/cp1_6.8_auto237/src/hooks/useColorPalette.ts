import { useState, useCallback, useEffect } from 'react';

export interface ColorHSL {
  h: number;
  s: number;
  l: number;
}

export interface PaletteColors {
  primary: ColorHSL;
  secondary: ColorHSL;
  accent: ColorHSL;
}

export type MoodTag = '宁静' | '活力' | '复古' | '科技';

export interface SavedPalette {
  id: string;
  colors: PaletteColors;
  mood: MoodTag;
  timestamp: number;
}

const MOOD_CONFIGS: Record<MoodTag, {
  secondaryOffset: number[];
  accentOffset: number[];
  sMod: number;
  lMod: number;
}> = {
  '宁静': {
    secondaryOffset: [30, -30],
    accentOffset: [60, -60],
    sMod: 0.65,
    lMod: 1.15,
  },
  '活力': {
    secondaryOffset: [180],
    accentOffset: [120, -120],
    sMod: 1.1,
    lMod: 0.95,
  },
  '复古': {
    secondaryOffset: [150, -150],
    accentOffset: [40, -40],
    sMod: 0.55,
    lMod: 1.05,
  },
  '科技': {
    secondaryOffset: [120, -120],
    accentOffset: [210, -210],
    sMod: 0.9,
    lMod: 0.9,
  },
};

function hslToString(c: ColorHSL): string {
  return `hsl(${Math.round(c.h)}, ${Math.round(c.s)}%, ${Math.round(c.l)}%)`;
}

function hslToHex(c: ColorHSL): string {
  const h = c.h / 360;
  const s = c.s / 100;
  const l = c.l / 100;
  const a2 = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const color = l - a2 * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color)))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generatePalette(hue: number, mood: MoodTag): PaletteColors {
  const config = MOOD_CONFIGS[mood];
  const baseS = 70;
  const baseL = 55;

  const offsets = [config.secondaryOffset, config.accentOffset];

  const secondaryHue = (hue + offsets[0][Math.floor(Math.random() * offsets[0].length)] + 360) % 360;
  const accentHue = (hue + offsets[1][Math.floor(Math.random() * offsets[1].length)] + 360) % 360;

  return {
    primary: { h: hue, s: baseS * config.sMod, l: baseL * config.lMod },
    secondary: { h: secondaryHue, s: (baseS * 0.85) * config.sMod, l: (baseL * 1.05) * config.lMod },
    accent: { h: accentHue, s: (baseS * 1.1) * config.sMod, l: (baseL * 0.9) * config.lMod },
  };
}

const STORAGE_KEY = 'color-mood-board-saved';

function loadSavedPalettes(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSavedPalettes(palettes: SavedPalette[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
  } catch {}
}

export function useColorPalette() {
  const [hue, setHue] = useState(210);
  const [mood, setMood] = useState<MoodTag>('宁静');
  const [palette, setPalette] = useState<PaletteColors>(() => generatePalette(210, '宁静'));
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>(loadSavedPalettes);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setPalette(generatePalette(hue, mood));
  }, [hue, mood]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  const savePalette = useCallback(() => {
    const entry: SavedPalette = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      colors: palette,
      mood,
      timestamp: Date.now(),
    };
    setSavedPalettes(prev => {
      const next = [entry, ...prev].slice(0, 20);
      persistSavedPalettes(next);
      return next;
    });
    showToast('已收藏配色方案 ✨');
  }, [palette, mood, showToast]);

  const removePalette = useCallback((id: string) => {
    setSavedPalettes(prev => {
      const next = prev.filter(p => p.id !== id);
      persistSavedPalettes(next);
      return next;
    });
  }, []);

  const copyColor = useCallback((color: ColorHSL) => {
    const hex = hslToHex(color);
    navigator.clipboard.writeText(hex).then(
      () => showToast(`已复制 ${hex}`),
      () => showToast('复制失败'),
    );
  }, [showToast]);

  const applyPalette = useCallback((p: SavedPalette) => {
    setHue(p.colors.primary.h);
    setMood(p.mood);
    setPalette(p.colors);
  }, []);

  return {
    hue,
    setHue,
    mood,
    setMood,
    palette,
    savedPalettes,
    savePalette,
    removePalette,
    copyColor,
    applyPalette,
    toast,
    hslToString,
    hslToHex,
  };
}
