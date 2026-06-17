import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Preset, loadPresets, savePreset, deletePreset } from '../utils/presets';

export const FONT_OPTIONS = [
  'Inter',
  'Playfair Display',
  'JetBrains Mono',
  'Space Grotesk',
  'Merriweather',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Nunito',
  'Raleway',
  'Ubuntu',
  'Noto Serif SC',
  'Noto Sans SC',
];

export interface BackgroundColorOption {
  value: string;
  label: string;
}

export const BACKGROUND_COLORS: BackgroundColorOption[] = [
  { value: '#FFFFFF', label: '白色' },
  { value: '#F5F3EE', label: '米色' },
  { value: '#1E293B', label: '深色' },
  { value: '#FDE047', label: '明黄' },
  { value: '#ECFDF5', label: '薄荷绿' },
];

export const FONT_WEIGHTS = [300, 400, 500, 600, 700];

export const DEFAULT_PREVIEW_TEXT = {
  h1: '字体排印的艺术',
  h2: 'The Art of Typography in Modern Design',
  p1: '字体排印是视觉传达的核心要素之一。好的字体搭配能够引导读者的视线，传达信息的层次与情感，让阅读成为一种愉悦的体验。在网页设计中，标题字体与正文字体的搭配尤为重要——标题需要醒目而有个性，正文则需要舒适耐读，两者之间需要保持和谐的视觉节奏。Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed.',
  blockquote: '"字体不仅仅是文字的载体，更是情感与个性的表达。优秀的设计师懂得如何用字体讲故事。"',
  cite: '— Robert Bringhurst,《The Elements of Typographic Style》',
  p2: '当我们选择字体组合时，需要考虑多方面的因素：字形的对比与协调、字重的层次感、行距与段落间距的呼吸感，以及在不同背景色下的可读性。这款工具正是为了帮助您直观地探索这些变量，找到最适合您项目的字体搭配方案。',
};

export interface PreviewText {
  h1: string;
  h2: string;
  p1: string;
  blockquote: string;
  cite: string;
  p2: string;
}

interface FontState {
  headingFont: string;
  bodyFont: string;
  headingWeight: number;
  bodyWeight: number;
  headingSize: number;
  bodySize: number;
  lineHeight: number;
  headingSpacing: number;
  backgroundColor: string;
  previewText: PreviewText;
}

interface FontContextType extends FontState {
  setHeadingFont: (font: string) => void;
  setBodyFont: (font: string) => void;
  setHeadingWeight: (weight: number) => void;
  setBodyWeight: (weight: number) => void;
  setHeadingSize: (size: number) => void;
  setBodySize: (size: number) => void;
  setLineHeight: (lh: number) => void;
  setHeadingSpacing: (spacing: number) => void;
  setBackgroundColor: (color: string) => void;
  setPreviewText: (text: PreviewText) => void;
  presets: Preset[];
  saveCurrentAsPreset: () => void;
  loadPreset: (preset: Preset) => void;
  removePreset: (id: string) => void;
}

const defaultState: FontState = {
  headingFont: 'Playfair Display',
  bodyFont: 'Inter',
  headingWeight: 700,
  bodyWeight: 400,
  headingSize: 32,
  bodySize: 16,
  lineHeight: 1.6,
  headingSpacing: 24,
  backgroundColor: '#FFFFFF',
  previewText: { ...DEFAULT_PREVIEW_TEXT },
};

