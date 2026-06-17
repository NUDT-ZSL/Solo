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

export const BACKGROUND_COLORS = [
  '#FFFFFF',
  '#F5F3EE',
  '#1E293B',
  '#FDE047',
  '#ECFDF5',
];

export const FONT_WEIGHTS = [300, 400, 500, 600, 700];

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
      setHeadingFont,
      setBodyFont,
      setHeadingWeight,
      setBodyWeight,
      setHeadingSize,
      setBodySize,
      setLineHeight,
      setHeadingSpacing,
      setBackgroundColor,
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
      setHeadingFont,
      setBodyFont,
      setHeadingWeight,
      setBodyWeight,
      setHeadingSize,
      setBodySize,
      setLineHeight,
      setHeadingSpacing,
      setBackgroundColor,
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
