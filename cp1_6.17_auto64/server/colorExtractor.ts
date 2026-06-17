import sharp from 'sharp';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ExtractedColor {
  hex: string;
  rgb: RGB;
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const getDistance = (a: RGB, b: RGB): number => {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

const kMeans = (pixels: RGB[], k: number, maxIterations: number = 10): RGB[] => {
  if (pixels.length === 0) return Array(k).fill({ r: 128, g: 128, b: 128 });
  
  let centroids: RGB[] = [];
  const shuffled = [...pixels].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(k, shuffled.length); i++) {
    centroids.push({ ...shuffled[i] });
  }
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters: RGB[][] = Array(k).fill(null).map(() => []);
    
    for (const pixel of pixels) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let i = 0; i < centroids.length; i++) {
        const dist = getDistance(pixel, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = i;
        }
      }
      clusters[bestCluster].push(pixel);
    }
    
    let converged = true;
    for (let i = 0; i < centroids.length; i++) {
      if (clusters[i].length === 0) continue;
      
      const sum = clusters[i].reduce((acc, p) => ({
        r: acc.r + p.r,
        g: acc.g + p.g,
        b: acc.b + p.b
      }), { r: 0, g: 0, b: 0 });
      
      const newCentroid = {
        r: sum.r / clusters[i].length,
        g: sum.g / clusters[i].length,
        b: sum.b / clusters[i].length
      };
      
      if (getDistance(newCentroid, centroids[i]) > 1) {
        converged = false;
      }
      centroids[i] = newCentroid;
    }
    
    if (converged) break;
  }
  
  return centroids.map(c => ({
    r: Math.round(c.r),
    g: Math.round(c.g),
    b: Math.round(c.b)
  }));
};

export const extractColorsFromBuffer = async (
  buffer: Buffer,
  numColors: number = 5,
  sampleSize: number = 10000
): Promise<ExtractedColor[]> => {
  const { data, info } = await sharp(buffer)
    .resize(100, 100, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels: RGB[] = [];
  const step = Math.max(1, Math.floor((info.width * info.height) / sampleSize));
  
  for (let i = 0; i < data.length; i += 3 * step) {
    pixels.push({
      r: data[i],
      g: data[i + 1],
      b: data[i + 2]
    });
  }
  
  const centroids = kMeans(pixels, numColors);
  
  const colorsWithCounts = centroids.map(centroid => {
    const count = pixels.filter(p => getDistance(p, centroid) < 30).length;
    return { centroid, count };
  });
  
  colorsWithCounts.sort((a, b) => b.count - a.count);
  
  return colorsWithCounts.map(({ centroid }) => ({
    hex: rgbToHex(centroid.r, centroid.g, centroid.b),
    rgb: centroid
  }));
};

export const extractColorsFromHexArray = (colors: string[]): ExtractedColor[] => {
  return colors.map(hex => ({
    hex: hex.startsWith('#') ? hex : `#${hex}`,
    rgb: hexToRgb(hex)
  }));
};
