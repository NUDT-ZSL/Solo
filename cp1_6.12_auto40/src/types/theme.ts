export interface Theme {
  primaryColor: string;
  borderRadius: number;
  boxShadow: number;
  fontFamily: string;
}

export type FontFamilyOption = 'sans-serif' | 'serif' | 'monospace';

export const FONT_FAMILIES: Record<FontFamilyOption, string> = {
  'sans-serif': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  'serif': 'Georgia, "Times New Roman", Times, serif',
  'monospace': '"SF Mono", Monaco, Inconsolata, "Roboto Mono", Consolas, monospace',
};

export const DEFAULT_THEME: Theme = {
  primaryColor: '#4F46E5',
  borderRadius: 8,
  boxShadow: 3,
  fontFamily: 'sans-serif',
};
