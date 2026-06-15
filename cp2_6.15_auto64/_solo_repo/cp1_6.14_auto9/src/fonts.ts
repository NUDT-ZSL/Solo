import WebFont from 'webfontloader';

export interface FontConfig {
  name: string;
  family: string;
  category: 'web-safe' | 'google';
  weights: number[];
}

export interface FontPair {
  title: FontConfig;
  body: FontConfig;
  id: string;
}

export const webSafeFonts: FontConfig[] = [
  { name: 'Arial', family: 'Arial, sans-serif', category: 'web-safe', weights: [400, 700] },
  { name: 'Georgia', family: 'Georgia, serif', category: 'web-safe', weights: [400, 700] },
  { name: 'Times New Roman', family: '"Times New Roman", serif', category: 'web-safe', weights: [400, 700] },
  { name: 'Courier New', family: '"Courier New", monospace', category: 'web-safe', weights: [400, 700] },
  { name: 'Verdana', family: 'Verdana, sans-serif', category: 'web-safe', weights: [400, 700] },
  { name: 'Trebuchet MS', family: '"Trebuchet MS", sans-serif', category: 'web-safe', weights: [400, 700] },
  { name: 'Impact', family: 'Impact, sans-serif', category: 'web-safe', weights: [400] },
  { name: 'Comic Sans MS', family: '"Comic Sans MS", cursive', category: 'web-safe', weights: [400, 700] },
  { name: 'Lucida Console', family: '"Lucida Console", monospace', category: 'web-safe', weights: [400] },
  { name: 'Palatino Linotype', family: '"Palatino Linotype", "Book Antiqua", Palatino, serif', category: 'web-safe', weights: [400, 700] },
  { name: 'Segoe UI', family: '"Segoe UI", sans-serif', category: 'web-safe', weights: [400, 700] },
  { name: 'Tahoma', family: 'Tahoma, sans-serif', category: 'web-safe', weights: [400, 700] },
  { name: 'Century Gothic', family: '"Century Gothic", sans-serif', category: 'web-safe', weights: [400, 700] },
  { name: 'Garamond', family: 'Garamond, serif', category: 'web-safe', weights: [400, 700] },
  { name: 'Book Antiqua', family: '"Book Antiqua", Palatino, serif', category: 'web-safe', weights: [400, 700] },
];

export const googleFonts: FontConfig[] = [
  { name: 'Noto Sans SC', family: '"Noto Sans SC", sans-serif', category: 'google', weights: [300, 400, 500, 700] },
  { name: 'Noto Serif SC', family: '"Noto Serif SC", serif', category: 'google', weights: [400, 700] },
  { name: 'ZCOOL XiaoWei', family: '"ZCOOL XiaoWei", serif', category: 'google', weights: [400] },
  { name: 'ZCOOL QingKe HuangYou', family: '"ZCOOL QingKe HuangYou", sans-serif', category: 'google', weights: [400] },
  { name: 'Ma Shan Zheng', family: '"Ma Shan Zheng", cursive', category: 'google', weights: [400] },
  { name: 'Liu Jian Mao Cao', family: '"Liu Jian Mao Cao", cursive', category: 'google', weights: [400] },
  { name: 'Long Cang', family: '"Long Cang", cursive', category: 'google', weights: [400] },
  { name: 'Playfair Display', family: '"Playfair Display", serif', category: 'google', weights: [400, 700, 900] },
  { name: 'Lora', family: '"Lora", serif', category: 'google', weights: [400, 700] },
  { name: 'Merriweather', family: '"Merriweather", serif', category: 'google', weights: [300, 400, 700] },
  { name: 'Fira Code', family: '"Fira Code", monospace', category: 'google', weights: [400, 700] },
  { name: 'Source Sans 3', family: '"Source Sans 3", sans-serif', category: 'google', weights: [300, 400, 700] },
  { name: 'Crimson Text', family: '"Crimson Text", serif', category: 'google', weights: [400, 700] },
  { name: 'EB Garamond', family: '"EB Garamond", serif', category: 'google', weights: [400, 700] },
  { name: 'Cormorant Garamond', family: '"Cormorant Garamond", serif', category: 'google', weights: [300, 400, 700] },
];

export const allFonts: FontConfig[] = [...webSafeFonts, ...googleFonts];

export const defaultFontPairs: FontPair[] = [
  {
    id: 'pair-0',
    title: googleFonts[0],
    body: webSafeFonts[0],
  },
  {
    id: 'pair-1',
    title: googleFonts[1],
    body: webSafeFonts[10],
  },
  {
    id: 'pair-2',
    title: webSafeFonts[1],
    body: webSafeFonts[4],
  },
  {
    id: 'pair-3',
    title: googleFonts[7],
    body: webSafeFonts[9],
  },
];

export function loadGoogleFonts(fontNames: string[]): Promise<void> {
  const googleFontNames = fontNames.filter((name) =>
    googleFonts.some((f) => f.name === name)
  );

  if (googleFontNames.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve();
    }, 800);

    WebFont.load({
      google: {
        families: googleFontNames.map((name) => {
          const font = googleFonts.find((f) => f.name === name);
          return font ? `${name}:${font.weights.join(',')}` : name;
        }),
      },
      active: () => {
        clearTimeout(timeout);
        resolve();
      },
      inactive: () => {
        clearTimeout(timeout);
        resolve();
      },
    });
  });
}

export function getAllUniqueFontNames(pairs: FontPair[]): string[] {
  const names = new Set<string>();
  pairs.forEach((pair) => {
    names.add(pair.title.name);
    names.add(pair.body.name);
  });
  return Array.from(names);
}