const FontContext = createContext<FontContextType | undefined>(undefined);

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [headingFont, setHeadingFontState] = useState(defaultState.headingFont);
  const [bodyFont, setBodyFontState] = useState(defaultState.bodyFont);
  const [headingWeight, setHeadingWeightState] = useState(defaultState.headingWeight);
  const [bodyWeight, setBodyWeightState] = useState(defaultState.bodyWeight);
  const [headingSize, setHeadingSizeState] = useState(defaultState.headingSize);
  const [bodySize, setBodySizeState] = useState(defaultState.bodySize);
  const [lineHeight, setLineHeightState] = useState(defaultState.lineHeight);
  const [headingSpacing, setHeadingSpacingState] = useState(defaultState.headingSpacing);
  const [backgroundColor, setBackgroundColorState] = useState(defaultState.backgroundColor);
  const [previewText, setPreviewTextState] = useState<PreviewText>(defaultState.previewText);
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets());

  const setHeadingFont = useCallback((font: string) => setHeadingFontState(font), []);
  const setBodyFont = useCallback((font: string) => setBodyFontState(font), []);
  const setHeadingWeight = useCallback((w: number) => setHeadingWeightState(w), []);
  const setBodyWeight = useCallback((w: number) => setBodyWeightState(w), []);
  const setHeadingSize = useCallback((s: number) => setHeadingSizeState(s), []);
  const setBodySize = useCallback((s: number) => setBodySizeState(s), []);
  const setLineHeight = useCallback((lh: number) => setLineHeightState(lh), []);
  const setHeadingSpacing = useCallback((s: number) => setHeadingSpacingState(s), []);
  const setBackgroundColor = useCallback((c: string) => setBackgroundColorState(c), []);
  const setPreviewText = useCallback((t: PreviewText) => setPreviewTextState(t), []);

  const saveCurrentAsPreset = useCallback(() => {
    const updated = savePreset({
      headingFont,
      bodyFont,
      headingWeight,
      bodyWeight,
      headingSize,
      bodySize,
      lineHeight,
      headingSpacing,
      backgroundColor,
      previewText,
    });
    setPresets(updated);
  }, [
    headingFont,
    bodyFont,
    headingWeight,
    bodyWeight,
    headingSize,
    bodySize,
    lineHeight,
    headingSpacing,
    backgroundColor,
    previewText,
  ]);

  const loadPreset = useCallback((preset: Preset) => {
    setHeadingFontState(preset.headingFont);
    setBodyFontState(preset.bodyFont);
    setHeadingWeightState(preset.headingWeight);
    setBodyWeightState(preset.bodyWeight);
    setHeadingSizeState(preset.headingSize);
    setBodySizeState(preset.bodySize);
    setLineHeightState(preset.lineHeight);
    setHeadingSpacingState(preset.headingSpacing);
    setBackgroundColorState(preset.backgroundColor);
    if (preset.previewText) {
      setPreviewTextState(preset.previewText);
    }
  }, []);

  const removePreset = useCallback((id: string) => {
    const updated = deletePreset(id);
    setPresets(updated);
  }, []);

  const value = useMemo<FontContextType>(
    () => ({
      headingFont,
      bodyFont,
      headingWeight,
      bodyWeight,
      headingSize,
      bodySize,
      lineHeight,
      headingSpacing,
      backgroundColor,
      previewText,
      setHeadingFont,
      setBodyFont,
      setHeadingWeight,
      setBodyWeight,
      setHeadingSize,
      setBodySize,
      setLineHeight,
      setHeadingSpacing,
      setBackgroundColor,
      setPreviewText,
      presets,
      saveCurrentAsPreset,
      loadPreset,
      removePreset,
    }),
    [
      headingFont,
      bodyFont,
      headingWeight,
      bodyWeight,
      headingSize,
      bodySize,
      lineHeight,
      headingSpacing,
      backgroundColor,
      previewText,
      setHeadingFont,
      setBodyFont,
      setHeadingWeight,
      setBodyWeight,
      setHeadingSize,
      setBodySize,
      setLineHeight,
      setHeadingSpacing,
      setBackgroundColor,
      setPreviewText,
      presets,
      saveCurrentAsPreset,
      loadPreset,
      removePreset,
    ]
  );

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

export function useFontContext() {
  const ctx = useContext(FontContext);
  if (!ctx) {
    throw new Error('useFontContext must be used within FontProvider');
  }
  return ctx;
}

export function getLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
