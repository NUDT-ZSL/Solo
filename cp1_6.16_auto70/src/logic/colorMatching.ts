function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

export function hslToRgb(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
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
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function getComplementaryColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const newH = (h + 180) % 360;
  const [nr, ng, nb] = hslToRgb(newH, s, l);
  return rgbToHex(nr, ng, nb);
}

export function getAnalogousColors(hex: string): string[] {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return [
    rgbToHex(...hslToRgb((h - 30 + 360) % 360, s, l)),
    rgbToHex(...hslToRgb((h + 30) % 360, s, l)),
  ];
}

export function getTriadicColors(hex: string): string[] {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return [
    rgbToHex(...hslToRgb((h + 120) % 360, s, l)),
    rgbToHex(...hslToRgb((h + 240) % 360, s, l)),
  ];
}

export function calculateColorMatch(colors: string[]): number {
  if (colors.length < 2) return 1;

  let totalScore = 0;
  let pairCount = 0;

  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const [r1, g1, b1] = hexToRgb(colors[i]);
      const [r2, g2, b2] = hexToRgb(colors[j]);
      const [h1, s1, l1] = rgbToHsl(r1, g1, b1);
      const [h2, s2, l2] = rgbToHsl(r2, g2, b2);

      const hueDiff = Math.abs(h1 - h2);
      const normalizedHueDiff = Math.min(hueDiff, 360 - hueDiff) / 180;

      let hueScore: number;
      if (normalizedHueDiff < 0.1) {
        hueScore = 0.7;
      } else if (normalizedHueDiff < 0.3) {
        hueScore = 0.9;
      } else if (normalizedHueDiff < 0.6) {
        hueScore = 0.6;
      } else if (normalizedHueDiff < 0.8) {
        hueScore = 0.95;
      } else {
        hueScore = 0.75;
      }

      const satDiff = Math.abs(s1 - s2) / 100;
      const lightDiff = Math.abs(l1 - l2) / 100;
      const harmonyScore = 1 - (satDiff + lightDiff) * 0.3;

      const pairScore = hueScore * 0.7 + harmonyScore * 0.3;
      totalScore += pairScore;
      pairCount++;
    }
  }

  return totalScore / pairCount;
}

export function recommendColorPalette(
  baseColor: string,
  count: number = 3
): string[] {
  const [r, g, b] = hexToRgb(baseColor);
  const [h, s, l] = rgbToHsl(r, g, b);
  const palette: string[] = [baseColor];

  if (count > 1) {
    palette.push(getComplementaryColor(baseColor));
  }
  if (count > 2) {
    const analogous = getAnalogousColors(baseColor);
    palette.push(analogous[0]);
  }
  if (count > 3) {
    const analogous = getAnalogousColors(baseColor);
    palette.push(analogous[1]);
  }
  if (count > 4) {
    const triadic = getTriadicColors(baseColor);
    palette.push(triadic[0]);
  }

  for (let i = palette.length; i < count; i++) {
    const offset = (i * 45) % 360;
    const newL = Math.max(20, Math.min(80, l + (i % 2 === 0 ? 15 : -15)));
    palette.push(rgbToHex(...hslToRgb((h + offset) % 360, s, newL)));
  }

  return palette.slice(0, count);
}

export function getColorName(hex: string): string {
  const colorMap: Array<{ name: string; hex: string }> = [
    { name: '红色', hex: '#E74C3C' },
    { name: '橙色', hex: '#E67E22' },
    { name: '黄色', hex: '#F1C40F' },
    { name: '绿色', hex: '#2ECC71' },
    { name: '青色', hex: '#1ABC9C' },
    { name: '蓝色', hex: '#3498DB' },
    { name: '紫色', hex: '#9B59B6' },
    { name: '粉色', hex: '#E91E63' },
    { name: '白色', hex: '#FFFFFF' },
    { name: '黑色', hex: '#2C3E50' },
    { name: '灰色', hex: '#95A5A6' },
    { name: '米色', hex: '#F5F0E1' },
    { name: '棕色', hex: '#8B4513' },
    { name: '卡其', hex: '#C3B091' },
    { name: '藏蓝', hex: '#2C3E50' },
    { name: '军绿', hex: '#556B2F' },
  ];

  const [r1, g1, b1] = hexToRgb(hex);
  let minDistance = Infinity;
  let closestName = '未知';

  for (const { name, hex: cHex } of colorMap) {
    const [r2, g2, b2] = hexToRgb(cHex);
    const distance = Math.sqrt(
      Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestName = name;
    }
  }

  return closestName;
}

export function detectDominantColor(_imageData: ImageData): string {
  const colors = ['#E74C3C', '#E67E22', '#3498DB', '#2ECC71', '#F5F0E1', '#2C3E50'];
  return colors[Math.floor(Math.random() * colors.length)];
}
