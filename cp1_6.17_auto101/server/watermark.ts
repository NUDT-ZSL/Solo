import sharp from 'sharp';

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  angle: number;
}

const DEFAULT_OPTIONS: WatermarkOptions = {
  text: '版权归作者所有',
  fontSize: 18,
  color: '#999999',
  opacity: 0.33,
  angle: 30,
};

export async function applyVisibleWatermark(
  imageBuffer: Buffer,
  options: Partial<WatermarkOptions> = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  const svgWatermark = generateWatermarkSvg(width, height, opts);
  const watermarkBuffer = await sharp(Buffer.from(svgWatermark))
    .resize(width, height)
    .png()
    .toBuffer();

  return sharp(imageBuffer)
    .composite([{
      input: watermarkBuffer,
      blend: 'over',
    }])
    .png()
    .toBuffer();
}

function generateWatermarkSvg(
  width: number,
  height: number,
  opts: WatermarkOptions
): string {
  const spacingX = opts.fontSize * 8;
  const spacingY = opts.fontSize * 5;
  const cols = Math.ceil(width / spacingX) + 3;
  const rows = Math.ceil(height / spacingY) + 3;
  const fontFamily = "'Helvetica', 'Arial', 'Microsoft YaHei', sans-serif";

  let textElements = '';
  for (let row = -2; row < rows; row++) {
    for (let col = -2; col < cols; col++) {
      const x = col * spacingX + spacingX / 2;
      const y = row * spacingY + spacingY / 2;
      textElements += `<text x="${x}" y="${y}" fill="${opts.color}" fill-opacity="${opts.opacity}" font-size="${opts.fontSize}" font-style="italic" font-family="${fontFamily}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${opts.angle}, ${x}, ${y})">${escapeXml(opts.text)}</text>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${textElements}</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function applyInvisibleWatermark(
  imageBuffer: Buffer,
  watermarkData: string
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = data;
  const hash = simpleHash(watermarkData);
  let bitIndex = 0;

  for (let i = 0; i < pixels.length && bitIndex < 64; i += 4) {
    const bit = (hash >> (bitIndex % 32)) & 1;
    if (pixels[i] % 2 !== bit) {
      pixels[i] = pixels[i] > 0 ? pixels[i] - 1 : pixels[i] + 1;
    }
    bitIndex++;
  }

  return sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toBuffer();
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export async function generateThumbnail(
  imageBuffer: Buffer,
  maxSize: number = 300
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
}

export async function generatePreview(
  imageBuffer: Buffer,
  maxSize: number = 800
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
}
