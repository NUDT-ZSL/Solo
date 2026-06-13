export interface FontItem {
  name: string;
  type: 'serif' | 'sans-serif' | 'monospace';
  googleFontName?: string;
  weights: number[];
  charset: string;
}

export const fontList: FontItem[] = [
  {
    name: 'Inter',
    type: 'sans-serif',
    googleFontName: 'Inter',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    charset: 'Latin',
  },
  {
    name: 'Roboto',
    type: 'sans-serif',
    googleFontName: 'Roboto',
    weights: [100, 300, 400, 500, 700, 900],
    charset: 'Latin',
  },
  {
    name: 'Noto Sans SC',
    type: 'sans-serif',
    googleFontName: 'Noto+Sans+SC',
    weights: [100, 300, 400, 500, 700, 900],
    charset: 'Latin / CJK',
  },
  {
    name: 'Source Han Serif SC',
    type: 'serif',
    googleFontName: 'Noto+Serif+SC',
    weights: [200, 300, 400, 500, 600, 700, 900],
    charset: 'Latin / CJK',
  },
  {
    name: 'Open Sans',
    type: 'sans-serif',
    googleFontName: 'Open+Sans',
    weights: [300, 400, 500, 600, 700, 800],
    charset: 'Latin',
  },
  {
    name: 'Lato',
    type: 'sans-serif',
    googleFontName: 'Lato',
    weights: [100, 300, 400, 700, 900],
    charset: 'Latin',
  },
  {
    name: 'Montserrat',
    type: 'sans-serif',
    googleFontName: 'Montserrat',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    charset: 'Latin',
  },
  {
    name: 'Playfair Display',
    type: 'serif',
    googleFontName: 'Playfair+Display',
    weights: [400, 500, 600, 700, 800, 900],
    charset: 'Latin',
  },
  {
    name: 'Merriweather',
    type: 'serif',
    googleFontName: 'Merriweather',
    weights: [300, 400, 700, 900],
    charset: 'Latin',
  },
  {
    name: 'Fira Code',
    type: 'monospace',
    googleFontName: 'Fira+Code',
    weights: [300, 400, 500, 600, 700],
    charset: 'Latin',
  },
  {
    name: 'JetBrains Mono',
    type: 'monospace',
    googleFontName: 'JetBrains+Mono',
    weights: [100, 200, 300, 400, 500, 600, 700, 800],
    charset: 'Latin',
  },
  {
    name: 'Noto Serif SC',
    type: 'serif',
    googleFontName: 'Noto+Serif+SC',
    weights: [200, 300, 400, 500, 600, 700, 900],
    charset: 'Latin / CJK',
  },
  {
    name: 'LXGW WenKai',
    type: 'serif',
    googleFontName: 'LXGW+WenKai',
    weights: [300, 400, 700],
    charset: 'Latin / CJK',
  },
  {
    name: 'Georgia',
    type: 'serif',
    weights: [400, 700],
    charset: 'Latin',
  },
  {
    name: 'Times New Roman',
    type: 'serif',
    weights: [400, 700],
    charset: 'Latin',
  },
  {
    name: 'Courier New',
    type: 'monospace',
    weights: [400, 700],
    charset: 'Latin',
  },
  {
    name: 'Arial',
    type: 'sans-serif',
    weights: [400, 700],
    charset: 'Latin',
  },
  {
    name: 'Verdana',
    type: 'sans-serif',
    weights: [400, 700],
    charset: 'Latin',
  },
  {
    name: 'SimSun',
    type: 'serif',
    weights: [400, 700],
    charset: 'Latin / CJK',
  },
  {
    name: 'Microsoft YaHei',
    type: 'sans-serif',
    weights: [400, 700],
    charset: 'Latin / CJK',
  },
];

const loadedFonts = new Set<string>();

export function loadGoogleFont(fontItem: FontItem): Promise<void> {
  if (!fontItem.googleFontName) return Promise.resolve();
  if (loadedFonts.has(fontItem.googleFontName)) return Promise.resolve();

  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontItem.googleFontName}:wght@${fontItem.weights.join(';')}&display=swap`;
    link.onload = () => {
      loadedFonts.add(fontItem.googleFontName!);
      resolve();
    };
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

export const sampleTexts = {
  english:
    'The fog comes on little cat feet. It sits looking over harbor and city on silent haunches and then moves on. A dream within a dream, all that we see or seem is but a whisper.',
  chinese:
    '月光如流水一般，静静地泻在这一片叶子和花上。薄薄的青雾浮起在荷塘里，叶子和花仿佛在牛乳中洗过一样，又像笼着轻纱的梦。',
  symbols: '0123456789 !@#$%^&*() +=-[]{}|;:\'",.<>?/~`\\',
};
